#!/usr/bin/env sh
set -eu

BRANCH="${1:-main}"
echo "==> Deploy branch: $BRANCH"

git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

npx prisma generate
npx prisma migrate deploy

npm run build:prod

docker compose -f docker-compose.dev.yml up -d --build app-dev
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml logs --tail=60 app-dev

echo "==> Deploy done"
