#!/bin/zsh

# get_token.zsh - Azure AD / MS Entra interactive OAuth token helper (zsh version)
#
# Core Features:
#  - Loads configuration from .env (auto-creates from .env.sample if missing)
#  - Local ncat listener captures authorization code on redirect
#  - Opens system browser to authorization endpoint
#  - Exchanges auth code for access token (curl + jq JSON parsing)
#  - Emits ONLY the access token on stdout (safe for command substitution)
#  - Debug & verbose logging (debug=1, verbose=1)
#  - Optional auto-close of browser window (auto_close_browser=1)
#
# Advanced Features:
#  - Token caching: reuses existing graph_token if graph_token_exp > now
#  - Refresh token support: automatically refreshes expired tokens silently
#  - Persists graph_token, graph_token_exp & refresh_token back into .env
#  - PKCE support (use_pkce=1) for public client flows (suppresses client_secret)
#  - Auth timeout (auth_timeout_seconds) aborts if user doesn't complete flow
#  - Unknown .env key warnings (helps catch typos when debug=1)
#  - Graceful bootstrap: copies .env.sample to .env if neither exists
#
# Usage: token=$(./get_token.zsh)
# Re-run: will skip browser if cached token still valid.

debug_log() {
    if [ $debug -eq 1 ]; then
        print -P "%F{green}DEBUG: $1" >&2
    fi
}
error_log() {
    print -P "%F{red}ERROR: $1" >&2
}

# Load .env with .env.sample fallback and auto-creation
if [ ! -f .env ]; then
    if [ -f .env.sample ]; then
        # Auto-create .env from sample for user convenience
        if cp .env.sample .env 2>/dev/null; then
            print -P "%F{yellow}Created .env from .env.sample. Please edit required values then re-run."
            exit 2
        else
            debug_log "Could not copy sample to .env; using sample directly"
            source .env.sample
            debug_log "loaded environment variables from .env.sample"
        fi
    else
        error_log ".env file not found and no .env.sample to bootstrap. Aborting."
        exit 1
    fi
else
    source .env
    debug_log "loaded environment variables from .env"
fi

# Validate known keys and warn about typos
known_keys=("tenant_id" "oauth_host" "oauth_path" "oauth_token_path" "client_id" "client_secret" "scope" "callback_host" "callback_port" "callback_path" "debug" "verbose" "auto_close_browser" "dryrun" "prefix_log" "log_events" "log_ignored_events" "ignore_categories" "default_categories" "graph_token" "graph_token_exp" "refresh_token" "auth_timeout_seconds" "use_pkce")
if [ "$debug" -eq 1 ]; then
    env_file=".env"
    [ ! -f .env ] && [ -f .env.sample ] && env_file=".env.sample"
    while IFS='=' read -r key value; do
        if [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] && [[ ! " ${known_keys[@]} " =~ " $key " ]]; then
            debug_log "Unknown .env key '$key' (ignored)"
        fi
    done < "$env_file"
fi

# Set defaults for optional variables
: ${debug:=0}
: ${verbose:=0}
: ${auto_close_browser:=0}
: ${auth_timeout_seconds:=0}
: ${use_pkce:=0}

if [[ "$debug" -eq 1 ]]; then
    debug_log "debug logging enabled"
fi

if [[ "$verbose" -eq 1 ]]; then
    set -x
    print -P "%F{yellow}VERBOSE LOGGING ENABLED" >&2
fi

