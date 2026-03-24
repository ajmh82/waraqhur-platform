#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== DOCTOR ====="
./doctor

echo "===== REPORT ====="
./report-now

echo "===== BACKUP ====="
./backup

echo "===== LATEST ====="
./latest
