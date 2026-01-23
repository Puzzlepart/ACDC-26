#!/usr/bin/env pwsh
<#!
get-token.ps1 (PowerShell) - Azure AD / MS Entra interactive OAuth token helper.

Core Features:
- Loads configuration from .env (auto-creates from .env.sample if missing)
- Local HttpListener captures authorization code on redirect
- Opens system browser to authorization endpoint
- Exchanges auth code for access token (Invoke-RestMethod JSON parsing)
- Emits ONLY the access token on stdout (safe for command substitution)
- Debug & verbose logging (debug=1, verbose=1)
- Optional auto-close of browser window (auto_close_browser=1)

Advanced Features:
- Token caching: reuses existing graph_token if graph_token_exp > now
- Refresh token support: automatically refreshes expired tokens silently
- Persists graph_token, graph_token_exp & refresh_token back into .env
- PKCE support (use_pkce=1) for public client flows (suppresses client_secret)
- Auth timeout (auth_timeout_seconds) aborts if user doesn't complete flow
- Unknown .env key warnings (helps catch typos when debug=1)
- Graceful bootstrap: copies .env.sample to .env if neither exists

Assumptions / Requirements:
- PowerShell 7+ (cross-platform); .NET HttpListener available
- redirect URI must be registered in Azure AD (host:port/path)
- If using confidential client flow set client_secret; else enable use_pkce=1

Relevant .env keys (see .env.sample for full list):
  tenant_id, oauth_host, oauth_path, oauth_token_path,
  client_id, client_secret, scope,
  callback_host, callback_port, callback_path,
  debug, verbose, auto_close_browser,
  graph_token, graph_token_exp, refresh_token, auth_timeout_seconds, use_pkce

Usage:
  $token = ./get-token.ps1
  echo "Token: $token"
  # Re-run: will skip browser if cached token still valid.
#>

$ErrorActionPreference = 'Stop'

# Get script directory
$script:scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# Initialize script variables early to avoid variable access errors
$script:debug = 0
$script:verbose = 0
$script:use_pkce = 0
$script:auto_close_browser = 0
$script:listener = $null
$script:auth_timeout_seconds = 0
$script:graph_token = ''
$script:graph_token_exp = 0
$script:refresh_token = ''

function Write-DebugLog {
  param([string]$Message)
  if ($script:debug -eq 1) {
    Write-Host "DEBUG: $Message" -ForegroundColor Green
  }
}
function Write-ErrorLog {
  param([string]$Message)
  Write-Host "ERROR: $Message" -ForegroundColor Red
}

# Load .env (with .env.sample fallback)
$envFile = Join-Path $script:scriptRoot '.env'
if (-not (Test-Path $envFile)) {
  $sample = Join-Path $script:scriptRoot '.env.sample'
  if (Test-Path $sample) {
    # Auto-create .env from sample for user convenience
    try {
      Copy-Item $sample $envFile -ErrorAction Stop
      Write-Host "Created .env from .env.sample. Please edit required values then re-run." -ForegroundColor Yellow
      exit 2
    }
    catch {
      Write-DebugLog "Could not copy sample to .env: $($_.Exception.Message); using sample directly"
      $envFile = $sample
    }
  }
  else {
    Write-ErrorLog ".env file not found and no .env.sample to bootstrap. Aborting."
    exit 1
  }
}
Write-DebugLog "Loading environment variables from $(Split-Path -Leaf $envFile)"
Get-Content $envFile | Where-Object { $_ -match '^[A-Za-z_][A-Za-z0-9_]*=' } | ForEach-Object {
  $parts = $_.Split('=')
  $key = $parts[0].Trim()
  $value = ($parts[1..($parts.Length - 1)] -join '=').Trim() # allow = in value
  # Strip surrounding single or double quotes if present
  if ($value.Length -ge 2 -and ((($value.StartsWith('"') -and $value.EndsWith('"'))) -or (($value.StartsWith("'")) -and $value.EndsWith("'")))) {
    $value = $value.Substring(1, $value.Length - 2)
  }
  Set-Variable -Name $key -Value $value -Scope Script -Force
  Write-Verbose "Loaded env var: $key = $value"
}

