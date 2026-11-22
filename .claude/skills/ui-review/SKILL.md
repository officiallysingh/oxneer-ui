---
name: ui-review
description: Use when reviewing, polishing or making consistent an existing Oxneer screen or component ("review this page", "make it look professional", "fix inconsistency", "polish the X screen").
---

# Oxneer UI review and polish

Read `DESIGN.md` first. Compare the target against it and against the reference screen `apps/web/src/app/(admin)/admin/users/`. Fix the deviations, keeping behavior and copy unless they break a rule below.

## Pass 1: tokens (mechanical)

Run `node .claude/hooks/check-ui-rules.js <target-dir>` and fix each line it reports (raw palette classes, hex and rgb colors, template-string `className`, `react-icons` imports). Brand logos are the only exception. Map raw colors to `muted`, `destructive`, `success`, `warning`, `info` or `primary`.

Then grep the target for `<button`, `<input`, `<select` and `<textarea`, and replace hand-rolled controls with `@repo/ui` primitives.

## Pass 2: structure

- `PageHeader` used, with one primary (gold) action at most.
- Sections stack with `space-y-4`, there are no cards nested in cards, and card internals use `divide-y`.
- Type follows the DESIGN.md scale (page title, labels `text-xs text-muted-foreground`, body `text-sm`), with `tabular-nums` on numbers.
- Status is shown with `Pill` via a status-to-tone map, never with ad-hoc colored text.
- Spacing and alignment: consistent gaps, aligned baselines, and right-aligned numeric columns.

## Pass 3: states and resilience

Loading skeleton, empty (filtered vs. none), error, busy buttons, long text (truncate + title / tooltip), zero, one and many items, and very long names and numbers.

## Pass 4: responsive and a11y

- At `< md`: cards, filters in a sheet, no horizontal scroll.
- Focus ring visible, `aria-label` on icon buttons, `sr-only` titles on Sheet/Dialog, contrast of at least 4.5:1, and no white on gold.
- Dark (default) and light theme both checked.

## Verify

Run `npm run typecheck` and `npm run lint`. Use the `run-web` skill to screenshot desktop (1440) and mobile (390) in both themes, fix everything one look reveals, then check again once.

Report what changed, grouped by pass, and list anything deliberately left alone.
