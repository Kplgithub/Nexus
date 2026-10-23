#!/usr/bin/env bash
# packages/shared is kept identical in this repo and in Kplgithub/Nexus_Backend.
# Fails (and shows the difference) if the copy in ./backend has drifted.
#   scripts/check-shared.sh [backend-dir]
set -euo pipefail
cd "$(dirname "$0")/.."
BACKEND="${1:-backend}"
[ -d "$BACKEND/packages/shared" ] || { echo "No backend checkout at $BACKEND (clone Kplgithub/Nexus_Backend there)." >&2; exit 2; }
if diff -ru -x node_modules -x dist -x '*.tsbuildinfo' "$BACKEND/packages/shared" packages/shared; then
  echo "packages/shared matches $BACKEND/packages/shared"
else
  echo "packages/shared differs from the backend repo. Make the same change in both repos." >&2
  exit 1
fi
