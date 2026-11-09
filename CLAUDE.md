# Oxneer

Auction platform. Turborepo monorepo with npm workspaces.

- `apps/web`: Next.js 16 App Router, React 19. Route groups: `(admin)/admin/*` (back office), `(main)/*` (public auctions, profile), `(auth)/*`.
- `packages/ui` (`@repo/ui`): shadcn/ui (new-york) primitives, design tokens (`src/globals.css`), Tailwind preset (`tailwind.config.ts`).
- `packages/api` (`@repo/api`): API client and view models (`UserDetailVM`, …), `getApiErrorMessage`.
- `packages/store`: zustand stores (the app also has `apps/web/src/store`).

## Commands (run from repo root)

- `npm run dev` starts the web app on port 3000
- `npm run typecheck` / `npm run lint` / `npm run test` (Turbo)
- `npm run e2e -w web` runs Playwright (`apps/web/e2e`)
- `npx jest <path>` from `apps/web` runs one test file
- `node .claude/hooks/check-ui-rules.js <file-or-dir>` audits `.tsx` files against the mechanical UI rules
- Format with prettier. A hook formats files as Claude edits them, and lint-staged runs eslint and prettier on commit.

The API runs at `http://localhost:8090`. Run `npm run typecheck` and `npm run lint` before you call UI work done.

## UI rules (read DESIGN.md before building or changing any screen)

- **Design system:** `DESIGN.md` is the source of truth for color, type, spacing, components and page patterns.
- **Primitives:** import from `@repo/ui` (`Button`, `Dialog`, `Sheet`, `Select`, `toast`, `cn`, …). Never create a one-off button, input, dialog or card in `apps/web`. If a primitive is missing, add it to `packages/ui/src/components` and export it from `packages/ui/src/index.ts`.
- **Admin building blocks:** reuse `apps/web/src/components/common/admin/*` (`PageHeader`, `SectionCard`, `DetailRow`, `Pill`, `ListState`, `ErrorAlert`, `ConfirmDialog`, `TypeToConfirmDialog`, `FormField`, `FormSection`, `StickyActionBar`, `FacetFilter`, `SearchInput`, `Tip`, `SaveButton`, …) and `components/common/data-table` (`DataTable`).
- **Colors:** use semantic token classes only (`bg-background`, `text-muted-foreground`, `bg-primary`, `text-success`, `bg-warning/15`, …). No raw palette classes (`bg-blue-500`, `text-gray-400`) and no hex values in TSX.
- **Icons:** `lucide-react` only, and don't add new `react-icons` usages.
- **Theme:** the app ships dark by default (`<html className="dark">`). Every screen must work in both dark and light.
- **Tailwind:** v3 in `apps/web` (write v3 syntax, even though the root and `packages/ui` declare v4), a JS config with the `@repo/ui` preset and `@tailwind` directives. Extend tokens in `packages/ui/tailwind.config.ts` and `packages/ui/src/globals.css`, not in feature code.
- **Class merging:** use `cn()` from `@repo/ui`, not template-string concatenation, for conditional classes.

## Feature folder convention (admin)

```
app/(admin)/admin/<feature>/
  page.tsx            list page (thin: composes hooks + components)
  new/ [id]/edit/ [id]/view/
  _components/        <feature>Columns.tsx, <Feature>ListStates.tsx, <Feature>ActionsMenu.tsx, dialogs, sheets
  _hooks/             use<Feature>List, use<Feature>Filters, use<Feature>Actions
  _lib/               pure helpers (filters, display, export)
```

Reference implementation: `app/(admin)/admin/users/`. Copy its structure and patterns for new list/detail screens.

## Every screen must have

Loading (skeleton matching the final layout), empty (with or without filters), error (`ErrorAlert` / `toast.error(getApiErrorMessage(...))`), a mobile layout (cards instead of table rows at `< md`), keyboard and focus states, and `aria-label` on icon-only buttons.

## Project skills

- `.claude/skills/admin-screen`: recipe for building a new admin list/detail/form screen.
- `.claude/skills/ui-review`: checklist for reviewing and polishing an existing screen against DESIGN.md.
- `.claude/skills/run-web`: start the app, get past login, and view a page at each size and theme.

For Oxneer screens these come before general design skills (`impeccable`, `frontend-design`), which are for new visual direction on public or marketing surfaces.

## Reference docs (read when the task touches them)

- `AUCTION_CREATION_FLOW.md`: auction wizard steps, lifecycle and participant journey.
- `ATTRIBUTE_PROTOCOL.md`: component properties and the `ui:` / `form:` / `list:` namespaces. It's about 1,000 lines, so grep its headings and read only the section you need.
