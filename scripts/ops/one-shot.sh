#!/usr/bin/env sh
set -eu

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT=".ops-reports/one-shot-${STAMP}.txt"
mkdir -p .ops-reports

run() {
  echo >> "$OUT"
  echo "===== $1 =====" | tee -a "$OUT"
  shift
  "$@" 2>&1 | tee -a "$OUT"
}

run "LINT" npm run lint
run "BUILD PROD" npm run build:prod
run "RELEASE CHECK" ./scripts/ops/release-check.sh

echo >> "$OUT"
echo "===== GIT STATUS =====" | tee -a "$OUT"
git status --short 2>&1 | tee -a "$OUT" || true

echo >> "$OUT"
echo "===== LAST COMMITS =====" | tee -a "$OUT"
git log --oneline -n 5 2>&1 | tee -a "$OUT" || true

echo
echo "DONE: $OUT"
