#!/usr/bin/env bash
#
# Deploy MotoTap to the server.
#
# Rsyncs the repo to ~/mototap on the server and rebuilds the mototap-web
# container. Publishing/reverse-proxying is label-driven: the host-wide
# caddy-docker-proxy (/root/caddy) picks up the container automatically,
# so no Caddy config sync is needed. See deploy/README.md.
#
# Usage:
#   deploy/deploy.sh                  # rsync + rebuild app
#   deploy/deploy.sh --dry-run        # show what rsync would change, do nothing else
#   deploy/deploy.sh -i ~/.ssh/key    # ssh/rsync/scp with the given identity file
#
set -euo pipefail
HOST="root@mototap.co.ke"
REMOTE_APP_DIR="~/mototap/"
# Repo root = parent of this script's dir.
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/"

DRY_RUN=false
IDENTITY=""
while [ $# -gt 0 ]; do
	case "$1" in
		--dry-run) DRY_RUN=true ;;
		-i|--identity)
			[ $# -ge 2 ] || { echo "$1 needs a file path" >&2; exit 2; }
			IDENTITY="$2"; shift ;;
		-i=*|--identity=*) IDENTITY="${1#*=}" ;;
		*) echo "unknown arg: $1" >&2; exit 2 ;;
	esac
	shift
done

# Build ssh/scp identity flag and rsync remote-shell command.
SSH_OPTS=()
SSH_CMD=(ssh)
if [ -n "$IDENTITY" ]; then
	[ -f "$IDENTITY" ] || { echo "identity file not found: $IDENTITY" >&2; exit 2; }
	SSH_OPTS=(-i "$IDENTITY")
	SSH_CMD=(ssh -i "$IDENTITY")
fi

RSYNC_OPTS=(-az --delete
	--exclude '.git'
	--exclude 'node_modules'
	--exclude 'dist'
	--exclude '.env')
if [ -n "$IDENTITY" ]; then
	RSYNC_OPTS+=(-e "ssh -i $IDENTITY")
fi
if $DRY_RUN; then
	RSYNC_OPTS+=(--dry-run --itemize-changes)
fi

echo ">> Pulling Repo"
git pull origin main

echo ">> rsync repo -> ${HOST}:${REMOTE_APP_DIR}"
rsync "${RSYNC_OPTS[@]}" "$REPO_DIR" "${HOST}:${REMOTE_APP_DIR}"

if $DRY_RUN; then
	echo ">> dry-run: stopping before build/reload"
	exit 0
fi

echo ">> rebuild mototap-web container on ${HOST}"
"${SSH_CMD[@]}" "$HOST" 'cd ~/mototap && docker compose up -d --build'

echo ">> verify internal serve"
"${SSH_CMD[@]}" "$HOST" 'docker exec caddy-caddy-1 wget -qO- http://mototap-web/ | grep -i "<title>" || echo "(no title matched)"'

echo ">> done. external check (run from laptop):"
echo "   curl -4 -sI https://mototap.co.ke/ | head -1"
echo "   curl -6 -sI https://mototap.co.ke/ | head -1"
