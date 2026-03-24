#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== QUICK STATUS ====="
echo "Branch: $(git branch --show-current)"
echo "Commit: $(git rev-parse --short HEAD)"
echo "Dirty : $(if [ -n "$(git status --short)" ]; then echo yes; else echo no; fi)"

echo "===== CONTAINERS ====="
docker compose -f docker-compose.dev.yml ps --format json 2>/dev/null || docker compose -f docker-compose.dev.yml ps

echo "===== HEALTH ====="
curl -fsS http://localhost:3003/api/health
echo
