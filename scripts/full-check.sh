#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== STATUS CHECK ====="
./scripts/status-check.sh

echo "===== LINT CHECK ====="
./scripts/lint-check.sh

echo "===== PROD VERIFY ====="
./scripts/verify-prod.sh
