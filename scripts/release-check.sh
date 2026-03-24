#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== ENV CHECK ====="
./scripts/env-check.sh

echo "===== PRE DEPLOY CHECK ====="
./scripts/pre-deploy-check.sh

echo "===== WRITE REPORT ====="
./scripts/write-report.sh
