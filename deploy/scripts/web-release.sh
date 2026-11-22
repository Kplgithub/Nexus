#!/usr/bin/env bash
# Zero-downtime website deploy for the PM2 server (used by .github/workflows/deploy.yml).
#
# The live site keeps running from its own folder while the new version is
# downloaded, installed and built in a NEW folder. Only when that build works
# (checked on a spare port) does the "current" link move to it, and PM2 swaps
# the process without closing port 3000. If anything fails, the old version
# keeps serving (or is put back automatically).
#
#   <RELEASES_DIR>/
#     releases/<time>-<sha>/   one full copy per deploy (last KEEP_RELEASES kept)
#     current -> releases/...  what PM2 runs (apps/web inside it)
#
# DEPLOY_PATH (the old in-place git checkout) is only used to `git fetch` the
# code and as the home of the website's .env files, which every release links
# to, so there is still one place to edit them. Its own build is never touched,
# which is why it also works as the fallback during the first switch-over.
#
# Usage: DEPLOY_PATH=/srv/nexus bash web-release.sh
set -euo pipefail

: "${DEPLOY_PATH:?DEPLOY_PATH is required}"
DEPLOY_PATH="$(cd "$DEPLOY_PATH" && pwd -P)"
# Next to DEPLOY_PATH when the deploy user may write there, else in its home.
if [ -z "${RELEASES_DIR:-}" ]; then
  if [ -w "$(dirname "$DEPLOY_PATH")" ]; then
    RELEASES_DIR="$(dirname "$DEPLOY_PATH")/nexus-web-releases"
  else
    RELEASES_DIR="$HOME/nexus-web-releases"
  fi
fi
echo "Releases folder: $RELEASES_DIR"
APP_NAME="${APP_NAME:-nexus-web}"
PORT="${PORT:-3000}"
CHECK_PORT="${CHECK_PORT:-3100}"
WEB_INSTANCES="${WEB_INSTANCES:-1}"
KEEP_RELEASES="${KEEP_RELEASES:-3}"
# Paths that must answer 200 on the new build before and after the switch.
HEALTH_PATHS="${HEALTH_PATHS:-/ /robots.txt}"
BRANCH="${BRANCH:-main}"

log() { printf '\n==> %s\n' "$*"; }

mkdir -p "$RELEASES_DIR/releases"
RELEASES_DIR="$(cd "$RELEASES_DIR" && pwd -P)"
CURRENT="$RELEASES_DIR/current"
ECOSYSTEM="$RELEASES_DIR/ecosystem.config.cjs"

# ---------------------------------------------------------------- 1. code
log "Fetching $BRANCH"
git -C "$DEPLOY_PATH" fetch origin "$BRANCH"
SHA="$(git -C "$DEPLOY_PATH" rev-parse FETCH_HEAD)"
NEW="$RELEASES_DIR/releases/$(date -u +%Y%m%d%H%M%S)-${SHA:0:7}"
log "New release: $NEW"
mkdir -p "$NEW"
cleanup_failed() {
  # Remove a half-built release so it can never become "current".
  if [ "$(readlink -f "$CURRENT" 2>/dev/null || true)" != "$NEW" ]; then rm -rf "$NEW"; fi
}
trap 'echo "Deploy FAILED. Live site was not changed." >&2; cleanup_failed' ERR
git -C "$DEPLOY_PATH" archive --format=tar FETCH_HEAD | tar -x -C "$NEW"
echo "$SHA" > "$NEW/REVISION"

# Website env files stay in the old checkout; link them into the release.
for dir in "" apps/web; do
  for f in "$DEPLOY_PATH/$dir"/.env*; do
    [ -f "$f" ] || continue
    case "$f" in *.example) continue ;; esac
    ln -sfn "$f" "$NEW/$dir/$(basename "$f")"
    echo "linked env file: $dir/$(basename "$f")"
  done
done

# ---------------------------------------------------------------- 2. build
log "Installing dependencies"
df -h "$RELEASES_DIR" | tail -n 1 || true
(cd "$NEW" && CI=true pnpm install --frozen-lockfile --prefer-offline)

log "Building (the live site keeps running meanwhile)"
(cd "$NEW" && pnpm build)

# Visitors who opened a page just before the switch still ask for the old
# JS/CSS files; copy them in (never overwriting) so they don't get 404s.
PREV="$(readlink -f "$CURRENT" 2>/dev/null || true)"
if [ -n "$PREV" ] && [ -d "$PREV/apps/web/.next/static" ]; then
  cp -rn "$PREV/apps/web/.next/static/." "$NEW/apps/web/.next/static/" 2>/dev/null || true
