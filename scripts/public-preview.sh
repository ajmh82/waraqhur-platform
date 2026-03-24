#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

APP_URL="http://localhost:3003"

echo "===== HOME HTML PREVIEW ====="
curl -fsS "$APP_URL/" | sed -n '1,20p'
echo

echo "===== TIMELINE HTML PREVIEW ====="
curl -fsS "$APP_URL/timeline" | sed -n '1,20p'
echo

echo "===== LOGIN HTML PREVIEW ====="
curl -fsS "$APP_URL/login" | sed -n '1,20p'
echo
