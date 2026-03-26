#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== QUICK ====="
./quick

echo "===== VERIFY ====="
./verify

echo "===== SMOKE ====="
./smoke

echo "===== LATEST ====="
./latest
