#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== DOCKER STATUS ====="
docker compose -f docker-compose.dev.yml ps