main() {
    debug_log "checking for required commands"
    check_command_dependency "ncat"
    check_command_dependency "curl"
    check_command_dependency "jq"
    debug_log "\n"

    # Cached token logic
    local now_epoch=$(date +%s)
    if [[ -n "$graph_token" && -n "$graph_token_exp" ]]; then
        if [[ "$graph_token_exp" =~ ^[0-9]+$ ]] && [ "$graph_token_exp" -gt "$now_epoch" ]; then
            debug_log "Existing token valid (exp=$graph_token_exp now=$now_epoch); skipping auth flow"
            finish
            return
        else
            debug_log "Existing token expired (exp=$graph_token_exp <= now=$now_epoch); trying refresh"
            if refresh_graph_token; then
                debug_log "Token refreshed successfully; skipping auth flow"
                finish
                return
            else
                debug_log "Refresh failed; proceeding with full auth flow"
            fi
        fi
    elif [[ -n "$graph_token" ]]; then
        debug_log "graph_token present but no graph_token_exp; trying refresh first"
        if refresh_graph_token; then
            debug_log "Token refreshed successfully; skipping auth flow"
            finish
            return
        else
            debug_log "Refresh failed; proceeding with full auth flow"
        fi
    fi

    # auth_endpoint is the url to start the oauth flow with the tenant id and path
    # token_endpoint is the url to get the access token with the tenant id and path
    # for our purposes they're the same, except
    # it's /authorize for the auth endpoint
    # and /token for the token endpoint

    # callback_endpoint is the url to redirect to after the oauth flow is complete,
    # e.g. http://localhost:12345/callback
    # this must be registered in the app registration as a valid redirect URI

    # token_querystring is the query string to pass to the auth endpoint,
    # plus the authcode to get the access token

    auth_endpoint="$oauth_host/$tenant_id/$oauth_path"
    token_endpoint="$oauth_host/$tenant_id/$oauth_token_path"
    callback_endpoint="$callback_host:$callback_port/$callback_path"
    
    if [ "$use_pkce" -eq 1 ]; then
        # Generate PKCE code_verifier and code_challenge (S256)
        pkce_code_verifier=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-43)
        pkce_code_challenge=$(echo -n "$pkce_code_verifier" | openssl dgst -sha256 -binary | openssl base64 -A | tr -d "=+/")
        token_querystring="client_id=$client_id&grant_type=authorization_code&redirect_uri=$callback_endpoint&code_verifier=$pkce_code_verifier"
        pkce_params="&code_challenge=$pkce_code_challenge&code_challenge_method=S256"
        debug_log "PKCE enabled (challenge generated)"
    else
        token_querystring="client_id=$client_id&client_secret=$client_secret&grant_type=authorization_code&redirect_uri=$callback_endpoint"
        pkce_params=""
    fi

    debug_log "auth endpoint: $auth_endpoint"
    debug_log "token endpoint: $token_endpoint"
    debug_log "callback endpoint: $callback_endpoint"
    debug_log "token querystring: $token_querystring"

    start_ncat_server
    open_browser
    read_authcode
    kill_server
    get_graph_token
    close_browser
    finish
}

finish() {
    debug_log "DONE"
    # Persist tokens to .env (only if .env exists and is writable)
    if [ -f .env ] && [ -w .env ]; then
        persist_tokens_to_env
    else
        debug_log ".env not present or not writable; skipping persistence"
    fi
    echo $graph_token
    exit 0
}

persist_tokens_to_env() {
    debug_log "persisting tokens to .env"
    local temp_file=$(mktemp)
    local updated_exp=false updated_token=false updated_refresh=false
    
    while IFS= read -r line; do
        case "$line" in
            graph_token_exp=*)
                echo "graph_token_exp=$graph_token_exp"
                updated_exp=true
                ;;
            graph_token=*)
                echo "graph_token=$graph_token"
                updated_token=true
                ;;
            refresh_token=*)
                if [ -n "$refresh_token" ]; then
                    echo "refresh_token=$refresh_token"
                    updated_refresh=true
                else
                    echo "$line"
                fi
                ;;
            *)
                echo "$line"
                ;;
        esac
    done < .env > "$temp_file"
    
    # Append missing keys
    [ "$updated_exp" = false ] && echo "graph_token_exp=$graph_token_exp" >> "$temp_file"
    [ "$updated_token" = false ] && echo "graph_token=$graph_token" >> "$temp_file"
    [ "$updated_refresh" = false ] && [ -n "$refresh_token" ] && echo "refresh_token=$refresh_token" >> "$temp_file"
    
    mv "$temp_file" .env
    debug_log "persisted token, expiry & refresh token to .env"
}

check_command_dependency() {
    command_name=$1
    command -v $command_name >/dev/null 2>&1 || {
        error_log "$command_name is required but not installed. Aborting."
        exit 1
    }
    debug_log "$command_name found"
}

