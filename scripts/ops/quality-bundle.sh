#!/usr/bin/env sh
set -eu

echo "== quality-bundle: start =="

echo "-- 1) guard compiler-runtime"
if [ -x ./scripts/ops/guard-no-compiler-runtime.sh ]; then
  ./scripts/ops/guard-no-compiler-runtime.sh
fi

echo "-- 2) lint + build in container"
docker compose -f docker-compose.dev.yml exec -T app-dev sh -lc '
  cd /app
  npm run lint
  npm run build:prod
'

echo "-- 3) smoke pages"
if [ -x ./scripts/ops/smoke-pages.sh ]; then
  ./scripts/ops/smoke-pages.sh || true
fi

echo "== quality-bundle: done =="