fi

# ---------------------------------------------------------------- 3. test on a spare port
check_paths() { # base-url, tries
  local base="$1" tries="$2" p i
  for p in $HEALTH_PATHS; do
    for i in $(seq 1 "$tries"); do
      if curl -fsS -o /dev/null --max-time 20 "$base$p"; then break; fi
      if [ "$i" -eq "$tries" ]; then echo "health check failed: $base$p" >&2; return 1; fi
      sleep 2
    done
  done
}
log "Testing the new build on port $CHECK_PORT"
(cd "$NEW/apps/web" && exec node node_modules/next/dist/bin/next start --port "$CHECK_PORT") \
  > "$NEW/check-server.log" 2>&1 &
CHECK_PID=$!
if ! check_paths "http://127.0.0.1:$CHECK_PORT" 30; then
  tail -n 60 "$NEW/check-server.log" >&2 || true
  kill "$CHECK_PID" 2>/dev/null || true
  false
fi
# One of the new JS files must load too.
CHUNK="$(cd "$NEW/apps/web/.next/static" && find chunks -name '*.js' -print -quit)"
curl -fsS -o /dev/null "http://127.0.0.1:$CHECK_PORT/_next/static/$CHUNK"
kill "$CHECK_PID" 2>/dev/null || true
wait "$CHECK_PID" 2>/dev/null || true
echo "new build OK"

# ---------------------------------------------------------------- 4. switch
cat > "$ECOSYSTEM" <<EOF
// Written by deploy/scripts/web-release.sh. PM2 runs whatever "current" points to.
module.exports = {
  apps: [
    {
      name: '$APP_NAME',
      cwd: '$CURRENT/apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start --port $PORT --keepAliveTimeout 65000',
      exec_mode: 'cluster',
      instances: $WEB_INSTANCES,
      listen_timeout: 30000,
      kill_timeout: 10000,
      env: { NODE_ENV: 'production' },
    },
  ],
};
EOF

pm2_is_release_managed() {
  pm2 jlist 2>/dev/null | node -e '
    let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
      const list = JSON.parse(s.slice(s.indexOf("[")) || "[]");
      const p = list.find((x) => x.name === process.argv[1]);
      const ok = p && p.pm2_env.exec_mode === "cluster_mode" && p.pm2_env.pm_cwd === process.argv[2];
      process.exit(ok ? 0 : 1);
    });' "$APP_NAME" "$CURRENT/apps/web"
}

switch_to() { ln -sfn "$1" "$CURRENT.tmp" && mv -Tf "$CURRENT.tmp" "$CURRENT"; }

trap - ERR
if [ -n "$PREV" ] && pm2_is_release_managed; then
  log "Switching to the new release (no downtime)"
  switch_to "$NEW"
  pm2 reload "$APP_NAME" --update-env
  if ! check_paths "http://127.0.0.1:$PORT" 15; then
    log "New release unhealthy, rolling back to $PREV"
    switch_to "$PREV"
    pm2 reload "$APP_NAME" --update-env
    rm -rf "$NEW"
    exit 1
  fi
else
  # First run only: move PM2 from the old in-place folder to the release
  # layout. This one restart has a few seconds of downtime; later deploys none.
  log "First switch-over to release folders (one-time short restart)"
  switch_to "$NEW"
  pm2 delete "$APP_NAME" 2>/dev/null || true
  if ! { pm2 start "$ECOSYSTEM" && check_paths "http://127.0.0.1:$PORT" 15; }; then
    log "Switch-over failed, restarting the old in-place site"
    pm2 delete "$APP_NAME" 2>/dev/null || true
    rm -f "$CURRENT"
    (cd "$DEPLOY_PATH/apps/web" && pm2 start "pnpm start" --name "$APP_NAME")
    pm2 save || true
    rm -rf "$NEW"
    exit 1
  fi
fi
pm2 save

# ---------------------------------------------------------------- 5. tidy up
log "Keeping the last $KEEP_RELEASES releases"
LIVE="$(readlink -f "$CURRENT")"
ls -1d "$RELEASES_DIR"/releases/*/ 2>/dev/null | sed 's:/$::' | sort -r | tail -n +"$((KEEP_RELEASES + 1))" |
  while read -r old; do [ "$old" = "$LIVE" ] || rm -rf "$old"; done

echo "Deployment successful: $(cat "$CURRENT/REVISION")"
