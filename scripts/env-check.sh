#!/usr/bin/env bash
set -e

cd /home/docker/apps/waraqhur-platform

echo "===== REQUIRED FILES ====="
for file in package.json tsconfig.json docker-compose.dev.yml prisma/schema.prisma .env.production; do
  if [ -f "$file" ]; then
    echo "OK   $file"
  else
    echo "MISS $file"
    exit 1
  fi
done

echo "===== PACKAGE SCRIPTS ====="
node -e 'const p=require("./package.json"); console.log(Object.keys(p.scripts).sort().join("\n"))'

echo "===== NODE / NPM IN CONTAINER ====="
docker compose -f docker-compose.dev.yml exec app-dev sh -lc 'node -v && npm -v'

echo "===== NEXT / REACT VERSIONS ====="
docker compose -f docker-compose.dev.yml exec app-dev node -e 'console.log("next",require("next/package.json").version); console.log("react",require("react/package.json").version); console.log("react-dom",require("react-dom/package.json").version)'

echo "===== COMPOSE SERVICES ====="
docker compose -f docker-compose.dev.yml ps
