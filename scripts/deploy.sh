#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  printf 'Usage: %s [user@host]\n' "$0" >&2
  exit 1
fi

REMOTE="$1"
APP_DIR="${APP_DIR:-/opt/geoport_platform}"
COMPOSE_FILES='-f docker-compose.yml -f docker-compose.prod.yml'

ssh "$REMOTE" "APP_DIR=\"$APP_DIR\" COMPOSE_FILES=\"$COMPOSE_FILES\" bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail

cd "$APP_DIR"
git pull --ff-only
docker compose $COMPOSE_FILES build
docker compose $COMPOSE_FILES down
docker compose $COMPOSE_FILES up -d

if curl -fsS --max-time 20 http://localhost/api/health >/dev/null; then
  printf 'Deployment healthy.\n'
else
  printf 'Health check failed: http://localhost/api/health\n' >&2
  printf 'Rollback hint:\n' >&2
  printf '  git log --oneline -n 2\n' >&2
  printf '  git checkout <previous_commit>\n' >&2
  printf '  docker compose %s up -d --build\n' "$COMPOSE_FILES" >&2
  exit 1
fi
REMOTE_SCRIPT
