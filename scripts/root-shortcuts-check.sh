#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== OPS HELP ====="
./ops help >/dev/null

echo "===== START HERE ====="
./start-here >/dev/null

echo "===== HELPME ====="
./helpme >/dev/null

echo "===== SHORTCUTS ====="
./shortcuts >/dev/null

echo "===== INVENTORY ====="
./inventory >/dev/null

echo "===== MENU LIST ====="
./menu --list >/dev/null

echo "===== QUICK ====="
./quick >/dev/null

echo "===== STATUS ====="
./status >/dev/null

echo "===== HEALTH ====="
./health >/dev/null

echo "===== LATEST ====="
./latest >/dev/null

echo "Root shortcuts check passed."
