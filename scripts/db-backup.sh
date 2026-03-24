#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_file="backups/waraqhur-${timestamp}.sql"

echo "===== DB BACKUP ====="
docker compose -f docker-compose.dev.yml exec -T db pg_dump -U waraqhur -d waraqhur > "$backup_file"

echo "Backup created: $backup_file"
ls -lh "$backup_file"
