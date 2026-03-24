#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

APP_URL="http://localhost:3003"

echo "===== HOME ====="
curl -fsS -o /dev/null -w "%{http_code}\n" "$APP_URL/"

echo "===== TIMELINE ====="
curl -fsS -o /dev/null -w "%{http_code}\n" "$APP_URL/timeline"

echo "===== LOGIN ====="
curl -fsS -o /dev/null -w "%{http_code}\n" "$APP_URL/login"

echo "===== API HEALTH ====="
curl -fsS -o /dev/null -w "%{http_code}\n" "$APP_URL/api/health"

echo "===== API POSTS ====="
curl -fsS -o /dev/null -w "%{http_code}\n" "$APP_URL/api/posts"

echo "===== API CATEGORIES ====="
curl -fsS -o /dev/null -w "%{http_code}\n" "$APP_URL/api/categories"

echo "===== API SOURCES ====="
curl -fsS -o /dev/null -w "%{http_code}\n" "$APP_URL/api/sources"
