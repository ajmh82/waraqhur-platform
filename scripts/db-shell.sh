#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

docker compose -f docker-compose.dev.yml exec db sh
