#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

APP_URL="http://localhost:3003"

check_code() {
  local label="$1"
  local url="$2"
  local expected="$3"
  local actual

  actual="$(curl -s -o /dev/null -w "%{http_code}" "$url")"
  echo "$label => $actual"

  if [ "$actual" != "$expected" ]; then
    echo "Expected $expected but got $actual for $url"
    exit 1
  fi
}

echo "===== ADMIN PAGE GUEST ACCESS ====="
check_code "GET /admin" "$APP_URL/admin" "200"
check_code "GET /admin/users" "$APP_URL/admin/users" "200"
check_code "GET /admin/sources" "$APP_URL/admin/sources" "200"

echo "===== ADMIN API GUEST ACCESS ====="
check_code "GET /api/admin/audit-logs" "$APP_URL/api/admin/audit-logs" "401"
check_code "GET /api/admin/users" "$APP_URL/api/admin/users" "401"
check_code "DELETE /api/admin/users/sessions (GET probe)" "$APP_URL/api/admin/users/sessions" "401"
check_code "GET /api/admin/roles" "$APP_URL/api/admin/roles" "401"
check_code "GET /api/admin/permissions-check" "$APP_URL/api/admin/permissions-check" "401"
