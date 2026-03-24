#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

keep_count="${1:-5}"

echo "===== CREATE BACKUP ====="
./scripts/db-backup.sh

echo "===== LATEST BACKUP ====="
./scripts/db-backup-latest.sh

echo "===== PRUNE BACKUPS ====="
./scripts/db-backup-prune.sh "$keep_count"

echo "===== BACKUP LIST ====="
./scripts/db-backup-list.sh
