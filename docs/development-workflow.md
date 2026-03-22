# Development Workflow

## Environments

### Production
- URL: http://192.168.0.197:3002
- Compose file: docker-compose.yml
- Purpose: stable deployed version

### Development
- URL: http://192.168.0.197:3003
- Compose file: docker-compose.dev.yml
- Purpose: fast iteration with hot reload

## Recommended workflow

1. Use the development environment on port 3003 for most UI and code changes.
2. Do not rebuild the production image after every small edit.
3. Rebuild production on port 3002 only when:
   - finishing a batch of changes
   - validating production behavior
   - changing Dockerfile or dependencies
   - changing Prisma schema or environment-sensitive behavior

## Useful commands

### Start development
cd /home/docker/apps/waraqhur-platform
docker compose -f docker-compose.dev.yml up -d

### View development logs
cd /home/docker/apps/waraqhur-platform
docker compose -f docker-compose.dev.yml logs --tail=80 app-dev

### Start production
cd /home/docker/apps/waraqhur-platform
docker compose build app && docker compose up -d app

### Check containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
