#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== FORCE RECREATE APP ====="
docker compose -f docker-compose.dev.yml up -d --force-recreate app-dev

echo "===== DOCKER STATUS ====="
docker compose -f docker-compose.dev.yml ps

echo "===== APP LOGS ====="
docker compose -f docker-compose.dev.yml logs --tail=60 app-dev
