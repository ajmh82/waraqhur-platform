#!/bin/sh
set -eu

REPORT=".ops-reports/batch-$(date +%Y%m%d-%H%M%S).txt"

{
  echo "DATE: $(date)"
  echo "BRANCH: $(git rev-parse --abbrev-ref HEAD)"
  echo "COMMIT: $(git rev-parse HEAD)"
  echo "----- STATUS (before) -----"
  git status --short
} | tee "$REPORT"

./scripts/ops/quality-gate.sh | tee -a "$REPORT"
./scripts/ops/smoke.sh "http://127.0.0.1:3000" | tee -a "$REPORT"

{
  echo "----- STATUS (after) -----"
  git status --short
  echo "REPORT: $REPORT"
} | tee -a "$REPORT"
