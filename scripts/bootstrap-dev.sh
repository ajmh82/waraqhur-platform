#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== START DEV STACK ====="
./scripts/up-dev.sh

echo "===== PRISMA GENERATE ====="
./scripts/prisma-generate.sh

echo "===== PROD VERIFY ====="
./scripts/verify-prod.sh

echo "===== HEALTH CHECK ====="
./scripts/health-check.sh

echo "===== STATUS CHECK ====="
./scripts/status-check.sh
