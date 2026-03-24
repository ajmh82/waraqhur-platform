#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

backup_file="${1:-}"

if [ -z "$backup_file" ]; then
  echo "Usage: ./scripts/db-restore.sh backups/<file>.sql"
  exit 1
fi

if [ ! -f "$backup_file" ]; then
  echo "Backup file not found: $backup_file"
  exit 1
fi

echo "===== DB RESTORE ====="
docker compose -f docker-compose.dev.yml exec -T db psql -U waraqhur -d waraqhur < "$backup_file"

echo "Restore completed from: $backup_file"
