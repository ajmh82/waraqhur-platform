#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== START DEV STACK ====="
docker compose -f docker-compose.dev.yml up -d

echo "===== DOCKER STATUS ====="
docker compose -f docker-compose.dev.yml ps
