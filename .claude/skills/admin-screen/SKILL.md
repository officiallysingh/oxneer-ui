---
name: admin-screen
description: Use when building a new admin screen or feature in apps/web/src/app/(admin)/admin (list page, detail/view page, create/edit form, or details sheet). Encodes the Oxneer admin feature recipe based on the users screen.
---

# Building an Oxneer admin screen

Read `DESIGN.md` (sections 6–8) first. The reference implementation is `apps/web/src/app/(admin)/admin/users/`. Open its files and mirror them; don't invent new patterns.

## 1. Scaffold the feature folder

```
app/(admin)/admin/<feature>/
  page.tsx                      list page
  new/page.tsx                  create form
  [id]/edit/page.tsx            edit form
  [id]/view/page.tsx            detail page (optional if a Sheet is enough)
  _components/
    <feature>Columns.tsx        buildXColumns(handlers): TanStack ColumnDef[]
    <Feature>ListStates.tsx     XListSkeleton + XEmptyState({ filtered, onClearFilters })
    <Feature>ActionsMenu.tsx    DropdownMenu of row actions + XRowHandlers type
    <Feature>Card.tsx           mobile card (renderMobileCard)
    <Feature>StatusBadge.tsx    status → Pill tone map
    <Feature>DetailsSheet.tsx   right Sheet, opened by row click
    Delete<Feature>Dialog.tsx
    <Feature>FilterBar.tsx      (+ MobileFiltersSheet if it has more than 2 filters)
  _hooks/
    use<Feature>List.ts         server pagination/sorting, data, error, refresh
    use<Feature>Filters.ts      URL-synced filters + viewId
    use<Feature>Actions.ts      mutations, busyIds, toasts
  _lib/                         pure helpers: filters, display, export
```

Add the route to `apps/web/src/components/admin/nav-config.ts`.

## 2. List page composition (in this order)

`PageHeader` → status tabs (if the entity has states) → filter bar → `ActiveFilterChips` → `ErrorAlert` → bulk bar (if multi-select) → `DataTable` → details sheet → delete dialog. Keep `page.tsx` thin: hooks plus composition, and no fetch logic inline.

`DataTable` must receive `loadingState`, `emptyState`, `renderMobileCard`, `mobileFooter`, `itemLabel`, and use `manualSorting` / `manualPagination` for server data.

## 3. Rules

- Primitives come from `@repo/ui`. Admin building blocks come from `@/components/common/admin/*`. Check that folder before writing any new component.
- Use semantic color tokens only (`text-muted-foreground`, `bg-success/10`, …). No `blue-500` or hex.
- Use `cn()` for conditional classes.
- Give icon-only buttons `aria-label` and wrap them in `<Tip>`.
- Async buttons show `Loader2 animate-spin`, are disabled while busy, and report results with `toast.success` / `toast.error(getApiErrorMessage(err, '…'))`.
- Destructive actions use `ConfirmDialog`, or `TypeToConfirmDialog` when they are irreversible.
- Gate actions by permission the same way users/roles do.
- Write copy in sentence case, with verb + noun buttons.

## 4. Forms

`FormSection` blocks (`space-y-6`), with fields in `grid gap-4 md:grid-cols-2` using `FormField` / `LabelWithTip`. Show inline errors via `useFieldErrors`, `FormErrorSummary` on submit failure, and put Cancel + `SaveButton` in a `StickyActionBar`. Edit and new share one form component (see `users/_components/user-form`).

## 5. Done checklist

- [ ] Loading skeleton, empty (filtered vs. none), error states
- [ ] Mobile: cards, filters in a sheet, primary action in the footer
- [ ] Dark and light both look right
- [ ] Keyboard: tab order, focus ring, Esc closes sheets and dialogs
- [ ] `npm run typecheck` and `npm run lint` pass
- [ ] If the dev server is running, screenshot the page at desktop and mobile width and fix what you see
