#!/usr/bin/env bash
set -euo pipefail

LOCKFILE="package-lock.json"
STATE_DIR=".cursor/.cache"
STATE_FILE="$STATE_DIR/npm-lock.sha256"

if [[ ! -f package.json ]]; then
  echo "No package.json found; skipping Node dependency install."
  exit 0
fi

mkdir -p "$STATE_DIR"

if [[ ! -f "$LOCKFILE" ]]; then
  echo "No package-lock.json found; running npm install."
  npm install --no-audit --no-fund
  exit 0
fi

LOCK_HASH="$(sha256sum "$LOCKFILE" | awk '{print $1}')"

if [[ -d node_modules ]] && [[ -f "$STATE_FILE" ]]; then
  PREVIOUS_HASH="$(cat "$STATE_FILE")"
  if [[ "$PREVIOUS_HASH" == "$LOCK_HASH" ]]; then
    echo "Dependencies already match package-lock.json; skipping install."
    exit 0
  fi
fi

echo "Installing dependencies with npm ci..."
npm ci --no-audit --no-fund
echo "$LOCK_HASH" > "$STATE_FILE"