# Warn on unknown keys (typo detection)
$knownKeys = @(
  'tenant_id', 'oauth_host', 'oauth_path', 'oauth_token_path', 'client_id', 'client_secret', 'scope',
  'callback_host', 'callback_port', 'callback_path', 'debug', 'verbose', 'auto_close_browser',
  'dryrun', 'prefix_log', 'log_events', 'log_ignored_events', 'ignore_categories', 'default_categories',
  'graph_token', 'graph_token_exp', 'refresh_token', 'auth_timeout_seconds', 'use_pkce', 'auth_token'
)
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^[A-Za-z_][A-Za-z0-9_]*=') {
    $k = ($_ -split '=')[0].Trim()
    if ($knownKeys -notcontains $k) {
      Write-DebugLog "Unknown .env key '$k' (ignored)"
    }
  }
}

# Variables already initialized above

if ($script:verbose -eq 1) { 
  $VerbosePreference = 'Continue'
  Write-Verbose 'VERBOSE LOGGING ENABLED'
  Write-Verbose "Script root: $script:scriptRoot"
  Write-Verbose "Env file: $envFile"
}

function Test-CommandDependency {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    Write-ErrorLog "$Name is required but not installed. Aborting."
    exit 1
  }
  Write-DebugLog "$Name found"
}

function Build-Endpoints {
  $script:auth_endpoint = "$script:oauth_host/$script:tenant_id/$script:oauth_path"
  $script:token_endpoint = "$script:oauth_host/$script:tenant_id/$script:oauth_token_path"
  $script:callback_endpoint = "${script:callback_host}:$script:callback_port/$script:callback_path"
  if ($script:use_pkce -eq 1) {
    # Generate PKCE code_verifier and code_challenge (S256)
    $bytes = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $codeVerifier = [Convert]::ToBase64String($bytes).TrimEnd('=') -replace '\+', '-' -replace '/', '_'
    $sha256 = [Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::ASCII.GetBytes($codeVerifier))
    $codeChallenge = [Convert]::ToBase64String($sha256).TrimEnd('=') -replace '\+', '-' -replace '/', '_'
    $script:pkce_code_verifier = $codeVerifier
    $script:pkce_code_challenge = $codeChallenge
    $script:token_query_base = "client_id=$script:client_id&grant_type=authorization_code&redirect_uri=$([uri]::EscapeDataString($script:callback_endpoint))&code_verifier=$codeVerifier"
  }
  else {
    $script:token_query_base = "client_id=$script:client_id&client_secret=$script:client_secret&grant_type=authorization_code&redirect_uri=$([uri]::EscapeDataString($script:callback_endpoint))"
  }
  Write-DebugLog "auth endpoint: $script:auth_endpoint"
  Write-DebugLog "token endpoint: $script:token_endpoint"
  Write-DebugLog "callback endpoint: $script:callback_endpoint"
  Write-DebugLog "token query base: $script:token_query_base"
}

function Start-Listener {
  Write-DebugLog "Starting HttpListener on port $script:callback_port"
  $script:listener = New-Object System.Net.HttpListener
  $prefix = "http://localhost:$script:callback_port/"
  try {
    $script:listener.Prefixes.Add($prefix)
    $script:listener.Start()
  }
  catch {
    Write-ErrorLog "Port $script:callback_port busy or listener failed: $($_.Exception.Message)"
    exit 1
  }
}

function Open-Browser {
  $scopeEncoded = if ($script:scope -match '%') { $script:scope } else { [uri]::EscapeDataString($script:scope) }
  $url = "$script:auth_endpoint?client_id=$script:client_id&response_type=code&redirect_uri=$([uri]::EscapeDataString($script:callback_endpoint))&response_mode=query&scope=$scopeEncoded"
  if ($script:use_pkce -eq 1) {
    $url += "&code_challenge=$($script:pkce_code_challenge)&code_challenge_method=S256"
    Write-DebugLog "PKCE enabled (challenge appended)"
  }
  Write-DebugLog "Opening browser to $url"
  if ($IsMacOS) {
    & open $url | Out-Null
  }
  elseif ($IsLinux) {
    if (Get-Command xdg-open -ErrorAction SilentlyContinue) { xdg-open $url | Out-Null }
    else { Write-ErrorLog "xdg-open not found; open URL manually: $url" }
  }
  elseif ($IsWindows) {
    Start-Process $url | Out-Null
  }
  else {
    Write-Host "Open manually: $url"
  }
}

