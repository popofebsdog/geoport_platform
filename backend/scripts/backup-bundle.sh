#!/bin/bash
set -euo pipefail

if [ "${BACKUP_WRITES_QUIESCED:-}" != true ]; then
    echo 'Stop application writes first, then set BACKUP_WRITES_QUIESCED=true.' >&2
    exit 1
fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UPLOADS_ROOT="${UPLOADS_ROOT:-$SCRIPT_DIR/../uploads}"
DATA_ROOT="${DATA_ROOT:-$SCRIPT_DIR/../../data}"
if [ "${NODE_ENV:-}" = production ]; then
    BACKUP_ROOT="${BACKUP_ROOT:-/app/backups}"
else
    BACKUP_ROOT="${BACKUP_ROOT:-$SCRIPT_DIR/../../backups}"
fi
for root in "$UPLOADS_ROOT" "$DATA_ROOT"; do
    if [ ! -d "$root" ] || [ -L "$root" ] || [ -n "$(find "$root" -type l -print -quit)" ]; then
        echo 'Backup sources must be real directories without symlinks.' >&2
        exit 1
    fi
done
umask 077
mkdir -p "$BACKUP_ROOT"
work=$(mktemp -d "$BACKUP_ROOT/.geoport_bundle_$(date -u +%Y%m%d_%H%M%S).XXXXXX")
trap 'rm -rf -- "$work"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
BACKUP_ROOT="$work" bash "$SCRIPT_DIR/../database/manage.sh" backup
dumps=("$work"/*.sql.gz)
mv "${dumps[0]}" "$work/database.sql.gz"
LC_ALL=C tar -czf "$work/uploads.tar.gz" -C "$UPLOADS_ROOT" .
LC_ALL=C tar -czf "$work/data.tar.gz" -C "$DATA_ROOT" .
node "$SCRIPT_DIR/verify-backup.js" --create "$work"
node "$SCRIPT_DIR/verify-backup.js" "$work"
name="${work##*/}"
target="$BACKUP_ROOT/${name#.}"
if [ -e "$target" ]; then echo 'Backup target already exists.' >&2; exit 1; fi
mv "$work" "$target"
printf 'Complete backup bundle: %s\n' "$target"
