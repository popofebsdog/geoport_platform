#!/bin/bash
set -euo pipefail

ROOT_DIR="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
if [ ! -d "$ROOT_DIR/backend" ] || [ -L "$ROOT_DIR/backend" ]; then
    echo "Expected a project directory with a real backend directory." >&2
    exit 1
fi

paths=("$ROOT_DIR/backend/uploads" "$ROOT_DIR/data")
for path in "${paths[@]}"; do
    if [ -L "$path" ] || { [ -e "$path" ] && [ ! -d "$path" ]; }; then
        echo "Refusing non-directory or symlink: $path" >&2
        exit 1
    fi
done

for path in "${paths[@]}"; do
    if [ -d "$path" ]; then
        echo "Unchanged (write access not verified): $path"
        continue
    fi
    if [ "$(id -u)" != 0 ]; then
        echo "Run with sudo to create storage for container UID/GID 1000:1000." >&2
        exit 1
    fi
    (umask 022; mkdir -m 755 "$path")
    chown 1000:1000 "$path"
    echo "Created for container UID/GID 1000:1000, mode 755: $path"
done
