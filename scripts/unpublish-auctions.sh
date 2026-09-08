#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${OXNEER_BASE_URL:-http://localhost:8090}"
API="$BASE_URL/api/v1"

info()  { printf "\033[1;34m[INFO]\033[0m  %s\n" "$*"; }
ok()    { printf "\033[1;32m[OK]\033[0m    %s\n" "$*"; }
warn()  { printf "\033[1;33m[WARN]\033[0m  %s\n" "$*"; }
fail()  { printf "\033[1;31m[FAIL]\033[0m  %s\n" "$*"; exit 1; }

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

delete_auction() {
  local auction_id="$1"
  info "Deleting auction $auction_id …"

  local resp http_code body
  resp=$(curl -s -w "\n%{http_code}" -X DELETE "$API/auctions/$auction_id")
  http_code=$(echo "$resp" | tail -1)
  body=$(echo "$resp" | sed '$d')

  if [ "$http_code" -ge 200 ] 2>/dev/null && [ "$http_code" -lt 300 ] 2>/dev/null; then
    ok "  Deleted auction $auction_id"
  else
    warn "  Failed to delete auction $auction_id (HTTP $http_code)"
    warn "  Response: $body"
  fi
}

main() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║           Oxneer Auction Remover                           ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""

  check_health

  info "Fetching all auctions …"
  local auction_ids
  auction_ids=$(curl -sf "$API/auctions" 2>/dev/null | python3 -c "
import sys,json
d=json.load(sys.stdin)
for a in d.get('content', []):
    print(a['id'])
" 2>/dev/null || echo "")

  if [ -z "$auction_ids" ]; then
    warn "No auctions found."
    return
  fi

  local count=0
  for id in $auction_ids; do
    delete_auction "$id"
    count=$((count + 1))
  done

  echo ""
  echo "══════════════════════════════════════════════════════════════"
  echo "  Done! Deleted $count auction(s)."
  echo "══════════════════════════════════════════════════════════════"
  echo ""
}

main "$@"
