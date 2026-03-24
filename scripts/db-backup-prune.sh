#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

keep_count="${1:-5}"

if ! [[ "$keep_count" =~ ^[0-9]+$ ]]; then
  echo "Usage: ./scripts/db-backup-prune.sh <keep-count>"
  exit 1
fi

echo "===== BACKUP PRUNE ====="

if ! ls -1 backups/*.sql >/dev/null 2>&1; then
  echo "No backup files found."
  exit 0
fi

mapfile -t files < <(ls -1t backups/*.sql)
total="${#files[@]}"

echo "Total backups: $total"
echo "Keeping latest: $keep_count"

if [ "$total" -le "$keep_count" ]; then
  echo "Nothing to delete."
  exit 0
fi

for file in "${files[@]:$keep_count}"; do
  echo "Deleting: $file"
  rm -f "$file"
done

echo "Remaining backups:"
ls -lh backups/*.sql | sort
