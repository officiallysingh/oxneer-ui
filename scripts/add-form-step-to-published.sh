#!/usr/bin/env bash
set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────
BASE_URL="${OXNEER_BASE_URL:-http://localhost:8090}"
API="$BASE_URL/api/v1"
FORM_TYPE_ID="${FORM_TYPE_ID:-6aa1fc2273c02a0f0317aa51}"
FORM_STEP_NAME="${FORM_STEP_NAME:-Product Details}"
FORM_STEP_DESC="${FORM_STEP_DESC:-Provide additional product information}"

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

http_put() {
  local url="$1" data="$2"
  curl -s -w "\n%{http_code}" -X PUT "$url" \
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

# ─── Process a single auction ────────────────────────────────────────────────
process_auction() {
  local auction_id="$1"
  local idx="$2"
  local total="$3"

  info "[$idx/$total] Processing auction $auction_id …"

  # 1. Fetch full auction config
  local auction_json
  auction_json=$(curl -sf "$API/auctions/$auction_id" 2>/dev/null)
  if [ -z "$auction_json" ]; then
    warn "  Could not fetch auction $auction_id, skipping"
    return 1
  fi

  # 2. Fetch current workflow
  local workflow_json
  workflow_json=$(curl -sf "$API/auctions/$auction_id/workflow" 2>/dev/null || echo "[]")

  # Check if FORM_STEP already exists
  local has_form
  has_form=$(echo "$workflow_json" | node -e "
    let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
      const steps=JSON.parse(d);
      const has=steps.some(s=>{const t=typeof s.type==='object'?Object.keys(s.type)[0]:s.type;return t==='FORM_STEP';});
      console.log(has?'yes':'no');
    });")
  
  if [ "$has_form" = "yes" ]; then
    ok "  Already has FORM_STEP, skipping"
    return 0
  fi

  # 3. Build new workflow with FORM_STEP inserted at order 2
  local new_workflow
  new_workflow=$(echo "$workflow_json" | node -e "
    let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
      const steps=JSON.parse(d);
      // Re-number existing steps (shift order by 1)
      const updated = steps.map(s => ({...s, order: (s.order || 0) + 1}));
      // Insert FORM_STEP at order 2
      const formStep = {
        type: 'FORM_STEP',
        name: '$FORM_STEP_NAME',
        description: '$FORM_STEP_DESC',
        order: 2,
        phase: 'PRE_AUCTION',
        typeId: '$FORM_TYPE_ID'
      };
      const result = [updated[0], formStep, ...updated.slice(1)];
      console.log(JSON.stringify(result));
    });")

  # 4. Delete the auction
  info "  Deleting auction $auction_id …"
  local del_resp del_code
  del_resp=$(curl -s -w "\n%{http_code}" -X DELETE "$API/auctions/$auction_id")
  del_code=$(echo "$del_resp" | tail -1)
  if [ "$del_code" -lt 200 ] 2>/dev/null || [ "$del_code" -ge 300 ] 2>/dev/null; then
    warn "  Failed to delete auction (HTTP $del_code)"
    return 1
  fi
  ok "  Deleted"

  # 5. Extract fields for recreation
  local title desc ref_id accessibility direction dimension participant_visibility offer_visibility
  local currency precision rounding subcategories tags_json
  local start_time end_time

  title=$(echo "$auction_json" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const a=JSON.parse(d);console.log(JSON.stringify(a.title));})")
  desc=$(echo "$auction_json" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const a=JSON.parse(d);console.log(JSON.stringify(a.description||''));})")
  ref_id=$(echo "$auction_json" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const a=JSON.parse(d);console.log(JSON.stringify(a.referenceId||''));})")
  
  accessibility=$(echo "$auction_json" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const a=JSON.parse(d);const p=a.protocol||{};const ac=typeof p.accessibility==='object'?Object.keys(p.accessibility)[0]:(p.accessibility||'PUBLIC');console.log(ac);})")
  direction=$(echo "$auction_json" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const a=JSON.parse(d);const p=a.protocol||{};const d2=typeof p.direction==='object'?Object.keys(p.direction)[0]:(p.direction||'FORWARD');console.log(d2);})")
  dimension=$(echo "$auction_json" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const a=JSON.parse(d);const p=a.protocol||{};const d2=typeof p.dimension==='object'?Object.keys(p.dimension)[0]:(p.dimension||'ONE_DIMENSIONAL');console.log(d2);})")
  participant_visibility=$(echo "$auction_json" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const a=JSON.parse(d);const p=a.protocol||{};const v=typeof p.participantVisibility==='object'?Object.keys(p.participantVisibility)[0]:(p.participantVisibility||'ALIAS');console.log(v);})")
  offer_visibility=$(echo "$auction_json" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const a=JSON.parse(d);const p=a.protocol||{};const v=typeof p.offerVisibility==='object'?Object.keys(p.offerVisibility)[0]:(p.offerVisibility||'RANK');console.log(v);})")

  currency=$(echo "$auction_json" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const a=JSON.parse(d);console.log(a.monetaryOptions?.currencyUnit||'INR');})")
  precision=$(echo "$auction_json" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const a=JSON.parse(d);console.log(a.monetaryOptions?.precision||2);})")
  rounding=$(echo "$auction_json" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const a=JSON.parse(d);console.log(a.monetaryOptions?.roundingMode||'HALF_UP');})")

  subcategories=$(echo "$auction_json" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
    const a=JSON.parse(d);
    const subs=(a.subCategories||[]).map(s=>typeof s==='object'?s.id:s);
    console.log(JSON.stringify(subs));
  })")

  tags_json=$(echo "$auction_json" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
    const a=JSON.parse(d);
    console.log(JSON.stringify(a.tags||[]));
  })")

  # Get subcategory ID for unit creation
  local subcategory_id
  subcategory_id=$(echo "$subcategories" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const a=JSON.parse(d);console.log(a[0]||'');})")

  # Get opening price from units if available
  local units_json opening_price
  units_json=$(curl -sf "$API/auctions/$auction_id/units" 2>/dev/null || echo "[]")
  opening_price=$(echo "$units_json" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
    const a=JSON.parse(d);
    const u=a[0]||{};
    console.log(u.openingPrice||0);
  })" 2>/dev/null || echo "0")

  # Use a future start/end time (1 day from now)
  start_time=$(node -e "const d=new Date();d.setDate(d.getDate()+1);d.setHours(10,0,0,0);console.log(d.toISOString().replace('Z','+05:30'))")
  end_time=$(node -e "const d=new Date();d.setDate(d.getDate()+1);d.setHours(12,0,0,0);console.log(d.toISOString().replace('Z','+05:30'))")

  # 6. Create the auction
  info "  Creating auction: $title"
  local auction_payload
  auction_payload=$(cat <<EOFPAYLOAD
{
  "type": "OFFER_BASE_STEP_PRICED_ATOMIC_UNIT_AUCTION",
  "format": "SIMPLE",
  "protocol": {
    "accessibility": "$accessibility",
    "direction": "$direction",
    "dimension": "$dimension",
    "participantVisibility": "$participant_visibility",
    "offerVisibility": "$offer_visibility"
  },
  "title": $title,
  "description": $desc,
  "referenceId": $ref_id,
  "monetaryOptions": {
    "currencyUnit": "$currency",
    "precision": $precision,
    "roundingMode": "$rounding"
  },
  "tags": $tags_json,
  "subCategories": $subcategories,
  "unit": {
    "type": "SINGLE_UNIT",
    "openingPrice": $opening_price,
    "standingPrice": $opening_price
  }
}
EOFPAYLOAD
  )

  local create_resp create_code new_auction_id
  create_resp=$(http_post "$API/auctions" "$auction_payload")
  parse_response "$create_resp"
  create_code="$LAST_HTTP_CODE"

  if [ "$create_code" -lt 200 ] 2>/dev/null || [ "$create_code" -ge 300 ] 2>/dev/null; then
    warn "  Failed to create auction (HTTP $create_code)"
    warn "  $LAST_BODY"
    return 1
  fi
  new_auction_id=$(extract_id "$LAST_BODY")
  ok "  Created auction $new_auction_id"

  # 7. Set workflow (with FORM_STEP)
  info "  Setting workflow (with FORM_STEP) …"
  local wf_resp
  wf_resp=$(http_post "$API/auctions/$new_auction_id/workflow" "$new_workflow")
  parse_response "$wf_resp"
  if [ "$LAST_HTTP_CODE" -ge 200 ] 2>/dev/null && [ "$LAST_HTTP_CODE" -lt 300 ] 2>/dev/null; then
    ok "  Workflow set"
  else
    warn "  Failed to set workflow (HTTP $LAST_HTTP_CODE)"
    warn "  $LAST_BODY"
  fi

  # 8. Schedule and publish
  info "  Scheduling and publishing …"
  local sched_payload
  sched_payload=$(cat <<EOFSCHED
{
  "startTime": "$start_time",
  "endTime": "$end_time",
  "publish": true
}
EOFSCHED
  )
  local sched_resp
  sched_resp=$(http_put "$API/auctions/$new_auction_id/schedule" "$sched_payload")
  parse_response "$sched_resp"
  if [ "$LAST_HTTP_CODE" -ge 200 ] 2>/dev/null && [ "$LAST_HTTP_CODE" -lt 300 ] 2>/dev/null; then
    ok "  Scheduled & published"
  else
    warn "  Failed to schedule (HTTP $LAST_HTTP_CODE)"
    warn "  $LAST_BODY"
  fi

  echo "$new_auction_id"
  return 0
}

