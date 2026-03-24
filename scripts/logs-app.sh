#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== APP LOGS ====="
docker compose -f docker-compose.dev.yml logs --tail=120 app-dev
