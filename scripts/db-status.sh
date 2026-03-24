#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== DB STATUS ====="
docker compose -f docker-compose.dev.yml exec -T db pg_isready -U waraqhur -d waraqhur
