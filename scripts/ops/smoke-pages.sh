#!/usr/bin/env sh
set -eu

BASE="${1:-http://127.0.0.1:3000}"
PAGES="/ /timeline /search /media /messages /compose /login"

echo "Smoke base: $BASE"
for p in $PAGES; do
  code="$(curl -s -o /dev/null -w "%{http_code}" "$BASE$p" || true)"
  echo "$p -> $code"
done
