#!/usr/bin/env sh
set -eu

MSG="${1:-chore: super batch cleanup and quality pass}"

echo "== 1) Normalize client directives =="
find src -type f -name "*.tsx" | while read -r f; do
  if grep -q '"use client";' "$f"; then
    tmp="$(mktemp)"
    grep -v '^"use client";$' "$f" > "$tmp"
    { printf '"use client";\n'; cat "$tmp"; } > "$f"
    rm -f "$tmp"
  fi
done

echo "== 2) Remove unused next/image imports =="
find src -type f -name "*.tsx" | while read -r f; do
  if grep -q '^import Image from "next/image";$' "$f"; then
    if ! grep -q '<Image[[:space:]>]' "$f"; then
      sed -i '/^import Image from "next\/image";$/d' "$f"
    fi
  fi
done

echo "== 3) Guard: no compiler runtime import =="
if [ -x ./scripts/ops/guard-no-compiler-runtime.sh ]; then
  ./scripts/ops/guard-no-compiler-runtime.sh
fi

echo "== 4) Quality in container (Node 20 env) =="
docker compose -f docker-compose.dev.yml exec -T app-dev sh -lc '
  cd /app
  npm run lint
  npm run build:prod
'

echo "== 5) Commit & push if changed =="
git add -A
if git diff --cached --quiet; then
  echo "-- no changes to commit"
else
  git commit -m "$MSG"
  git push
fi

echo "== DONE =="
