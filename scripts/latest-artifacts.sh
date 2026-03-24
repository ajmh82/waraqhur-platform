#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== LATEST REPORT ====="
latest_report="$(ls -1t reports/*.txt 2>/dev/null | head -n 1 || true)"
if [ -n "$latest_report" ]; then
  echo "$latest_report"
  ls -lh "$latest_report"
else
  echo "No reports found."
fi

echo "===== LATEST BACKUP ====="
latest_backup="$(ls -1t backups/*.sql 2>/dev/null | head -n 1 || true)"
if [ -n "$latest_backup" ]; then
  echo "$latest_backup"
  ls -lh "$latest_backup"
else
  echo "No backups found."
fi
