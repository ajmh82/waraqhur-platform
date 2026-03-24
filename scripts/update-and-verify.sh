#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== GIT FETCH ====="
git fetch --all --prune

echo "===== GIT PULL ====="
git pull --ff-only

echo "===== BOOTSTRAP ====="
./scripts/bootstrap-dev.sh

echo "===== RELEASE CHECK ====="
./scripts/release-check.sh
