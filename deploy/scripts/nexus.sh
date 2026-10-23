#!/usr/bin/env bash
# Shortcut for Docker Compose with the right files and profile, run from anywhere.
#   ./deploy/scripts/nexus.sh ps
#   ./deploy/scripts/nexus.sh logs -f --tail=200 api
#   ./deploy/scripts/nexus.sh restart web
#   ./deploy/scripts/nexus.sh seed-admin        # create another staff login (prompts for password)
#   ./deploy/scripts/nexus.sh seed-locations    # add Jaipur with sample localities
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
COMPOSE=(docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.production)
if grep -qE '^USE_LOCAL_MONGO=true' deploy/.env.production 2>/dev/null; then
  COMPOSE+=(--profile localdb)
fi

case "${1:-}" in
  seed-base | seed-locations | sync-indexes | remove-demo)
    exec "${COMPOSE[@]}" exec -T api node "dist/scripts/$1.js"
    ;;
  seed-admin)
    read -r -p "Admin email: " email
    read -r -p "Admin name: " name
    exec "${COMPOSE[@]}" exec -it -e ADMIN_EMAIL="$email" -e ADMIN_NAME="$name" api node dist/scripts/seed-admin.js
    ;;
  *)
    exec "${COMPOSE[@]}" "$@"
    ;;
esac
