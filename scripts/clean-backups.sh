#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

keep_count="${1:-5}"
exec ./scripts/db-backup-prune.sh "$keep_count"
