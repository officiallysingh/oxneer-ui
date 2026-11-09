#!/usr/bin/env bash
set -euo pipefail

# ── Prerequisites ────────────────────────────────────────────────────────────
# Server running at http://localhost:8090
#
# Required:
#   MANAGED_TYPE_ID  - from create-custom-form.sh
#   LISTING_ID       - from create-demo-listings.sh
#
# Usage:
#   chmod +x scripts/create-demo-auctions.sh
#   MANAGED_TYPE_ID=xxx LISTING_ID=yyy ./scripts/create-demo-auctions.sh
#
# Optional:
#   NUM_AUCTIONS=5 PUBLISH=false ACCESSIBILITY=PRIVATE ./scripts/create-demo-auctions.sh

BASE_URL="${BASE_URL:-http://localhost:8090}"
API="$BASE_URL/api/v1"
NUM_AUCTIONS="${NUM_AUCTIONS:-5}"
MANAGED_TYPE_ID="${MANAGED_TYPE_ID:-}"
LISTING_ID="${LISTING_ID:-}"
SUBCATEGORY_ID="${SUBCATEGORY_ID:-}"
PUBLISH="${PUBLISH:-true}"
ACCESSIBILITY="${ACCESSIBILITY:-PUBLIC}"
COOKIE_JAR="/tmp/oxneer-cookies.txt"
rm -f "$COOKIE_JAR"

# ── Helpers ──────────────────────────────────────────────────────────────────
info()  { printf "\033[1;34m[INFO]\033[0m  %s\n" "$*"; }
ok()    { printf "\033[1;32m[OK]\033[0m    %s\n" "$*"; }
warn()  { printf "\033[1;33m[WARN]\033[0m  %s\n" "$*"; }
fail()  { printf "\033[1;31m[FAIL]\033[0m  %s\n" "$*"; exit 1; }

extract_id() {
  echo "$1" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"id"[[:space:]]*:[[:space:]]*"//;s/"$//' | grep -o '[0-9a-f-]\{8,\}' || true
}

# Calls the API and sets LAST_CODE, LAST_BODY and LAST_LOCATION (the id at the
# end of the Location header, which is how create endpoints return new ids).
api() {
  local method="$1" url="$2" data="${3:-}" headers resp
  headers=$(mktemp)
  local args=(-s -D "$headers" -w '\n%{http_code}' -X "$method" "$url" -b "$COOKIE_JAR")
  if [ -n "$data" ]; then
    args+=(-H 'Content-Type: application/json' -d "$data")
  fi
  resp=$(curl "${args[@]}") || true
  LAST_CODE=$(echo "$resp" | tail -1)
  LAST_BODY=$(echo "$resp" | sed '$d')
  LAST_LOCATION=$(grep -i '^location:' "$headers" | tail -1 | tr -d '\r' | sed 's#.*/##' || true)
  rm -f "$headers"
}

# Runs one setup step and reports the outcome from its HTTP status.
step() {
  local label="$1" method="$2" path="$3" data="${4:-}"
  api "$method" "$API/$path" "$data"
  case "$LAST_CODE" in
    2*) ok "  $label"; return 0 ;;
  esac
  warn "  $label failed (HTTP $LAST_CODE): $LAST_BODY"
  return 1
}

# ── Login ────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        Oxneer Demo Auction Generator ($NUM_AUCTIONS auctions)              ║"
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

# ── Validate required IDs ───────────────────────────────────────────────────
[ -z "$MANAGED_TYPE_ID" ] && fail "MANAGED_TYPE_ID is required. Run create-custom-form.sh first."
[ -z "$LISTING_ID" ] && fail "LISTING_ID is required. Run create-demo-listings.sh first."

ok "Managed Type: $MANAGED_TYPE_ID"
ok "Listing:      $LISTING_ID"