# ─── Main ─────────────────────────────────────────────────────────────────────
main() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║    Add FORM_STEP to Published Auctions (delete & recreate) ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "  Form type: $FORM_TYPE_ID ($FORM_STEP_NAME)"
  echo ""

  check_health
  echo ""

  # Fetch all auctions
  info "Fetching all published auctions …"
  local auctions_resp
  auctions_resp=$(curl -sf "$API/auctions" 2>/dev/null || echo '{"content":[]}')

  local auction_ids
  auction_ids=$(echo "$auctions_resp" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"id"[[:space:]]*:[[:space:]]*"//;s/"$//' | grep -o '[0-9a-f-]\{8,\}')

  if [ -z "$auction_ids" ]; then
    warn "No auctions found."
    return
  fi

  local count=0
  local total
  total=$(echo "$auction_ids" | wc -l | tr -d ' ')
  new_ids=()

  for id in $auction_ids; do
    count=$((count + 1))
    output=$(process_auction "$id" "$count" "$total" 2>&1)
    echo "$output"
    new_id=$(echo "$output" | tail -1)
    if [ -n "$new_id" ] && [ "$new_id" != "0" ]; then
      new_ids+=("$new_id")
    fi
    echo ""
  done

  echo ""
  echo "══════════════════════════════════════════════════════════════"
  echo "  Done! Recreated ${#new_ids[@]} auction(s) with FORM_STEP"
  echo ""
  echo "  New auction IDs:"
  for j in "${!new_ids[@]}"; do
    echo "    $((j+1)). ${new_ids[$j]}"
  done
  echo "══════════════════════════════════════════════════════════════"
  echo ""
}

main "$@"
