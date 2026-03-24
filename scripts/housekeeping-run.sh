#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== DOCTOR ====="
./doctor

echo "===== REPORT ====="
./report-now

echo "===== BACKUP ====="
./backup

echo "===== CLEAN KEEP 5 ====="
./clean 5

echo "===== ARCHIVE FILES ====="
./archive-files

echo "===== LATEST ====="
./latest
