#!/usr/bin/env bash
#
# Deploy MotoTap to the production VPS.
#
# The VPS is a Git clone of the repository. This script:
#   1. Pulls the latest main branch on the VPS
#   2. Verifies the production .env exists
#   3. Verifies required Firebase variables exist
#   4. Rebuilds/restarts the Docker containers
#   5. Verifies the containers
#   6. Verifies the production domains
#
# Usage:
#   ./deploy/deploy.sh
#   ./deploy/deploy.sh -i ~/.ssh/my-key
#

set -euo pipefail

HOST="root@mototap.co.ke"
REMOTE_APP_DIR="~/mototap"

IDENTITY=""

while [ $# -gt 0 ]; do
    case "$1" in
        -i|--identity)
            [ $# -ge 2 ] || {
                echo "ERROR: $1 requires an SSH key path."
                exit 2
            }
            IDENTITY="$2"
            shift
            ;;
        -i=*|--identity=*)
            IDENTITY="${1#*=}"
            ;;
        -h|--help)
            echo "Usage:"
            echo "  ./deploy/deploy.sh"
            echo "  ./deploy/deploy.sh -i ~/.ssh/key"
            exit 0
            ;;
        *)
            echo "ERROR: Unknown argument: $1"
            echo "Use --help for usage."
            exit 2
            ;;
    esac
    shift
done

SSH_CMD=(ssh)

if [ -n "$IDENTITY" ]; then
    if [ ! -f "$IDENTITY" ]; then
        echo "ERROR: SSH identity file not found: $IDENTITY"
        exit 2
    fi

    SSH_CMD+=( -i "$IDENTITY" )
fi

echo
echo "=========================================="
echo "        MotoTap Production Deploy"
echo "=========================================="
echo

echo ">> Connecting to production server..."
"${SSH_CMD[@]}" "$HOST" "echo '   SSH connection successful.'"

echo
echo ">> Updating MotoTap repository..."
"${SSH_CMD[@]}" "$HOST" "
    set -e
    cd $REMOTE_APP_DIR

    echo '   Current branch:'
    git branch --show-current

    echo '   Pulling latest main...'
    git pull --ff-only origin main
"

echo
echo ">> Checking production environment..."
"${SSH_CMD[@]}" "$HOST" "
    set -e
    cd $REMOTE_APP_DIR

    if [ ! -f .env ]; then
        echo 'ERROR: ~/mototap/.env does not exist.'
        echo '       Production deployment stopped.'
        exit 1
    fi

    required_vars=(
        VITE_FIREBASE_API_KEY
        VITE_FIREBASE_AUTH_DOMAIN
        VITE_FIREBASE_PROJECT_ID
        VITE_FIREBASE_STORAGE_BUCKET
        VITE_FIREBASE_MESSAGING_SENDER_ID
        VITE_FIREBASE_APP_ID
        VITE_FIREBASE_MEASUREMENT_ID
    )

    for var in \"\${required_vars[@]}\"; do
        if ! grep -qE \"^\${var}=.+\" .env; then
            echo \"ERROR: Required environment variable is missing: \${var}\"
            exit 1
        fi
    done

    echo '   Production .env: OK'
    echo '   Firebase configuration: OK'
"

echo
echo ">> Rebuilding MotoTap..."
"${SSH_CMD[@]}" "$HOST" "
    set -e
    cd $REMOTE_APP_DIR

    docker compose up -d --build --remove-orphans
"

echo
echo ">> Checking Docker containers..."
"${SSH_CMD[@]}" "$HOST" "
    set -e
    cd $REMOTE_APP_DIR

    docker compose ps
"

echo
echo ">> Checking Caddy network..."
"${SSH_CMD[@]}" "$HOST" "
    set -e

    containers=\$(docker network inspect caddy --format '{{range .Containers}}{{.Name}} {{end}}')

    echo \"   Caddy network containers:\"
    echo \"   \$containers\"

    echo \"\$containers\" | grep -q 'mototap-web' || {
        echo 'ERROR: mototap-web is not connected to the caddy network.'
        exit 1
    }
"

echo
echo ">> Checking https://mototap.co.ke ..."
if curl -fsSI --max-time 15 https://mototap.co.ke/ | grep -q "HTTP/.* 200"; then
    echo "   Apex domain: OK (HTTP 200)"
else
    echo "ERROR: https://mototap.co.ke did not return HTTP 200."
    exit 1
fi

echo
echo ">> Checking https://www.mototap.co.ke ..."
if curl -fsSI --max-time 15 https://www.mototap.co.ke/ | grep -q "HTTP/.* 301"; then
    echo "   WWW redirect: OK (HTTP 301)"
else
    echo "ERROR: www.mototap.co.ke did not return HTTP 301."
    exit 1
fi

echo
echo "=========================================="
echo "       MotoTap deployment successful!"
echo "=========================================="
echo
