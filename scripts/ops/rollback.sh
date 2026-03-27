#!/usr/bin/env sh
set -eu

TARGET_TAG="${1:-}"

if [ -z "$TARGET_TAG" ]; then
  TARGET_TAG="$(git tag --sort=-creatordate | head -n 1)"
fi

if [ -z "$TARGET_TAG" ]; then
  echo "No tags found. Abort."
  exit 1
fi

echo "==> Rollback to tag: $TARGET_TAG"

git fetch --tags
git checkout "$TARGET_TAG"

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

echo "==> Rollback done: $TARGET_TAG"
