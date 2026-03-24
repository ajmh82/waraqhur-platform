#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

APP_URL="http://localhost:3003"

echo "===== HEALTH CHECK ====="
curl -fsS "$APP_URL/api/health"
echo
