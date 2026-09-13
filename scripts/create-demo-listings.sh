#!/usr/bin/env bash
set -euo pipefail

# ── Prerequisites ────────────────────────────────────────────────────────────
# Server running at http://localhost:8090
#
# Usage:
#   chmod +x scripts/create-demo-listings.sh
#   ./scripts/create-demo-listings.sh
#
# Override:
#   QUANTITY=5 SUBCATEGORY_ID=xxx ./scripts/create-demo-listings.sh

BASE_URL="${BASE_URL:-http://localhost:8090}"
API="$BASE_URL/api/v1"
QUANTITY="${QUANTITY:-20}"
SUBCATEGORY_ID="${SUBCATEGORY_ID:-}"
COOKIE_JAR="/tmp/oxneer-cookies.txt"
rm -f "$COOKIE_JAR"

# ── Helpers ──────────────────────────────────────────────────────────────────
info()  { printf "\033[1;34m[INFO]\033[0m  %s\n" "$*"; }
ok()    { printf "\033[1;32m[OK]\033[0m    %s\n" "$*"; }
warn()  { printf "\033[1;33m[WARN]\033[0m  %s\n" "$*"; }
fail()  { printf "\033[1;31m[FAIL]\033[0m  %s\n" "$*"; exit 1; }

extract_id() {
  echo "$1" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"id"[[:space:]]*:[[:space:]]*"//;s/"$//' | grep -o '[0-9a-f-]\{8,\}'
}

# ── Login ────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           Oxneer Demo Listing Generator                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

info "Logging in as superadmin…"
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/login" \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Origin: http://localhost:3000' \
  -H 'Referer: http://localhost:3000/' \
  --data-raw 'username=superadmin&password=Valentine%401' \
  -c "$COOKIE_JAR")

if [[ "$HTTP_CODE" != "200" ]]; then
  fail "Login failed (HTTP $HTTP_CODE). Check server and credentials."
fi
ok "Logged in (JSESSIONID saved)"

# ── Ensure subcategory ──────────────────────────────────────────────────────
if [ -z "$SUBCATEGORY_ID" ]; then
  info "Finding existing categories…"
  CATS_RESP=$(curl -s -b "$COOKIE_JAR" "$API/master/categories")
  CAT_ID=$(extract_id "$CATS_RESP")

  if [ -z "$CAT_ID" ]; then
    info "No categories found. Creating 'Electronics'…"
    CAT_RESP=$(curl -s -X POST "$API/master/categories" \
      -H 'Content-Type: application/json' \
      -b "$COOKIE_JAR" \
      -d '{"name":"Electronics","icon":"fa-solid fa-microchip"}')
    CAT_ID=$(extract_id "$CAT_RESP")
    ok "Created category $CAT_ID"
  else
    ok "Using existing category $CAT_ID"
  fi

  info "Finding sub-categories for category $CAT_ID…"
  SUBS_RESP=$(curl -s -b "$COOKIE_JAR" "$API/master/categories/$CAT_ID/sub-categories")
  SUBCATEGORY_ID=$(extract_id "$SUBS_RESP")

  if [ -z "$SUBCATEGORY_ID" ]; then
    info "No sub-categories found. Creating 'Smartphones'…"
    SUB_RESP=$(curl -s -X POST "$API/master/categories/$CAT_ID/sub-categories" \
      -H 'Content-Type: application/json' \
      -b "$COOKIE_JAR" \
      -d '{"name":"Smartphones","icon":"fa-solid fa-mobile-screen"}')
    SUBCATEGORY_ID=$(extract_id "$SUB_RESP")
    ok "Created sub-category $SUBCATEGORY_ID"
  else
    ok "Using existing sub-category $SUBCATEGORY_ID"
  fi
else
  ok "Using provided sub-category $SUBCATEGORY_ID"
fi
echo ""

# ── Create listing ──────────────────────────────────────────────────────────
info "Creating listing with quantity $QUANTITY…"

RESULT=$(curl -s -X POST "$API/listings" \
  -H 'Content-Type: application/json' \
  -b "$COOKIE_JAR" \
  -d '{"name":"Demo Product","description":"Generic product for demo auctions","tags":["demo"],"subCategory":"'"$SUBCATEGORY_ID"'","quantity":'"$QUANTITY"'}')

LID=$(extract_id "$RESULT")
if [ -n "$LID" ]; then
  ok "Created listing $LID"
  echo ""
  echo "══════════════════════════════════════════════════════════════"
  echo "  LISTING_ID=$LID"
  echo ""
  echo "  Use with create-demo-auctions.sh:"
  echo "    LISTING_ID=$LID MANAGED_TYPE_ID=<form-id> bash scripts/create-demo-auctions.sh"
  echo "══════════════════════════════════════════════════════════════"
  echo ""
else
  fail "Listing creation failed. Response: $RESULT"
fi
