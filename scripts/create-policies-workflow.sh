#!/usr/bin/env bash
set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────
BASE_URL="${OXNEER_BASE_URL:-http://localhost:8090}"
API="$BASE_URL/api/v1"
AUCTION_ID="${AUCTION_ID:-}"
MANAGED_TYPE_ID="${MANAGED_TYPE_ID:-}"

# Preset: standard, minimal, premium
PRESET="${PRESET:-standard}"

# ─── Helpers ──────────────────────────────────────────────────────────────────
info()  { printf "\033[1;34m[INFO]\033[0m  %s\n" "$*"; }
ok()    { printf "\033[1;32m[OK]\033[0m    %s\n" "$*"; }
warn()  { printf "\033[1;33m[WARN]\033[0m  %s\n" "$*"; }
fail()  { printf "\033[1;31m[FAIL]\033[0m  %s\n" "$*"; exit 1; }

extract_id() {
  echo "$1" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"id"[[:space:]]*:[[:space:]]*"//;s/"$//' | grep -o '[0-9a-f-]\{8,\}'
}

http_post() {
  local url="$1" data="$2"
  curl -s -w "\n%{http_code}" -X POST "$url" \
    -H 'Content-Type: application/json' \
    -d "$data"
}

parse_response() {
  local resp="$1"
  LAST_HTTP_CODE=$(echo "$resp" | tail -1)
  LAST_BODY=$(echo "$resp" | sed '$d')
}

check_health() {
  info "Checking server at $BASE_URL …"
  local status
  status=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/swagger-ui/index.html" 2>/dev/null || true)
  if [ "$status" = "200" ] || [ "$status" = "302" ]; then
    ok "Server is reachable"
  else
    fail "Server not reachable at $BASE_URL (HTTP $status). Is it running?"
  fi
}

# ─── Ensure Managed Type ─────────────────────────────────────────────────────
ensure_managed_type() {
  if [ -n "$MANAGED_TYPE_ID" ]; then
    ok "Using existing managed type $MANAGED_TYPE_ID"
    return
  fi

  info "Fetching existing managed types …"
  local mts
  mts=$(curl -sf "$API/meta-data/managed-types" 2>/dev/null || echo '{"content":[]}')
  MANAGED_TYPE_ID=$(echo "$mts" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"id"[[:space:]]*:[[:space:]]*"//;s/"$//' | grep -o '[0-9a-f-]\{8,\}')

  if [ -n "$MANAGED_TYPE_ID" ]; then
    ok "Using existing managed type $MANAGED_TYPE_ID"
  else
    info "Creating managed type 'Product Details Form' …"
    local payload
    payload='{
      "name":"Product Details Form",
      "description":"Custom form for additional product information collected from participants",
      "type":"CUSTOM_FORM",
      "properties":[
        {"type":"SIMPLE_PROPERTY","name":"brandName","label":"Brand Name","dataType":"STRING","validators":[{"type":"NOT_BLANK"}]},
        {"type":"SIMPLE_PROPERTY","name":"modelNumber","label":"Model Number","dataType":"STRING","validators":[{"type":"NOT_BLANK"}]},
        {"type":"SIMPLE_PROPERTY","name":"yearOfManufacture","label":"Year of Manufacture","dataType":"INTEGER"},
        {"type":"SIMPLE_PROPERTY","name":"condition","label":"Product Condition","dataType":"STRING"},
        {"type":"SIMPLE_PROPERTY","name":"warrantyMonths","label":"Warranty (Months)","dataType":"INTEGER","validators":[{"type":"POSITIVE_OR_ZERO"}]}
      ]
    }'
    local resp
    resp=$(curl -sf -X POST "$API/meta-data/managed-types" \
      -H 'Content-Type: application/json' \
      -d "$payload")
    MANAGED_TYPE_ID=$(extract_id "$resp")
    ok "Created managed type $MANAGED_TYPE_ID"
  fi
}

