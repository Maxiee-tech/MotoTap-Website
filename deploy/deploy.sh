#!/usr/bin/env bash
#
# Deploy MotoTap to the oshwal-experiments server.
#
# Rsyncs the repo to ~/mototap on the server, rebuilds the mototap-web
# container, and (optionally) syncs + reloads the snipeit Caddy config.
# The server cannot git pull (GitHub is IPv4-only DNS), so rsync is the
# transport. See memory: mototap-deploy / deploy-second-app-playbook.
#
# Usage:
#   deploy/deploy.sh                  # rsync + rebuild app
#   deploy/deploy.sh --caddy          # also sync + validate + reload Caddyfile
#   deploy/deploy.sh --dry-run        # show what rsync would change, do nothing else
#   deploy/deploy.sh -i ~/.ssh/key    # ssh/rsync/scp with the given identity file
#
set -euo pipefail
HOST="root@mototap.co.ke"
REMOTE_APP_DIR="~/mototap/"
# Repo root = parent of this script's dir.
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/"

SYNC_CADDY=false
DRY_RUN=false
IDENTITY=""
while [ $# -gt 0 ]; do
	case "$1" in
		--caddy)   SYNC_CADDY=true ;;
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

if $SYNC_CADDY; then
	echo ">> sync snipeit Caddyfile + validate + reload"
	scp "${SSH_OPTS[@]}" "${REPO_DIR}deploy/snipeit/Caddyfile" "${HOST}:/root/snipeit/Caddyfile"
	"${SSH_CMD[@]}" "$HOST" 'cd ~/snipeit && \
		docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile && \
		docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile'
fi

echo ">> verify internal serve"
"${SSH_CMD[@]}" "$HOST" 'cd ~/snipeit && docker compose exec -T caddy wget -qO- http://mototap-web:80/ | grep -i "<title>" || echo "(no title matched)"'

echo ">> done. external check (run from laptop):"
echo "   curl -4 -sI https://mototap.co.ke/ | head -1"
echo "   curl -6 -sI https://mototap.co.ke/ | head -1"