function Wait-AuthCode {
  Write-DebugLog "Waiting for OAuth redirect with code..."
  if (-not $script:auth_timeout_seconds) { $script:auth_timeout_seconds = 0 }
  $asyncResult = $script:listener.BeginGetContext($null, $null)
  $waitMs = if ($script:auth_timeout_seconds -gt 0) { [int]$script:auth_timeout_seconds * 1000 } else { -1 }
  $signaled = $asyncResult.AsyncWaitHandle.WaitOne($waitMs)
  if (-not $signaled) {
    Write-ErrorLog "Timed out waiting for auth code after $script:auth_timeout_seconds seconds."
    try { $script:listener.Stop() } catch {}
    exit 1
  }
  $context = $script:listener.EndGetContext($asyncResult)
  $request = $context.Request
  $authCode = $request.QueryString['code']
  if (-not $authCode) {
    Write-ErrorLog "No code parameter received. Aborting."
    $context.Response.StatusCode = 400
    $msg = "<html><body><h1>Missing code parameter.</h1></body></html>"
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($msg)
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $context.Response.Close()
    exit 1
  }
  $successHtml = "<html><body><h1>Success, auth code retrieved. You may close this window.</h1></body></html>"
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($successHtml)
  $context.Response.StatusCode = 200
  $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $context.Response.Close()
  $script:auth_code = $authCode
  Write-DebugLog "Captured auth code *REDACTED*"
}

function Stop-Listener {
  if ($script:listener) {
    Write-DebugLog "Stopping listener"
    $script:listener.Stop(); $script:listener.Close()
  }
}

function Get-GraphToken {
  Write-DebugLog "Exchanging auth code for token at $script:token_endpoint"
  $body = "$script:token_query_base&code=$([uri]::EscapeDataString($script:auth_code))"
  Write-DebugLog "POST body (redacted code)"
  try {
    $json = Invoke-RestMethod -Method Post -Uri $script:token_endpoint -ContentType 'application/x-www-form-urlencoded' -Body $body
  }
  catch {
    Write-ErrorLog "Token request failed: $($_.Exception.Message)"; exit 1
  }
  if ($script:debug -eq 1) {
    Write-DebugLog ("Response keys: " + ($json | Get-Member -MemberType NoteProperty | Select-Object -ExpandProperty Name -ErrorAction SilentlyContinue) -join ',')
  }
  $token = $json.access_token
  if (-not $token) { Write-ErrorLog "No access_token in response."; exit 1 }
  $script:graph_token = $token
  # Capture refresh token if provided
  if ($json.refresh_token) {
    $script:refresh_token = $json.refresh_token
    Write-DebugLog "Got refresh token *REDACTED*"
  }
  # Compute expiry if provided
  $expiresIn = $json.expires_in
  if ($expiresIn -as [int]) {
    $script:graph_token_exp = ([DateTimeOffset]::UtcNow.ToUnixTimeSeconds() + [int]$expiresIn)
    Write-DebugLog "Computed expiry epoch: $script:graph_token_exp (in $expiresIn s)"
  }
  else {
    $script:graph_token_exp = 0
    Write-DebugLog "No expires_in in response; setting graph_token_exp=0"
  }
  Write-DebugLog "Got access token *REDACTED*"
}

function Refresh-GraphToken {
  Write-DebugLog "Attempting to refresh token using refresh_token"
  if (-not $script:refresh_token) {
    Write-DebugLog "No refresh_token available; cannot refresh"
    return $false
  }
  $refreshBody = if ($script:use_pkce -eq 1) {
    "client_id=$script:client_id&grant_type=refresh_token&refresh_token=$([uri]::EscapeDataString($script:refresh_token))"
  }
  else {
    "client_id=$script:client_id&client_secret=$script:client_secret&grant_type=refresh_token&refresh_token=$([uri]::EscapeDataString($script:refresh_token))"
  }
  try {
    $json = Invoke-RestMethod -Method Post -Uri $script:token_endpoint -ContentType 'application/x-www-form-urlencoded' -Body $refreshBody
  }
  catch {
    Write-DebugLog "Refresh token request failed: $($_.Exception.Message); will fall back to full auth"
    return $false
  }
  if (-not $json.access_token) {
    Write-DebugLog "No access_token in refresh response; falling back to full auth"
    return $false
  }
  $script:graph_token = $json.access_token
  if ($json.refresh_token) {
    $script:refresh_token = $json.refresh_token
    Write-DebugLog "Updated refresh token *REDACTED*"
  }
  $expiresIn = $json.expires_in
  if ($expiresIn -as [int]) {
    $script:graph_token_exp = ([DateTimeOffset]::UtcNow.ToUnixTimeSeconds() + [int]$expiresIn)
    Write-DebugLog "Refreshed token expires at epoch: $script:graph_token_exp (in $expiresIn s)"
  }
  else {
    $script:graph_token_exp = 0
  }
  Write-DebugLog "Successfully refreshed access token *REDACTED*"
  return $true
}

