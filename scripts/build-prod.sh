#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== PROD BUILD ====="
docker compose -f docker-compose.dev.yml exec app-dev npm run build:prod
