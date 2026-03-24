#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== DB STATUS ====="
./scripts/db-status.sh

echo "===== DB TABLES ====="
./scripts/db-tables.sh

echo "===== BACKUP LIST ====="
./scripts/db-backup-list.sh

echo "===== LATEST BACKUP ====="
./scripts/db-backup-latest.sh
