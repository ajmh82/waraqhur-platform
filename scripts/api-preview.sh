#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

APP_URL="http://localhost:3003"

echo "===== API HEALTH PREVIEW ====="
curl -fsS "$APP_URL/api/health" | sed -n '1,20p'
echo

echo "===== API POSTS PREVIEW ====="
curl -fsS "$APP_URL/api/posts" | sed -n '1,20p'
echo

echo "===== API CATEGORIES PREVIEW ====="
curl -fsS "$APP_URL/api/categories" | sed -n '1,20p'
echo

echo "===== API SOURCES PREVIEW ====="
curl -fsS "$APP_URL/api/sources" | sed -n '1,20p'
echo
