#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== ARCHIVE REPORTS ====="

if ! ls -1 reports/*.txt >/dev/null 2>&1; then
  echo "No report files found."
  exit 0
fi

latest_report="$(ls -1t reports/*.txt | head -n 1)"
for file in reports/*.txt; do
  [ "$file" = "$latest_report" ] && continue
  target="archives/reports/$(basename "$file")"
  echo "Moving: $file -> $target"
  mv "$file" "$target"
done

echo "Latest report kept in reports/: $latest_report"