start_ncat_server() {
    debug_log "starting ncat server on port $callback_port"
    # Check if the port is already in use
    if (lsof -i4:$callback_port >/dev/null); then
        error_log "Port $callback_port is already in use. Aborting."
        error_log "Probably another instance of this script is running or a previous instance didn't close properly."
        error_log "You can do 'lsof -i4:$callback_port' and then 'kill <PID>' to free up the port,"
        error_log "or you can change the port in the .env file."
        error_log "Aborting"
        exit 1
    fi

    # Create a named pipe for the authcode
    mkfifo acpipe
    debug_log "set authorization endpoint, redirect URI, and scopes"

    # Start a just-in-time ncat server to capture the auth code
    debug_log "starting ncat listener on port $callback_port to capture auth code"
    ncat -lk -p $callback_port -c '

    # Read the first line of the request
    read request
    
    # Extract the query string from the request
    query_string=${request#*code=}
    query_string=${query_string%% *}
    
    # Extract the code from the query string
    authcode=${query_string%%&*}

    # Print the code to the named pipe
    echo $authcode > acpipe
    
    # Send a response to the client
    printf "HTTP/1.1 200 OK\r\n\r\n<html><body><h1>Success, authcode retrieved. you may close this window.</h1></body></html>\r\n"
  ' &

    # Save the PID of the ncat server so we can kill it later
    server_pid=$! # dollar exclamantion mark is the PID of the last command run in the background - neat!
    debug_log "ncat server pid: '$server_pid'"
}

open_browser() {
    local auth_url="$auth_endpoint?client_id=$client_id&response_type=code&redirect_uri=$callback_endpoint&response_mode=query&scope=$scope$pkce_params"
    debug_log "opening browser window to $auth_url"
    open "$auth_url" &
    browser_pid=$!
    debug_log "browser opened with pid: $browser_pid"
}

read_authcode() {
    # Wait for the auth code with optional timeout
    if [ "$auth_timeout_seconds" -gt 0 ]; then
        debug_log "Waiting for auth code (timeout: ${auth_timeout_seconds}s)"
        if ! timeout "$auth_timeout_seconds" sh -c 'read authcode <acpipe; echo $authcode' > /tmp/authcode_$$ 2>/dev/null; then
            error_log "Timed out waiting for auth code after $auth_timeout_seconds seconds."
            kill_server 2>/dev/null
            exit 1
        fi
        authcode=$(cat /tmp/authcode_$$ 2>/dev/null)
        rm -f /tmp/authcode_$$ 2>/dev/null
    else
        debug_log "Waiting for auth code (no timeout)"
        read authcode <acpipe
    fi
}

kill_server() {
    debug_log "killing ncat server with pid $server_pid"
    kill $server_pid
}

get_graph_token() {
    debug_log "passing authcode *REDACTED* to endpoint\n$token_endpoint"
    response=$(curl -s -X POST "$token_endpoint" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "$token_querystring&code=$authcode")
    
    debug_log "endpoint response:\n $response"
    
    graph_token=$(echo $response | jq -r '.access_token // empty')
    if [ -z "$graph_token" ]; then
        error_log "Failed to get access token. Aborting."
        exit 1
    fi
    debug_log "got access token: *REDACTED*"
    
    # Capture refresh token if provided
    refresh_token=$(echo $response | jq -r '.refresh_token // empty')
    if [ -n "$refresh_token" ]; then
        debug_log "got refresh token: *REDACTED*"
    fi
    
    # Compute expiry if provided
    expires_in=$(echo $response | jq -r '.expires_in // empty')
    if [[ "$expires_in" =~ ^[0-9]+$ ]]; then
        graph_token_exp=$(($(date +%s) + expires_in))
        debug_log "computed expiry epoch: $graph_token_exp (in ${expires_in}s)"
    else
        graph_token_exp=0
        debug_log "no expires_in in response; setting graph_token_exp=0"
    fi
    
    rm acpipe # Remove the named pipe
}

refresh_graph_token() {
    debug_log "attempting to refresh token using refresh_token"
    if [ -z "$refresh_token" ]; then
        debug_log "no refresh_token available; cannot refresh"
        return 1
    fi
    
    local refresh_body
    if [ "$use_pkce" -eq 1 ]; then
        refresh_body="client_id=$client_id&grant_type=refresh_token&refresh_token=$refresh_token"
    else
        refresh_body="client_id=$client_id&client_secret=$client_secret&grant_type=refresh_token&refresh_token=$refresh_token"
    fi
    
    local response
    response=$(curl -s -X POST "$token_endpoint" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "$refresh_body")
    
    local new_token
    new_token=$(echo $response | jq -r '.access_token // empty')
    if [ -z "$new_token" ]; then
        debug_log "refresh token request failed; will fall back to full auth"
        return 1
    fi
    
    graph_token="$new_token"
    
    # Update refresh token if provided
    local new_refresh
    new_refresh=$(echo $response | jq -r '.refresh_token // empty')
    if [ -n "$new_refresh" ]; then
        refresh_token="$new_refresh"
        debug_log "updated refresh token: *REDACTED*"
    fi
    
    # Update expiry
    local expires_in
    expires_in=$(echo $response | jq -r '.expires_in // empty')
    if [[ "$expires_in" =~ ^[0-9]+$ ]]; then
        graph_token_exp=$(($(date +%s) + expires_in))
        debug_log "refreshed token expires at epoch: $graph_token_exp (in ${expires_in}s)"
    else
        graph_token_exp=0
    fi
    
    debug_log "successfully refreshed access token: *REDACTED*"
    return 0
}

close_browser() {
    if [ $auto_close_browser -eq 1 ]; then
        debug_log "attempting to close browser window"
        # Try to close the most recently opened browser window
        # This is best-effort since browser apps spawn multiple processes
        if command -v osascript >/dev/null 2>&1; then
            # Use AppleScript to close the frontmost browser window (more reliable)
            osascript -e 'tell application "System Events" to keystroke "w" using command down' 2>/dev/null || true
            debug_log "sent close window command via AppleScript"
        else
            # Fallback: try to find and close common browsers
            for browser in "Google Chrome" "Firefox" "Safari" "Microsoft Edge"; do
                if pgrep -f "$browser" >/dev/null 2>&1; then
                    debug_log "attempting to close $browser"
                    pkill -f "$browser" 2>/dev/null || true
                    break
                fi
            done
        fi
    fi
}

main