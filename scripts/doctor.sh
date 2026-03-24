#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== QUICK STATUS ====="
./scripts/quick-status.sh

echo "===== ENV CHECK ====="
./scripts/env-check.sh

echo "===== HEALTH CHECK ====="
./scripts/health-check.sh

echo "===== DOCKER STATUS ====="
./scripts/docker-status.sh

echo "===== DB STATUS ====="
./scripts/db-status.sh

echo "===== LATEST ARTIFACTS ====="
./scripts/latest-artifacts.sh
