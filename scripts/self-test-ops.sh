#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== OPS HELP ====="
./scripts/ops.sh help

echo "===== STATUS CHECK ====="
./scripts/status-check.sh

echo "===== ENV CHECK ====="
./scripts/env-check.sh

echo "===== DOCKER STATUS ====="
./scripts/docker-status.sh

echo "===== DB STATUS ====="
./scripts/db-status.sh

echo "===== HEALTH CHECK ====="
./scripts/health-check.sh

echo "===== PUBLIC SMOKE ====="
./scripts/smoke-public.sh
