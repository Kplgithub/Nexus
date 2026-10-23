#!/usr/bin/env bash
# Pull, build and restart the stack on the server, keeping the previous images for rollback.
#   ./deploy/scripts/deploy.sh            deploy origin/main
#   ./deploy/scripts/deploy.sh main       same
#   ./deploy/scripts/deploy.sh <git-sha>  deploy a specific commit (also used for rollback)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
REF="${1:-origin/main}"
COMPOSE=(docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.production)
# Bundled MongoDB (set up by server-setup.sh) runs under the localdb profile.
if grep -qE '^USE_LOCAL_MONGO=true' deploy/.env.production 2>/dev/null; then
  COMPOSE+=(--profile localdb)
fi

git fetch --quiet --tags origin
# Accept a branch name (main), origin/<branch>, a tag or a SHA.
if git rev-parse --verify -q "origin/$REF" >/dev/null; then REF="origin/$REF"; fi
git checkout --quiet --detach "$REF"
export RELEASE="$(git rev-parse --short HEAD)"
echo "Deploying $RELEASE"

"${COMPOSE[@]}" build
"${COMPOSE[@]}" up -d
# Indexes are not auto-built in production.
"${COMPOSE[@]}" exec -T api node dist/scripts/sync-indexes.js

for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:4000/api/v1/health >/dev/null && curl -fsS -o /dev/null http://127.0.0.1:3000/robots.txt; then
    echo "Healthy: $RELEASE"
    echo "$RELEASE" >> deploy/.releases
    exit 0
  fi
  sleep 2
done
echo "Health check failed for $RELEASE. Roll back with: ./deploy/scripts/deploy.sh $(tail -n1 deploy/.releases 2>/dev/null || echo '<previous-sha>')"
exit 1
