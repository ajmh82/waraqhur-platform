#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== LATEST BACKUP ====="
latest_file="$(ls -1t backups/*.sql 2>/dev/null | head -n 1 || true)"

if [ -z "$latest_file" ]; then
  echo "No backup files found."
  exit 0
fi

echo "$latest_file"
ls -lh "$latest_file"
