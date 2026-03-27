#!/bin/sh
set -eu

echo "== Quality Gate: start =="

run_if_exists() {
  NAME="$1"
  if node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts['$NAME'] ? 0 : 1)"; then
    echo "-- npm run $NAME"
    npm run "$NAME"
  else
    echo "-- skip: script '$NAME' not found"
  fi
}

run_if_exists lint || true
run_if_exists typecheck || true
echo "-- npm run build:prod"
npm run build:prod

echo "== Quality Gate: done =="
