#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== STOP DEV STACK ====="
docker compose -f docker-compose.dev.yml down

echo "===== DOCKER STATUS ====="
docker compose -f docker-compose.dev.yml ps || true
