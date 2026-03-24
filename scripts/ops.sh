#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

command_name="${1:-help}"

case "$command_name" in
  status|st)
    ./scripts/status-check.sh
    ;;
  lint)
    ./scripts/lint-check.sh
    ;;
  build)
    ./scripts/build-prod.sh
    ;;
  verify|v)
    ./scripts/verify-prod.sh
    ;;
  full-check|fc)
    ./scripts/full-check.sh
    ;;
  health|h)
    ./scripts/health-check.sh
    ;;
  smoke|sm)
    ./scripts/smoke-public.sh
    ;;
  smoke-admin|sma)
    ./scripts/smoke-admin-guest.sh
    ;;
  pre-deploy|pd)
    ./scripts/pre-deploy-check.sh
    ;;
  bootstrap|boot)
    ./scripts/bootstrap-dev.sh
    ;;
  db-backup|dbb)
    ./scripts/db-backup.sh
    ;;
  db-backup-list|dbbl)
    ./scripts/db-backup-list.sh
    ;;
  db-backup-latest|dbbt)
    ./scripts/db-backup-latest.sh
    ;;
  db-restore|dbr)
    shift
    ./scripts/db-restore.sh "$@"
    ;;
  logs|log)
    ./scripts/logs-app.sh
    ;;
  restart|rs)
    ./scripts/restart-app.sh
    ;;
  up)
    ./scripts/up-dev.sh
    ;;
  down)
    ./scripts/down-dev.sh
    ;;
  recreate|rc)
    ./scripts/recreate-app.sh
    ;;
  git-sync|gs)
    ./scripts/git-sync.sh
    ;;
  prisma-generate|pg)
    ./scripts/prisma-generate.sh
    ;;
  prisma-migrate|pm)
    ./scripts/prisma-migrate.sh
    ;;
  prisma-seed|ps)
    ./scripts/prisma-seed.sh
    ;;
  app-shell|ash)
    ./scripts/app-shell.sh
    ;;
  db-shell|dsh)
    ./scripts/db-shell.sh
    ;;
  help|*)
    echo "Available commands:"
    echo "  status | st"
    echo "  lint"
    echo "  build"
    echo "  verify | v"
    echo "  full-check | fc"
    echo "  health | h"
    echo "  smoke | sm"
    echo "  smoke-admin | sma"
    echo "  pre-deploy | pd"
    echo "  bootstrap | boot"
    echo "  db-backup | dbb"
    echo "  db-backup-list | dbbl"
    echo "  db-backup-latest | dbbt"
    echo "  db-restore | dbr <backup-file>"
    echo "  logs | log"
    echo "  restart | rs"
    echo "  up"
    echo "  down"
    echo "  recreate | rc"
    echo "  git-sync | gs"
    echo "  prisma-generate | pg"
    echo "  prisma-migrate | pm"
    echo "  prisma-seed | ps"
    echo "  app-shell | ash"
    echo "  db-shell | dsh"
    ;;
esac
