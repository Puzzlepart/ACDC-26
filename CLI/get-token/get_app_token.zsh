#!/bin/zsh

# get_app_token.zsh - Azure AD / MS Entra daemon app token helper (client credentials flow)
#
# Core Features:
#  - Loads configuration from .env (auto-creates from .env.sample if missing)
#  - Uses OAuth 2.0 client credentials grant (no user interaction)
#  - Token caching: reuses existing app_token if app_token_exp > now
#  - Persists app_token & app_token_exp back into .env
#  - Emits ONLY the access token on stdout (safe for command substitution)
#  - Debug & verbose logging (debug=1, verbose=1)
#
# Usage: token=$(./get_app_token.zsh)
# Re-run: will skip API call if cached token still valid.
#
# Required .env variables:
#  - tenant_id
#  - client_id
#  - client_secret
#  - app_scope (defaults to "https://graph.microsoft.com/.default")

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
known_keys=("tenant_id" "client_id" "client_secret" "oauth_host" "oauth_token_path" "app_scope" "debug" "verbose" "app_token" "app_token_exp")
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
: ${oauth_host:="https://login.microsoftonline.com"}
: ${oauth_token_path:="oauth2/v2.0/token"}
: ${app_scope:="https://graph.microsoft.com/.default"}

if [[ "$debug" -eq 1 ]]; then
    debug_log "debug logging enabled"
fi

if [[ "$verbose" -eq 1 ]]; then
    set -x
    print -P "%F{yellow}VERBOSE LOGGING ENABLED" >&2
fi

main() {
    debug_log "checking for required commands"
    check_command_dependency "curl"
    check_command_dependency "jq"
    
    # Validate required variables
    if [[ -z "$tenant_id" || -z "$client_id" || -z "$client_secret" ]]; then
        error_log "Missing required .env variables: tenant_id, client_id, or client_secret"
        exit 1
    fi
    
    # Cached token logic
    local now_epoch=$(date +%s)
    if [[ -n "$app_token" && -n "$app_token_exp" ]]; then
        if [[ "$app_token_exp" =~ ^[0-9]+$ ]] && [ "$app_token_exp" -gt "$now_epoch" ]; then
            debug_log "Existing token valid (exp=$app_token_exp now=$now_epoch); skipping token request"
            finish
            return
        else
            debug_log "Existing token expired (exp=$app_token_exp <= now=$now_epoch); requesting new token"
        fi
    fi
    
    get_app_token
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
    echo $app_token
    exit 0
}

persist_tokens_to_env() {
    debug_log "persisting tokens to .env"
    local temp_file=$(mktemp)
    local updated_exp=false updated_token=false
    
    while IFS= read -r line; do
        case "$line" in
            app_token_exp=*)
                echo "app_token_exp=$app_token_exp"
                updated_exp=true
                ;;
            app_token=*)
                echo "app_token=$app_token"
                updated_token=true
                ;;
            *)
                echo "$line"
                ;;
        esac
    done < .env > "$temp_file"
    
    # Append missing keys
    [ "$updated_exp" = false ] && echo "app_token_exp=$app_token_exp" >> "$temp_file"
    [ "$updated_token" = false ] && echo "app_token=$app_token" >> "$temp_file"
    
    mv "$temp_file" .env
    debug_log "persisted token & expiry to .env"
}

check_command_dependency() {
    command_name=$1
    command -v $command_name >/dev/null 2>&1 || {
        error_log "$command_name is required but not installed. Aborting."
        exit 1
    }
    debug_log "$command_name found"
}

get_app_token() {
    local token_endpoint="$oauth_host/$tenant_id/$oauth_token_path"
    debug_log "token endpoint: $token_endpoint"
    debug_log "scope: $app_scope"
    
    local response
    response=$(curl -s -X POST "$token_endpoint" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "client_id=$client_id" \
        -d "client_secret=$client_secret" \
        -d "scope=$app_scope" \
        -d "grant_type=client_credentials")
    
    debug_log "endpoint response: $response"
    
    app_token=$(echo $response | jq -r '.access_token // empty')
    if [ -z "$app_token" ]; then
        error_log "Failed to get access token. Response: $response"
        exit 1
    fi
    debug_log "got access token: *REDACTED*"
    
    # Compute expiry if provided
    local expires_in
    expires_in=$(echo $response | jq -r '.expires_in // empty')
    if [[ "$expires_in" =~ ^[0-9]+$ ]]; then
        app_token_exp=$(($(date +%s) + expires_in))
        debug_log "computed expiry epoch: $app_token_exp (in ${expires_in}s)"
    else
        app_token_exp=0
        debug_log "no expires_in in response; setting app_token_exp=0"
    fi
}

main
