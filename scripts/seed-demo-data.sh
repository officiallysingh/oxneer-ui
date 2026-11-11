#!/usr/bin/env bash
set -euo pipefail

# ── Seed all demo data in one go ─────────────────────────────────────────────
# Server running at http://localhost:8090
#
# Runs, in order:
#   1. create-components.sh    metadata components     (skip with SKIP_COMPONENTS=true)
#   2. create-custom-form.sh   custom form             -> MANAGED_TYPE_ID
#   3. create-demo-listings.sh listing                 -> LISTING_ID
#   4. create-demo-auctions.sh public + private auctions
#
# Usage:
#   bash scripts/seed-demo-data.sh
#
# Every option of the individual scripts passes through, for example:
#   NUM_AUCTIONS=8 ACCESSIBILITY=MIXED INVITE_EMAILS="a@x.com,b@x.com" bash scripts/seed-demo-data.sh
#   MANAGED_TYPE_ID=xxx LISTING_ID=yyy bash scripts/seed-demo-data.sh   # reuse existing ones
#
# To start again from a clean slate first: bash scripts/unpublish-auctions.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKIP_COMPONENTS="${SKIP_COMPONENTS:-false}"
MANAGED_TYPE_ID="${MANAGED_TYPE_ID:-}"
LISTING_ID="${LISTING_ID:-}"

info()  { printf "\033[1;34m[INFO]\033[0m  %s\n" "$*"; }
ok()    { printf "\033[1;32m[OK]\033[0m    %s\n" "$*"; }
fail()  { printf "\033[1;31m[FAIL]\033[0m  %s\n" "$*"; exit 1; }

# Runs a script, shows its output, and prints the value of KEY=... from it.
run_and_capture() {
  local script="$1" key="$2" out
  out=$(bash "$SCRIPT_DIR/$script" 2>&1 | tee /dev/stderr) || fail "$script failed"
  echo "$out" | grep -o "$key=[0-9a-zA-Z-]*" | head -1 | cut -d= -f2
}

if [ "$SKIP_COMPONENTS" != "true" ]; then
  info "Step 1/4: components"
  bash "$SCRIPT_DIR/create-components.sh" || fail "create-components.sh failed"
else
  info "Step 1/4: components skipped"
fi

if [ -z "$MANAGED_TYPE_ID" ]; then
  info "Step 2/4: custom form"
  MANAGED_TYPE_ID=$(run_and_capture create-custom-form.sh MANAGED_TYPE_ID)
  [ -n "$MANAGED_TYPE_ID" ] || fail "Could not read MANAGED_TYPE_ID from create-custom-form.sh"
else
  info "Step 2/4: reusing custom form $MANAGED_TYPE_ID"
fi
ok "MANAGED_TYPE_ID=$MANAGED_TYPE_ID"

if [ -z "$LISTING_ID" ]; then
  info "Step 3/4: listing"
  LISTING_ID=$(run_and_capture create-demo-listings.sh LISTING_ID)
  [ -n "$LISTING_ID" ] || fail "Could not read LISTING_ID from create-demo-listings.sh"
else
  info "Step 3/4: reusing listing $LISTING_ID"
fi
ok "LISTING_ID=$LISTING_ID"

info "Step 4/4: auctions"
MANAGED_TYPE_ID="$MANAGED_TYPE_ID" LISTING_ID="$LISTING_ID" \
  bash "$SCRIPT_DIR/create-demo-auctions.sh"

ok "Demo data seeded"
