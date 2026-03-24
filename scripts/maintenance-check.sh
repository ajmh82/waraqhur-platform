#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== DOCKER STATUS ====="
./scripts/docker-status.sh

echo "===== APP HEALTH ====="
./scripts/health-check.sh

echo "===== PROD VERIFY ====="
./scripts/verify-prod.sh

echo "===== PUBLIC SMOKE ====="
./scripts/smoke-public.sh

echo "===== ADMIN GUEST SMOKE ====="
./scripts/smoke-admin-guest.sh

echo "===== DB TOOLS ====="
./scripts/db-tools-check.sh
