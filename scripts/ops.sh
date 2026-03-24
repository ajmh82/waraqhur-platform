#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

command_name="${1:-help}"

case "$command_name" in
  status|st)
    ./scripts/status-check.sh
    ;;
  quick|q)
    ./scripts/quick-status.sh
    ;;
  latest|la)
    ./scripts/latest-artifacts.sh
    ;;
  doctor|dr)
    ./scripts/doctor.sh
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
  maintenance|mt)
    ./scripts/maintenance-check.sh
    ;;
  env|env-check|ec)
    ./scripts/env-check.sh
    ;;
  self-test|test|t)
    ./scripts/self-test-ops.sh
    ;;
  report|rp)
    ./scripts/system-report.sh
    ;;
  write-report|wr)
    ./scripts/write-report.sh
    ;;
  release-check|rel)
    ./scripts/release-check.sh
    ;;
  api-preview|ap)
    ./scripts/api-preview.sh
    ;;
  public-preview|pp)
    ./scripts/public-preview.sh
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
  db-backup-prune|dbbp)
    shift
    ./scripts/db-backup-prune.sh "$@"
    ;;
  backup-cycle|bc)
    shift
    ./scripts/backup-cycle.sh "$@"
    ;;
  db-restore|dbr)
    shift
    ./scripts/db-restore.sh "$@"
    ;;
  db-status|dbs)
    ./scripts/db-status.sh
    ;;
  db-tables|dbt)
    ./scripts/db-tables.sh
    ;;
  db-tools|dbx)
    ./scripts/db-tools-check.sh
    ;;
  docker-status|dps)
    ./scripts/docker-status.sh
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
    echo "  quick | q"
    echo "  latest | la"
    echo "  doctor | dr"
    echo "  lint"
    echo "  build"
    echo "  verify | v"
    echo "  full-check | fc"
    echo "  maintenance | mt"
    echo "  env | env-check | ec"
    echo "  self-test | test | t"
    echo "  report | rp"
    echo "  write-report | wr"
    echo "  release-check | rel"
    echo "  api-preview | ap"
    echo "  public-preview | pp"
    echo "  health | h"
    echo "  smoke | sm"
    echo "  smoke-admin | sma"
    echo "  pre-deploy | pd"
    echo "  bootstrap | boot"
    echo "  db-backup | dbb"
    echo "  db-backup-list | dbbl"
    echo "  db-backup-latest | dbbt"
    echo "  db-backup-prune | dbbp <keep-count>"
    echo "  backup-cycle | bc <keep-count>"
    echo "  db-restore | dbr <backup-file>"
    echo "  db-status | dbs"
    echo "  db-tables | dbt"
    echo "  db-tools | dbx"
    echo "  docker-status | dps"
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
