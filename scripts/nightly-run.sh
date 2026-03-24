#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== NIGHTLY RUN ====="
./scripts/release-check.sh
./scripts/db-backup.sh
./scripts/latest-artifacts.sh
./scripts/archive-reports.sh
./scripts/archive-backups.sh
