#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

timestamp="$(date +%Y%m%d-%H%M%S)"
report_file="reports/system-report-${timestamp}.txt"

./scripts/system-report.sh | tee "$report_file"

echo
echo "Report saved to: $report_file"
