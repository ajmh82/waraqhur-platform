#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== PRISMA GENERATE ====="
docker compose -f docker-compose.dev.yml exec app-dev npm run prisma:generate