# ─── Policy Definitions ──────────────────────────────────────────────────────
get_policies_standard() {
  cat <<EOF
[
  {
    "type": "MINIMUM_PARTICIPANTS_REQUIREMENT_POLICY",
    "name": "Minimum Participants",
    "description": "At least 3 participants required to start auction",
    "order": 1,
    "count": 3,
    "preStartValidationDuration": "PT30M"
  },
  {
    "type": "EXTENSION_POLICY",
    "name": "Auction Extension",
    "description": "Extend auction by 5 minutes if bids placed in last 2 minutes, max 3 extensions",
    "order": 2,
    "reference": "FROM_AUCTION_END_TIME",
    "duration": "PT5M",
    "limit": 3
  },
  {
    "type": "STEP_BASED_OFFER_PRICE_POLICY",
    "name": "Step Based Price",
    "description": "Minimum bid increment decreases in steps every 10 minutes",
    "order": 3,
    "windowDuration": "PT10M",
    "steps": [100, 75, 50, 25, 10],
    "value": 100
  },
  {
    "type": "KTH_PRICE_WINNER_DETERMINATION_POLICY",
    "name": "Highest Bidder Wins",
    "description": "The highest bidder determines the winner",
    "order": 4,
    "kth": 1
  },
  {
    "type": "KTH_WINNER_PRICE_DETERMINATION_POLICY",
    "name": "Winner Pays Own Bid",
    "description": "Winner pays their own bid amount",
    "order": 5,
    "kth": 1
  }
]
EOF
}

get_policies_minimal() {
  cat <<EOF
[
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
EOF
}

get_policies_premium() {
  cat <<EOF
[
  {
    "type": "MINIMUM_PARTICIPANTS_REQUIREMENT_POLICY",
    "name": "Minimum Participants",
    "description": "At least 5 participants required to start auction",
    "order": 1,
    "count": 5,
    "preStartValidationDuration": "PT1H"
  },
  {
    "type": "EXTENSION_POLICY",
    "name": "Auction Extension",
    "description": "Extend auction by 5 minutes if bids placed in last 2 minutes, max 5 extensions",
    "order": 2,
    "reference": "FROM_AUCTION_END_TIME",
    "duration": "PT5M",
    "limit": 5
  },
  {
    "type": "STEP_BASED_OFFER_PRICE_POLICY",
    "name": "Step Based Price",
    "description": "Minimum bid increment decreases in steps every 5 minutes",
    "order": 3,
    "windowDuration": "PT5M",
    "steps": [200, 150, 100, 75, 50, 25, 10],
    "value": 200
  },
  {
    "type": "KTH_PRICE_WINNER_DETERMINATION_POLICY",
    "name": "Highest Bidder Wins",
    "description": "The highest bidder determines the winner",
    "order": 4,
    "kth": 1
  },
  {
    "type": "KTH_WINNER_PRICE_DETERMINATION_POLICY",
    "name": "Winner Pays Own Bid",
    "description": "Winner pays their own bid amount",
    "order": 5,
    "kth": 1
  },
  {
    "type": "RANDOM_TIE_BREAKING_POLICY",
    "name": "Random Tie Breaker",
    "description": "Randomly select winner in case of tie",
    "order": 6
  }
]
EOF
}

# ─── Workflow Definitions ────────────────────────────────────────────────────
get_workflow_standard() {
  cat <<EOF
[
  {
    "type": "TNC_FORM_STEP",
    "name": "Terms & Conditions",
    "description": "Accept terms and conditions to participate",
    "order": 1,
    "tncText": "By participating in this auction, you agree to abide by all rules and regulations. The auctioneer reserves the right to cancel or modify the auction at any time. All bids are binding and cannot be withdrawn once placed."
  },
  {
    "type": "FORM_STEP",
    "name": "Product Details",
    "description": "Provide additional product information",
    "order": 2,
    "phase": "PRE_AUCTION",
    "typeId": "$MANAGED_TYPE_ID"
  },
  {
    "type": "BANK_DETAIL_FORM_STEP",
    "name": "Bank Details",
    "description": "Provide bank details for refund purposes",
    "order": 3,
    "phase": "PRE_AUCTION"
  },
  {
    "type": "PAYMENT_STEP",
    "name": "Security Deposit",
    "description": "Pay security deposit to participate in auction",
    "order": 4,
    "phase": "PRE_AUCTION",
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
EOF
}

get_workflow_minimal() {
  cat <<EOF
[
  {
    "type": "TNC_FORM_STEP",
    "name": "Terms & Conditions",
    "description": "Accept terms and conditions to participate",
    "order": 1,
    "tncText": "By participating in this auction, you agree to abide by all rules and regulations."
  },
  {
    "type": "BANK_DETAIL_FORM_STEP",
    "name": "Bank Details",
    "description": "Provide bank details for refund purposes",
    "order": 2,
    "phase": "PRE_AUCTION"
  }
]
EOF
}

get_workflow_premium() {
  cat <<EOF
[
  {
    "type": "TNC_FORM_STEP",
    "name": "Terms & Conditions",
    "description": "Accept terms and conditions to participate",
    "order": 1,
    "tncText": "By participating in this auction, you agree to abide by all rules and regulations. The auctioneer reserves the right to cancel or modify the auction at any time. All bids are binding and cannot be withdrawn once placed. Late payments may result in disqualification."
  },
  {
    "type": "FORM_STEP",
    "name": "Product Details",
    "description": "Provide additional product information",
    "order": 2,
    "phase": "PRE_AUCTION",
    "typeId": "$MANAGED_TYPE_ID"
  },
  {
    "type": "BANK_DETAIL_FORM_STEP",
    "name": "Bank Details",
    "description": "Provide bank details for refund purposes",
    "order": 3,
    "phase": "PRE_AUCTION"
  },
  {
    "type": "PAYMENT_STEP",
    "name": "Security Deposit",
    "description": "Pay security deposit to participate in auction",
    "order": 4,
    "phase": "PRE_AUCTION",
    "mode": "ONLINE",
    "offset": "PT2H",
    "heads": [
      {
        "name": "Security Deposit",
        "description": "Refundable security deposit required to participate",
        "value": 10000,
        "basis": "AMOUNT_BASED",
        "refundable": true
      },
      {
        "name": "Platform Fee",
        "description": "Non-refundable platform convenience fee",
        "value": 3.0,
        "basis": "PERCENTAGE_BASED",
        "refundable": false
      }
    ]
  }
]
EOF
}

# ─── Apply to Auction ────────────────────────────────────────────────────────
apply_policies() {
  local auction_id="$1"
  local policies

  case "$PRESET" in
    minimal)  policies=$(get_workflow_minimal) ;;
    premium)  policies=$(get_policies_premium) ;;
    *)        policies=$(get_policies_standard) ;;
  esac

  info "  Setting policies ($PRESET preset) …"
  local resp http_code
  resp=$(http_post "$API/auctions/$auction_id/policies" "$policies")
  parse_response "$resp"

  if [ "$LAST_HTTP_CODE" -ge 200 ] 2>/dev/null && [ "$LAST_HTTP_CODE" -lt 300 ] 2>/dev/null; then
    ok "  Policies set"
  else
    warn "  Failed to set policies (HTTP $LAST_HTTP_CODE)"
    warn "  $LAST_BODY"
  fi
}

