#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== DB TABLES ====="
docker compose -f docker-compose.dev.yml exec -T db psql -U waraqhur -d waraqhur -c '\dt'
