#!/usr/bin/env sh
set -eu

BASE_URL="${BASE_URL:-http://host.docker.internal:3003}"
LOGIN_EMAIL="${LOGIN_EMAIL:-testuser@example.com}"
LOGIN_PASSWORD="${LOGIN_PASSWORD:-Test1234!}"
COOKIE_JAR="/tmp/waraqhur-admin.cookies"

echo "[poller] starting with BASE_URL=$BASE_URL"

while true; do
  echo "[poller] logging in..."
  LOGIN_RESPONSE="$(curl -s -c "$COOKIE_JAR" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$LOGIN_EMAIL\",\"password\":\"$LOGIN_PASSWORD\"}")"

  echo "[poller] login response: $LOGIN_RESPONSE"

  echo "[poller] ingesting all sources..."
  INGEST_RESPONSE="$(curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/api/admin/sources/ingest-all")"

  echo "[poller] ingest response: $INGEST_RESPONSE"
  echo "[poller] sleeping 60s..."
  sleep 60
done
