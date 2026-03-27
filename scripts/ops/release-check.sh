#!/bin/sh
set -eu

STAMP="$(date +%Y%m%d-%H%M%S)"
REPORT=".ops-reports/release-check-${STAMP}.txt"
LOG_SNAPSHOT=".ops-reports/runtime-${STAMP}.log"

mkdir -p .ops-reports

echo "===== RELEASE CHECK START =====" | tee "$REPORT"
echo "DATE: $(date)" | tee -a "$REPORT"
echo "BRANCH: $(git rev-parse --abbrev-ref HEAD)" | tee -a "$REPORT"
echo "COMMIT: $(git rev-parse HEAD)" | tee -a "$REPORT"
echo | tee -a "$REPORT"

echo "== 1) QUALITY GATE ==" | tee -a "$REPORT"
./scripts/ops/quality-gate.sh | tee -a "$REPORT"
echo | tee -a "$REPORT"

echo "== 2) RESTART SERVICE ==" | tee -a "$REPORT"
docker compose -f docker-compose.dev.yml restart app-dev | tee -a "$REPORT"
sleep 6
echo | tee -a "$REPORT"

echo "== 3) SMOKE (CONTAINER LOCAL 3000) ==" | tee -a "$REPORT"
./scripts/ops/smoke.sh "http://127.0.0.1:3000" | tee -a "$REPORT"
echo | tee -a "$REPORT"

echo "== 4) OPTIONAL SMOKE (HOST 3002) ==" | tee -a "$REPORT"
{
  echo "/ -> $(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3002/ || true)"
  echo "/timeline -> $(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3002/timeline || true)"
  echo "/api/health -> $(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3002/api/health || true)"
} | tee -a "$REPORT"
echo | tee -a "$REPORT"

echo "== 5) RUNTIME LOG AUDIT ==" | tee -a "$REPORT"
docker compose -f docker-compose.dev.yml logs --tail=500 app-dev > "$LOG_SNAPSHOT"

CRITICAL_COUNT="$(rg -n "TypeError|ReferenceError|SyntaxError|Unhandled|ECONNREFUSED|PrismaClientKnownRequestError|Failed to compile|Build failed" "$LOG_SNAPSHOT" | wc -l | tr -d ' ')"
WARN_COUNT="$(rg -n "Warning|warn|hydration" "$LOG_SNAPSHOT" | wc -l | tr -d ' ')"

echo "critical_matches=$CRITICAL_COUNT" | tee -a "$REPORT"
echo "warning_matches=$WARN_COUNT" | tee -a "$REPORT"
echo "log_snapshot=$LOG_SNAPSHOT" | tee -a "$REPORT"
echo | tee -a "$REPORT"

echo "== 6) GIT STATUS ==" | tee -a "$REPORT"
git status --short | tee -a "$REPORT"
echo | tee -a "$REPORT"

if [ "$CRITICAL_COUNT" -gt 0 ]; then
  echo "RESULT: FAIL (critical runtime/build patterns detected)" | tee -a "$REPORT"
  exit 1
fi

echo "RESULT: PASS" | tee -a "$REPORT"
echo "===== RELEASE CHECK END =====" | tee -a "$REPORT"
