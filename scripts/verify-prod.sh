#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== GIT STATUS ====="
git status --short

echo "===== LAST 5 COMMITS ====="
git log --oneline -5

echo "===== PROD VERIFY ====="
docker compose -f docker-compose.dev.yml exec app-dev npm run verify:prod
