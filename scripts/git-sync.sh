#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== GIT FETCH ====="
git fetch --all --prune

echo "===== GIT STATUS ====="
git status --short

echo "===== LAST 10 COMMITS ====="
git log --oneline -10 --decorate
