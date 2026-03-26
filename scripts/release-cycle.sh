#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== DOCTOR ====="
./doctor

echo "===== RELEASE ====="
./release

echo "===== SNAPSHOT ====="
./snapshot

echo "===== LATEST ====="
./latest