# ── Detect subcategory from listing if not provided ─────────────────────────
if [ -z "$SUBCATEGORY_ID" ]; then
  info "Detecting sub-category from listing…"
  LISTING_RESP=$(curl -s -b "$COOKIE_JAR" "$API/listings/$LISTING_ID")
  SUBCATEGORY_ID=$(echo "$LISTING_RESP" | tr '\n' ' ' | grep -o '"subCategory"[[:space:]]*:[[:space:]]*{[^}]*"id"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '[0-9a-f-]\{8,\}' | head -1)
  if [ -z "$SUBCATEGORY_ID" ]; then
    # Try flat string format
    SUBCATEGORY_ID=$(echo "$LISTING_RESP" | tr '\n' ' ' | grep -o '"subCategory"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | grep -o '[0-9a-f-]\{8,\}')
  fi
  [ -z "$SUBCATEGORY_ID" ] && fail "Could not detect sub-category from listing."
  ok "Sub-category: $SUBCATEGORY_ID"
fi
echo ""

# ── Auction data ────────────────────────────────────────────────────────────
TITLES=(
  "Samsung Galaxy S24 Ultra 256GB"
  "Apple iPhone 15 Pro Max 512GB"
  "Google Pixel 8 Pro 128GB"
  "OnePlus 12 256GB"
  "Xiaomi 14 Ultra 512GB"
)

DESCRIPTIONS=(
  "Flagship Samsung smartphone with S-Pen and 200MP camera"
  "Latest Apple flagship with titanium design and A17 Pro chip"
  "Google's AI-powered flagship with Tensor G3 processor"
  "Flagship killer with Snapdragon 8 Gen 3 and 100W charging"
  "Leica-powered camera flagship with Snapdragon 8 Gen 3"
)

TAGS=(
  '"samsung","mobile","flagship"'
  '"apple","iphone","premium"'
  '"google","pixel","ai"'
  '"oneplus","speed","flagship"'
  '"xiaomi","camera","premium"'
)

PRICES=(89999 159999 74999 64999 89999)

# ── Create auctions ─────────────────────────────────────────────────────────
CREATED_IDS=()
FAILURES=0

for i in $(seq 1 "$NUM_AUCTIONS"); do
  idx=$(( (i - 1) % ${#TITLES[@]} ))
  title="${TITLES[$idx]}"
  description="${DESCRIPTIONS[$idx]}"
  tags="${TAGS[$idx]}"
  price="${PRICES[$idx]}"
  ref_id="DEMO-$(printf '%04d' $i)"

  echo ""
  info "[$i/$NUM_AUCTIONS] Creating: $title"

  # Create auction
  api POST "$API/auctions" '{
    "type": "SIMPLE",
    "title": "'"$title"' (DEMO-'"$(printf '%04d' $i)"')",
    "description": "'"$description"'",
    "referenceId": "'"$ref_id"'",
    "direction": "FORWARD",
    "accessibility": "'"$ACCESSIBILITY"'",
    "regionalSettings": {
      "currency": "INR",
      "timeZone": "Asia/Kolkata",
      "roundingMode": "HALF_UP"
    },
    "tags": ['"$tags"'],
    "subCategories": ["'"$SUBCATEGORY_ID"'"],
    "unit": {
      "type": "SINGLE_UNIT",
      "name": "'"$title"'",
      "item": {
        "id": "'"$LISTING_ID"'",
        "name": "'"$title"'",
        "description": "'"$description"'",
        "quantity": 1
      },
      "openingPrice": '"$price"'
    },
    "reservePricePolicy": {
      "type": "RESERVE_PRICE_POLICY",
      "name": "Reserve price",
      "description": "Lowest price the seller will accept",
      "basis": "PERCENTAGE_BASED",
      "value": 10,
      "visibility": "VISIBLE_ONCE_MET"
    }
  }'

  case "$LAST_CODE" in
    2*) ;;
    *)
      warn "  Failed to create auction (HTTP $LAST_CODE): $LAST_BODY"
      FAILURES=$((FAILURES + 1))
      continue
      ;;
  esac
  AUCTION_ID="${LAST_LOCATION:-$(extract_id "$LAST_BODY")}"
  if [ -z "$AUCTION_ID" ]; then
    warn "  Auction created but its id was not returned. Response: $LAST_BODY"
    FAILURES=$((FAILURES + 1))
    continue
  fi
  ok "  Auction: $AUCTION_ID"
  step_failed=0

  # Who can join and what they complete first
  step "Pre-auction rules set" POST "auctions/$AUCTION_ID/pre-auction-rules" '{
    "policies": [
      {
        "type": "MINIMUM_PARTICIPANTS_REQUIREMENT_POLICY",
        "name": "Minimum Participants",
        "description": "At least 3 participants required",
        "order": 1,
        "count": 3,
        "preStartValidationDuration": "PT30M"
      }
    ],
    "steps": [
      {
        "type": "TNC_FORM_STEP",
        "name": "Terms & Conditions",
        "description": "Accept terms and conditions to participate",
        "order": 1,
        "mandatory": true,
        "tncText": "By participating in this auction, you agree to abide by all rules and regulations. The auctioneer reserves the right to cancel or modify the auction at any time. All bids are binding and cannot be withdrawn once placed."
      },
      {
        "type": "FORM_STEP",
        "name": "Product Details",
        "description": "Provide additional product information",
        "order": 2,
        "phase": "PRE_AUCTION",
        "mandatory": true,
        "typeId": "'"$MANAGED_TYPE_ID"'"
      },
      {
        "type": "BANK_DETAIL_FORM_STEP",
        "name": "Bank Details",
        "description": "Provide bank details for refund purposes",
        "order": 3,
        "phase": "PRE_AUCTION",
        "mandatory": true
      },
      {
        "type": "PAYMENT_STEP",
        "name": "Pre Payment",
        "description": "Deposit and fee due before the auction starts",
        "order": 4,
        "phase": "PRE_AUCTION",
        "mandatory": true,
        "mode": "ONLINE",
        "offset": "PT1H",
        "heads": [
          {
            "name": "Security Deposit",
            "description": "Refundable security deposit required to participate",
            "value": 5000,
            "basis": "AMOUNT_BASED",
            "refundable": true
          },
          {
            "name": "Platform Fee",
            "description": "Non-refundable platform convenience fee",
            "value": 2.5,
            "basis": "PERCENTAGE_BASED",
            "refundable": false
          }
        ]
      }
    ]
  }' || step_failed=1

  # How offers are placed
  step "Offer rules set" POST "auctions/$AUCTION_ID/offer-rules" '{
    "offerMechanism": "OPEN",
    "participantVisibility": "ALIAS",
    "offerVisibility": "RANK",
    "priceProgressionPolicy": {
      "type": "PRICE_PROGRESSION_POLICY",
      "name": "Price progression",
      "description": "Offer price rules over time",
      "policies": [
        {
          "type": "STEP_BASED_OFFER_PRICE_POLICY",
          "name": "Fixed bid steps",
          "description": "Bids rise in multiples of the step value",
          "order": 1,
          "windowDuration": "PT0S",
          "steps": [1, 2, 5],
          "value": 1000
        }
      ]
    }
  }' || step_failed=1

  # Who wins and what they pay
  step "Post-auction rules set" POST "auctions/$AUCTION_ID/post-auction-rules" '{
    "policies": [
      {
        "type": "KTH_PRICE_WINNER_DETERMINATION_POLICY",
        "name": "Highest Bidder Wins",
        "description": "The highest bidder determines the winner",
        "order": 1,
        "kth": 1
      },
      {
        "type": "KTH_WINNER_PRICE_DETERMINATION_POLICY",
        "name": "Winner Pays Own Bid",
        "description": "Winner pays their own bid amount",
        "order": 2,
        "kth": 1
      }
    ]
  }' || step_failed=1

  # Schedule (2-hour offer window with soft close) & publish
  START_TIME=$(date -u -d "+${i} days 10:00:00" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null \
    || date -u -v+${i}d -v+10H -v+0M -v+0S +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null)

  step "Scheduled from $START_TIME for 2 hours" PUT "auctions/$AUCTION_ID/schedule" '{
    "startTime": "'"$START_TIME"'",
    "endMode": "DURATION",
    "offerDuration": "PT2H",
    "softClose": {
      "reference": "FROM_AUCTION_END_TIME",
      "duration": "PT5M",
      "limit": 3
    }
  }' || step_failed=1

  if [ "$step_failed" -eq 0 ] && [ "$PUBLISH" = "true" ]; then
    step "Published" PUT "auctions/$AUCTION_ID/publish" || step_failed=1
  fi

  [ "$step_failed" -eq 0 ] || FAILURES=$((FAILURES + 1))
  CREATED_IDS+=("$AUCTION_ID")
done

# ── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                      Summary                               ║"
echo "╠══════════════════════════════════════════════════════════════╣"
printf "║  ManagedType: %-46s ║\n" "$MANAGED_TYPE_ID"
printf "║  Listing:     %-46s ║\n" "$LISTING_ID"
printf "║  SubCategory: %-46s ║\n" "$SUBCATEGORY_ID"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Auction IDs:                                              ║"
for j in "${!CREATED_IDS[@]}"; do
  printf "║    %2d. %-51s ║\n" "$((j+1))" "${CREATED_IDS[$j]}"
done
echo "╠══════════════════════════════════════════════════════════════╣"
printf "║  Admin:  %-48s ║\n" "$BASE_URL/api/v1/auctions"
printf "║  Public: %-48s ║\n" "$BASE_URL/api/v1/auctions/public"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

[ "$FAILURES" -eq 0 ] || fail "$FAILURES of $NUM_AUCTIONS auctions did not finish setup. See the warnings above."
