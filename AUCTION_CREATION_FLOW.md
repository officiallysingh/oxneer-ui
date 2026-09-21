# Auction Creation Flow — Design

Design reference for the admin auction-creation wizard. Mockups: https://claude.ai/artifact/ML11CwR2EAmXfr8EFWickh

Status: design only, not yet fully implemented. Cross-check against `apps/web/src/app/(admin)/admin/auctions/new/` before building — some of this already exists there.

## Wizard steps

1. **Details** — `POST /api/v1/auctions` (creates the DRAFT)
   - Title, description, referenceId
   - Format: SIMPLE / MULTI_STAGE / MULTI_ROUND
   - Type: fixed to `OFFER_BASE_STEP_PRICED_ATOMIC_UNIT_AUCTION` for now (only one type exists; UI should still show it as a field for when more are added)
   - Protocol: accessibility (PUBLIC/PRIVATE), direction (FORWARD/REVERSE), dimension (ONE_DIMENSIONAL/MULTI_DIMENSIONAL), participantVisibility (PUBLIC/ALIAS), offerVisibility (FULL/PRICE/RANK)
   - Monetary options: currency, precision (1–3), rounding mode
   - Tags (≤15), sub-categories (1–15, required)

2. **Units & items** — `PUT /api/v1/auctions/{id}/units`
   - Unit type: SINGLE_UNIT / MULTI_UNIT / BUNDLE / LOT
   - Item(s): name, description, quantity — search existing listing or add new
   - Opening price

3. **Policies** — `POST /api/v1/auctions/{id}/policies` (+ `/add`, `/reorder`, sub-policy nesting)
   - Allowed policy types are fixed per auction Type (see `Auction.Type` → `Policy.Type` mapping in backend)
   - Grouped by phase: PARTICIPATION / AUCTION / CLEARING
   - Known types: MINIMUM_PARTICIPANTS_REQUIREMENT, PRICE_PROGRESSION (step/fixed-%/range-%/clock-based), EXTENSION, KTH_PRICE_WINNER_DETERMINATION, KTH_WINNER_PRICE_DETERMINATION, tie-breaking (random / earliest-offer / compete-another-round)
   - Each policy: enable toggle, summary, "Configure" opens detail drawer
   - Preview/evaluate endpoint available for a price-progression timeline

4. **Workflow** — `POST /api/v1/auctions/{id}/workflow` (+ `/add`, `/reorder`)
   - Pre-auction steps: T&C (mandatory, implicit, always first), Participation form, Bank details (implicit — auto-added when a refundable pre-payment policy head requires it)
   - Post-auction steps: Payment
   - Orderable step list, "Preview walkthrough" simulates the participant path
   - Step types: FORM_STEP, PARTICIPATION_FORM_STEP, PAYMENT_STEP, TNC_FORM_STEP, BANK_DETAIL_FORM_STEP

5. **Review & schedule** — `PUT /api/v1/auctions/{id}/schedule`
   - Read-only recap of steps 1–4 with edit links
   - Start time, end time (both required, must be future)
   - `publish` flag: publish immediately vs. leave as SCHEDULED
   - Readiness checklist before allowing submit
   - Note: schedule/publish are separate backend endpoints from the create/update calls used in steps 1–4 — keep this as its own step rather than merging into Details

6. **Invitations** — participant invite endpoints (`/{id}/participants*`)
   - Only shown when Accessibility = PRIVATE
   - Add by email/phone, bulk CSV
   - Invited list with status: INVITED / JOINED / APPROVED
   - Skippable — can invite later from the auction's Participants tab; auction stays SCHEDULED either way

## Auction lifecycle (status)

```
DRAFT → SCHEDULED → PUBLISHED → LIVE → COMPLETED → AWARDED
  \_______\_______\_______\___→ CANCELLED (admin action, any point before COMPLETED)
```

- `DRAFT` — created after step 1, mutated in place through step 5
- `SCHEDULED` — start/end time set via `/schedule`
- `PUBLISHED` — `PUT /{id}/publish` called (manually, or automatically if `publish: true` was set on schedule)
- `LIVE` — start time reached
- `COMPLETED` — end time reached / auction resolved
- `AWARDED` — winner-determination policies have run
- `CANCELLED` — `PUT /{id}/cancel`, reachable from Draft/Scheduled/Published/Live

## Participant journey (runs in parallel)

- **PRE_AUCTION** — discover (public browse) or accept invite (private) → complete workflow steps (T&C, participation form, bank details if required)
- **AUCTION** — bid while live; policies enforce minimum participants to start, price progression per round, time extensions on late offers
- **CLEARING / POST_AUCTION** — winner & tie-break policies resolve the outcome → payment step collects settlement

## Open questions for implementation

- Confirm how many of these 6 steps already exist in `apps/web/.../admin/auctions/new/_components/` (Details, Units, Policies, Workflow, Invitations components were found; a distinct "Review & schedule" step may need to be added/confirmed)
- Decide whether Schedule/Publish stays a wizard step or moves to the auction's edit/view page post-creation
- Confirm implicit-step logic (Bank Details) is surfaced clearly in the Workflow step UI, not just applied silently
