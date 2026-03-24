#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== DATE ====="
date

echo "===== GIT STATUS ====="
git status --short

echo "===== LAST 10 COMMITS ====="
git log --oneline -10

echo "===== DOCKER STATUS ====="
docker compose -f docker-compose.dev.yml ps

echo "===== APP HEALTH ====="
curl -fsS http://localhost:3003/api/health
echo

echo "===== DB STATUS ====="
docker compose -f docker-compose.dev.yml exec -T db pg_isready -U waraqhur -d waraqhur

echo "===== LATEST BACKUP ====="
latest_file="$(ls -1t backups/*.sql 2>/dev/null | head -n 1 || true)"
if [ -n "$latest_file" ]; then
  echo "$latest_file"
else
  echo "No backup files found."
fi
