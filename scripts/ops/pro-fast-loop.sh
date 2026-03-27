#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
cd "$ROOT_DIR"

echo "==> ROOT: $ROOT_DIR"

echo "==> [1/4] lint"
npm run lint

echo "==> [2/4] typecheck (if exists)"
if npm run | grep -q " typecheck"; then
  npm run typecheck
else
  echo "-- skip: script 'typecheck' not found"
fi

echo "==> [3/4] build:prod"
npm run build:prod

echo "==> [4/4] restart app-dev"
docker compose -f docker-compose.dev.yml restart app-dev

echo "==> DONE"
