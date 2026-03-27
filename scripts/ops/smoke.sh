#!/bin/sh
set -eu

BASE="${1:-http://127.0.0.1:3000}"
OUT=".ops-reports/smoke-$(date +%Y%m%d-%H%M%S).txt"

echo "== Smoke: $BASE ==" | tee "$OUT"

check() {
  PATHNAME="$1"
  CODE="$(curl -s -o /dev/null -w "%{http_code}" "$BASE$PATHNAME")"
  echo "$PATHNAME -> $CODE" | tee -a "$OUT"
}

check /api/health
check /timeline
check /media
check /search
check /messages
check /compose
check /dashboard

echo "== Smoke done ==" | tee -a "$OUT"
