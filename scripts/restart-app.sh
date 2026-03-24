#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== RESTART APP ====="
docker compose -f docker-compose.dev.yml restart app-dev

echo "===== APP STATUS ====="
docker compose -f docker-compose.dev.yml ps