function Close-Browser {
  if ($script:auto_close_browser -eq 1) {
    Write-DebugLog "Attempting to close browser (best-effort)"
    if ($IsMacOS) {
      # Best-effort: close most recent Safari process
      try {
        $safariPid = (pgrep -nx 'Safari' 2>$null)
        if ($safariPid) { kill $safariPid }
      }
      catch { }
    }
  }
}

function Finish {
  Write-DebugLog "DONE"
  # Persist token, expiry & refresh token to .env (only if .env exists and is writable)
  try {
    $envPath = Join-Path $script:scriptRoot '.env'
    if (Test-Path $envPath -and -not (Test-Path $envPath -PathType Container)) {
      $content = Get-Content $envPath
      $newContent = for ($i = 0; $i -lt $content.Length; $i++) {
        $line = $content[$i]
        if ($line -match '^graph_token_exp=') { "graph_token_exp=$script:graph_token_exp" }
        elseif ($line -match '^graph_token=') { "graph_token=$script:graph_token" }
        elseif ($line -match '^refresh_token=') { "refresh_token=$script:refresh_token" }
        else { $line }
      }
      if (-not ($newContent -join "`n" | Select-String -SimpleMatch 'graph_token_exp=')) { $newContent += "graph_token_exp=$script:graph_token_exp" }
      if (-not ($newContent -join "`n" | Select-String -SimpleMatch 'graph_token=')) { $newContent += "graph_token=$script:graph_token" }
      if ($script:refresh_token -and -not ($newContent -join "`n" | Select-String -SimpleMatch 'refresh_token=')) { $newContent += "refresh_token=$script:refresh_token" }
      Set-Content -Path $envPath -Value $newContent -Encoding UTF8
      Write-DebugLog "Persisted token, expiry & refresh token to .env"
    }
    else {
      Write-DebugLog ".env not present; skipping persistence (using sample or transient env)"
    }
  }
  catch {
    Write-ErrorLog "Failed to persist tokens to .env: $($_.Exception.Message)"
  }
  # Output ONLY the token
  Write-Output $script:graph_token
}

function Main {
  if (Get-Command jq -ErrorAction SilentlyContinue) { Write-DebugLog 'jq present (optional)' }

  # Cached token logic
  $nowEpoch = [int][double]::Parse(([DateTimeOffset]::UtcNow.ToUnixTimeSeconds()))
  if ($script:graph_token -and $script:graph_token_exp) {
    if ($script:graph_token_exp -as [double]) { $exp = [double]$script:graph_token_exp } else { $exp = 0 }
    if ($exp -gt $nowEpoch) {
      Write-DebugLog "Existing token valid (exp=$exp now=$nowEpoch); skipping auth flow"
      $script:graph_token = $script:graph_token.Trim()
      Finish
      return
    }
    else {
      Write-DebugLog "Existing token expired (exp=$script:graph_token_exp <= now=$nowEpoch); trying refresh"
      if (Refresh-GraphToken) {
        Write-DebugLog "Token refreshed successfully; skipping auth flow"
        Finish
        return
      }
      else {
        Write-DebugLog "Refresh failed; proceeding with full auth flow"
      }
    }
  }
  elseif ($script:graph_token) {
    Write-DebugLog "graph_token present but no graph_token_exp; trying refresh first"
    if (Refresh-GraphToken) {
      Write-DebugLog "Token refreshed successfully; skipping auth flow"
      Finish
      return
    }
    else {
      Write-DebugLog "Refresh failed; proceeding with full auth flow"
    }
  }

  Build-Endpoints
  Start-Listener
  Open-Browser
  Wait-AuthCode
  Stop-Listener
  Get-GraphToken
  Close-Browser
  Finish
}

try {
  Main
}
catch {
  Write-ErrorLog $_.Exception.Message
  Stop-Listener
  exit 1
}