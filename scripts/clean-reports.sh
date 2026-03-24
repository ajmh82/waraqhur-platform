#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

keep_count="${1:-5}"

if ! [[ "$keep_count" =~ ^[0-9]+$ ]]; then
  echo "Usage: ./scripts/clean-reports.sh <keep-count>"
  exit 1
fi

echo "===== CLEAN REPORTS ====="

if ! ls -1 reports/*.txt >/dev/null 2>&1; then
  echo "No report files found."
  exit 0
fi

mapfile -t files < <(ls -1t reports/*.txt)
total="${#files[@]}"

echo "Total reports: $total"
echo "Keeping latest: $keep_count"

if [ "$total" -le "$keep_count" ]; then
  echo "Nothing to delete."
  exit 0
fi

for file in "${files[@]:$keep_count}"; do
  echo "Deleting: $file"
  rm -f "$file"
done

echo "Remaining reports:"
ls -lh reports/*.txt | sort