apply_workflow() {
  local auction_id="$1"
  local workflow

  case "$PRESET" in
    minimal)  workflow=$(get_workflow_minimal) ;;
    premium)  workflow=$(get_workflow_premium) ;;
    *)        workflow=$(get_workflow_standard) ;;
  esac

  info "  Setting workflow ($PRESET preset) …"
  local resp http_code
  resp=$(http_post "$API/auctions/$auction_id/workflow" "$workflow")
  parse_response "$resp"

  if [ "$LAST_HTTP_CODE" -ge 200 ] 2>/dev/null && [ "$LAST_HTTP_CODE" -lt 300 ] 2>/dev/null; then
    ok "  Workflow set"
  else
    warn "  Failed to set workflow (HTTP $LAST_HTTP_CODE)"
    warn "  $LAST_BODY"
  fi
}

# ─── Main ─────────────────────────────────────────────────────────────────────
main() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║       Oxneer Policies & Workflow Configurator              ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""

  check_health
  ensure_managed_type
  echo ""

  if [ -n "$AUCTION_ID" ]; then
    # Single auction mode
    info "Applying to auction $AUCTION_ID (preset: $PRESET) …"
    apply_policies "$AUCTION_ID"
    apply_workflow "$AUCTION_ID"
  else
    # All auctions mode
    info "Fetching all auctions …"
    local auctions_resp
    auctions_resp=$(curl -sf "$API/auctions" 2>/dev/null || echo '{"content":[]}')

    local auction_ids
    auction_ids=$(echo "$auctions_resp" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"id"[[:space:]]*:[[:space:]]*"//;s/"$//' | grep -o '[0-9a-f-]\{8,\}')

    if [ -z "$auction_ids" ]; then
      warn "No auctions found."
      return
    fi

    local count=0
    for id in $auction_ids; do
      echo ""
      info "Processing auction $id …"
      apply_policies "$id"
      apply_workflow "$id"
      count=$((count + 1))
    done

    echo ""
    echo "══════════════════════════════════════════════════════════════"
    echo "  Done! Configured $count auction(s) with preset: $PRESET"
    echo "══════════════════════════════════════════════════════════════"
  fi
  echo ""
}

main "$@"
