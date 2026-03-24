#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== GIT STATUS ====="
git status --short

echo "===== LAST 5 COMMITS ====="
git log --oneline -5

echo "===== DOCKER STATUS ====="
docker compose -f docker-compose.dev.yml ps
