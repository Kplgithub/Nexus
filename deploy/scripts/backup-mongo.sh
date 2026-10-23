#!/usr/bin/env bash
# Nightly MongoDB backup with 14-day local retention.
# Cron (as the deploy user):  15 2 * * *  /srv/nexus/deploy/scripts/backup-mongo.sh >> /var/log/nexus-backup.log 2>&1
# Requires mongodump (MongoDB Database Tools) for Atlas; the bundled database uses its container's copy. Reads MONGODB_URI from deploy/.env.production.
# Copy the archives off-server too (e.g. rclone to cloud storage) — a backup on the same disk is not a backup.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$ROOT/deploy/.env.production"
DEST="${BACKUP_DIR:-$ROOT/deploy/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"

MONGODB_URI="$(grep -E '^MONGODB_URI=' "$ENV_FILE" | cut -d= -f2-)"
[ -n "$MONGODB_URI" ] || { echo "MONGODB_URI missing in $ENV_FILE"; exit 1; }

mkdir -p "$DEST"
chmod 700 "$DEST"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$DEST/nexus-$STAMP.archive.gz"

if grep -qE '^USE_LOCAL_MONGO=true' "$ENV_FILE"; then
  # Bundled database: dump from inside its container (it has no published port).
  docker compose -f "$ROOT/deploy/docker-compose.prod.yml" --env-file "$ENV_FILE" --profile localdb \
    exec -T mongo mongodump --uri="$MONGODB_URI" --archive --gzip --quiet > "$FILE"
else
  mongodump --uri="$MONGODB_URI" --archive="$FILE" --gzip --quiet
fi
chmod 600 "$FILE"
echo "$(date -u) backup ok: $FILE ($(du -h "$FILE" | cut -f1))"

find "$DEST" -name 'nexus-*.archive.gz' -mtime +"$KEEP_DAYS" -delete

# Restore (careful — overwrites collections):
#   mongorestore --uri="$MONGODB_URI" --archive=FILE --gzip --drop
