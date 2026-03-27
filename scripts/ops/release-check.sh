#!/usr/bin/env sh
set -eu

STAMP="$(date +%Y%m%d-%H%M%S)"
REPORT=".ops-reports/release-check-${STAMP}.txt"
mkdir -p .ops-reports

log() { echo "$*" | tee -a "$REPORT"; }

log "===== RELEASE CHECK START ====="
log "DATE: $(date)"
log

if command -v git >/dev/null 2>&1; then
  log "BRANCH: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
  log "COMMIT: $(git rev-parse HEAD 2>/dev/null || echo unknown)"
else
  log "BRANCH: skipped (git not found)"
  log "COMMIT: skipped (git not found)"
fi

log
log "== 1) QUALITY GATE =="
if [ -x ./scripts/ops/quality-gate.sh ]; then
  ./scripts/ops/quality-gate.sh | tee -a "$REPORT"
else
  log "quality-gate.sh not found/executable"
fi

log
log "== 2) RESTART SERVICE =="
if command -v docker >/dev/null 2>&1; then
  docker compose -f docker-compose.dev.yml restart app-dev | tee -a "$REPORT" || log "restart failed"
else
  log "skipped (docker not found)"
fi

log
log "== 3) SMOKE =="
if [ -x ./scripts/ops/smoke.sh ]; then
  ./scripts/ops/smoke.sh | tee -a "$REPORT" || log "smoke failed"
else
  if command -v curl >/dev/null 2>&1; then
    log "/ -> $(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ || true)"
    log "/timeline -> $(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/timeline || true)"
    log "/api/health -> $(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health || true)"
  else
    log "skipped (curl not found)"
  fi
fi

log
log "===== RELEASE CHECK DONE ====="
echo "Report: $REPORT"
