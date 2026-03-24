#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== ARCHIVE BACKUPS ====="

if ! ls -1 backups/*.sql >/dev/null 2>&1; then
  echo "No backup files found."
  exit 0
fi

latest_backup="$(ls -1t backups/*.sql | head -n 1)"
for file in backups/*.sql; do
  [ "$file" = "$latest_backup" ] && continue
  target="archives/backups/$(basename "$file")"
  echo "Moving: $file -> $target"
  mv "$file" "$target"
done

echo "Latest backup kept in backups/: $latest_backup"
