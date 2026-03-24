#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== STATUS CHECK ====="
./scripts/status-check.sh

echo "===== PROD VERIFY ====="
./scripts/verify-prod.sh

echo "===== HEALTH CHECK ====="
./scripts/health-check.sh

echo "===== PUBLIC SMOKE ====="
./scripts/smoke-public.sh

echo "===== ADMIN GUEST SMOKE ====="
./scripts/smoke-admin-guest.sh
