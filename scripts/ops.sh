#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

command_name="${1:-help}"

case "$command_name" in
  status)
    ./scripts/status-check.sh
    ;;
  lint)
    ./scripts/lint-check.sh
    ;;
  build)
    ./scripts/build-prod.sh
    ;;
  verify)
    ./scripts/verify-prod.sh
    ;;
  full-check)
    ./scripts/full-check.sh
    ;;
  logs)
    ./scripts/logs-app.sh
    ;;
  restart)
    ./scripts/restart-app.sh
    ;;
  up)
    ./scripts/up-dev.sh
    ;;
  down)
    ./scripts/down-dev.sh
    ;;
  recreate)
    ./scripts/recreate-app.sh
    ;;
  git-sync)
    ./scripts/git-sync.sh
    ;;
  prisma-generate)
    ./scripts/prisma-generate.sh
    ;;
  prisma-migrate)
    ./scripts/prisma-migrate.sh
    ;;
  prisma-seed)
    ./scripts/prisma-seed.sh
    ;;
  app-shell)
    ./scripts/app-shell.sh
    ;;
  db-shell)
    ./scripts/db-shell.sh
    ;;
  help|*)
    echo "Available commands:"
    echo "  status"
    echo "  lint"
    echo "  build"
    echo "  verify"
    echo "  full-check"
    echo "  logs"
    echo "  restart"
    echo "  up"
    echo "  down"
    echo "  recreate"
    echo "  git-sync"
    echo "  prisma-generate"
    echo "  prisma-migrate"
    echo "  prisma-seed"
    echo "  app-shell"
    echo "  db-shell"
    ;;
esac
