#!/usr/bin/env bash
# Pull, build and restart the stack on the server, keeping the previous images for rollback.
# The website is this repo; the API comes from Kplgithub/Nexus_Backend, checked out at ./backend.
#   ./deploy/scripts/deploy.sh                      deploy main of both repos
#   ./deploy/scripts/deploy.sh main main            same
#   ./deploy/scripts/deploy.sh <web-ref> <api-ref>  branch, tag or SHA of each (also used for rollback)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
WEB_REF="${1:-main}"
API_REF="${2:-main}"
COMPOSE=(docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.production)
# Bundled MongoDB (set up by server-setup.sh) runs under the localdb profile.
if grep -qE '^USE_LOCAL_MONGO=true' deploy/.env.production 2>/dev/null; then
  COMPOSE+=(--profile localdb)
fi
[ -d backend/.git ] || { echo "No backend checkout in $ROOT/backend. Run deploy/scripts/server-setup.sh first." >&2; exit 1; }

# Accept a branch name (main), origin/<branch>, a tag or a SHA.
checkout() {
  local dir="$1" ref="$2"
  git -C "$dir" fetch --quiet --tags origin
  if git -C "$dir" rev-parse --verify -q "origin/$ref" >/dev/null; then ref="origin/$ref"; fi
  git -C "$dir" checkout --quiet --detach "$ref"
  git -C "$dir" rev-parse --short HEAD
}
WEB_SHA="$(checkout . "$WEB_REF")"
API_SHA="$(checkout backend "$API_REF")"
export RELEASE="$WEB_SHA-$API_SHA"
echo "Deploying website $WEB_SHA + backend $API_SHA"

# Both repos carry packages/shared; deploying two copies that disagree breaks forms and validation.
./scripts/check-shared.sh backend >/dev/null || {
  ./scripts/check-shared.sh backend || true
  echo "Not deploying: packages/shared differs between the two repos at these commits." >&2
  exit 1
}

"${COMPOSE[@]}" build
"${COMPOSE[@]}" up -d
# Indexes are not auto-built in production.
"${COMPOSE[@]}" exec -T api node dist/scripts/sync-indexes.js

PREVIOUS="$(tail -n1 deploy/.releases 2>/dev/null || true)"
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:4000/api/v1/health >/dev/null && curl -fsS -o /dev/null http://127.0.0.1:3000/robots.txt; then
    echo "Healthy: website $WEB_SHA + backend $API_SHA"
    echo "$WEB_SHA $API_SHA" >> deploy/.releases
    exit 0
  fi
  sleep 2
done
echo "Health check failed for $RELEASE. Roll back with: ./deploy/scripts/deploy.sh ${PREVIOUS:-<web-sha> <api-sha>}"
exit 1
