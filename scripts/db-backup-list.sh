#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== AVAILABLE BACKUPS ====="
if ls -1 backups/*.sql >/dev/null 2>&1; then
  ls -lh backups/*.sql | sort
else
  echo "No backup files found."
fi
