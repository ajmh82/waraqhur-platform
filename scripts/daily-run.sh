#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== DAILY RUN ====="
./scripts/quick-status.sh
./scripts/health-check.sh
./scripts/smoke-public.sh
./scripts/latest-artifacts.sh
