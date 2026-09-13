#!/usr/bin/env bash
set -euo pipefail

# ── Prerequisites ────────────────────────────────────────────────────────────
# Server running at http://localhost:8090
#
# Usage:
#   chmod +x scripts/create-custom-form.sh
#   ./scripts/create-custom-form.sh
#
# Override form name/description:
#   FORM_NAME="My Form" FORM_DESCRIPTION="Desc" ./scripts/create-custom-form.sh

BASE_URL="${BASE_URL:-http://localhost:8090}"
API="$BASE_URL/api/v1"
FORM_NAME="${FORM_NAME:-Product Details}"
FORM_DESCRIPTION="${FORM_DESCRIPTION:-Custom form for additional product information collected from participants}"
COOKIE_JAR="/tmp/oxneer-cookies.txt"
rm -f "$COOKIE_JAR"

# ── Helpers ──────────────────────────────────────────────────────────────────
info()  { printf "\033[1;34m[INFO]\033[0m  %s\n" "$*"; }
ok()    { printf "\033[1;32m[OK]\033[0m    %s\n" "$*"; }
fail()  { printf "\033[1;31m[FAIL]\033[0m  %s\n" "$*"; exit 1; }

extract_id() {
  echo "$1" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"id"[[:space:]]*:[[:space:]]*"//;s/"$//' | grep -o '[0-9a-f-]\{8,\}'
}

# ── Login ────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║            Oxneer Custom Form Generator                    ║"
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

# ── Create Custom Form ──────────────────────────────────────────────────────
info "Creating managed type (custom form): $FORM_NAME"

PAYLOAD=$(cat <<EOF
{
  "name": "$FORM_NAME",
  "description": "$FORM_DESCRIPTION",
  "type": "CUSTOM_FORM",
  "properties": [
    {
      "type": "SIMPLE_PROPERTY",
      "name": "name",
      "label": "Name",
      "dataType": "STRING",
      "validators": [{"type": "NOT_BLANK"}]
    },
    {
      "type": "SIMPLE_PROPERTY",
      "name": "description",
      "label": "Description",
      "dataType": "STRING"
    },
    {
      "type": "SIMPLE_PROPERTY",
      "name": "category",
      "label": "Category",
      "dataType": "STRING"
    }
  ]
}
EOF
)

RESULT=$(curl -s -X POST "$API/meta-data/managed-types" \
  -H 'Content-Type: application/json' \
  -b "$COOKIE_JAR" \
  -d "$PAYLOAD")

FORM_ID=$(extract_id "$RESULT")
if [ -n "$FORM_ID" ]; then
  ok "Created custom form: $FORM_ID"
  echo ""
  echo "══════════════════════════════════════════════════════════════"
  echo "  MANAGED_TYPE_ID=$FORM_ID"
  echo ""
  echo "  Use it with create-demo-auctions.sh:"
  echo "    MANAGED_TYPE_ID=$FORM_id LISTING_ID=<id> bash scripts/create-demo-auctions.sh"
  echo "══════════════════════════════════════════════════════════════"
  echo ""
else
  fail "Could not create custom form. Response: $RESULT"
fi
