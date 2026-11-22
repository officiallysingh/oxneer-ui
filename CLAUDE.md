# Oxneer

Auction platform. Zustand stores live in `apps/web/src/store`.

## Commands (run from repo root)

- `npm run e2e -w @oxneer/web` runs Playwright (`apps/web/e2e`)
- `npx jest <path>` from `apps/web` runs one test file
- `node .claude/hooks/check-ui-rules.js <file-or-dir>` audits `.tsx` files against the mechanical UI rules
- Format with prettier. A hook formats files as Claude edits them, and lint-staged runs eslint and prettier on commit.

Run `npm run typecheck` and `npm run lint` before you call UI work done.

## UI rules (read DESIGN.md before building or changing any screen)

- **Design system:** `DESIGN.md` is the source of truth for color, type, spacing, components and page patterns.
- **Primitives:** import from `@oxneer/ui` (`Button`, `Dialog`, `Sheet`, `Select`, `toast`, `cn`, …). Never create a one-off button, input, dialog or card in `apps/web`. If a primitive is missing, add it to `packages/ui/src/components` and export it from `packages/ui/src/index.ts`.
- **Admin building blocks:** reuse `apps/web/src/components/common/admin/*` (`PageHeader`, `SectionCard`, `DetailRow`, `Pill`, `ListState`, `ErrorAlert`, `ConfirmDialog`, `TypeToConfirmDialog`, `FormField`, `FormSection`, `StickyActionBar`, `FacetFilter`, `SearchInput`, `Tip`, `SaveButton`, …) and `components/common/data-table` (`DataTable`).
- **Colors:** use semantic token classes only (`bg-background`, `text-muted-foreground`, `bg-primary`, `text-success`, `bg-warning/15`, …). No raw palette classes (`bg-blue-500`, `text-gray-400`) and no hex values in TSX.
- **Icons:** `lucide-react` only, and don't add new `react-icons` usages.
- **Theme:** the app ships dark by default (`<html className="dark">`). Every screen must work in both dark and light.
- **Tailwind:** v4, CSS-first (no `tailwind.config`). Tokens are full `hsl()` values in `:root`/`.dark` and are mapped to utilities in the `@theme inline` block of `packages/ui/src/globals.css`; add or change tokens there, not in feature code. Use v4 syntax: `outline-hidden`, `shadow-xs`, `w-(--var)` for CSS variables. Animations come from `tw-animate-css`. In inline styles use `var(--primary)`, or `color-mix(in oklab, var(--primary) 20%, transparent)` for transparency (not `hsl(var(--x))`).
- **Class merging:** use `cn()` from `@oxneer/ui`, not template-string concatenation, for conditional classes.

## Code conventions

- **Write for the human reader.** Use descriptive names, small single-purpose functions and components, early returns instead of deep nesting, and no clever one-liners. Add a short comment only where the _why_ isn't obvious from the code, for example a legacy mapping or a backend quirk.
- **DRY.** Before writing a helper, hook or component, search the feature, `components/common` and `@oxneer/ui` for an existing one. If the same logic shows up a second time, extract it: within one feature into its `_lib`/`_hooks`, across features into `components/common` or a package. Don't copy-paste and then tweak.
- **Pages stay thin.** A `page.tsx` reads route params, calls hooks, picks the loading/error/content state and composes components. Data fetching, state machines and transformations don't live in pages or in presentational components.

## Feature folder convention (admin)

Split each feature by responsibility, as in `app/(admin)/admin/auctions/`:

```
app/(admin)/admin/<feature>/
  page.tsx, new/, [id]/edit/, [id]/view/   thin route files
  _components/   presentational UI; group a large flow into subfolders by area (e.g. wizard/steps, wizard/shell, wizard/review)
  _context/      React context providers + their use<X>() hooks for state shared across a component tree; re-export from _context/index.ts
  _hooks/        data fetching, API calls, form/controller and persistence logic (use<Feature>List, use<Feature>Actions, …)
  _lib/          pure, framework-free helpers (mapping, validation, filters, display, export); unit tests in _lib/**/__tests__
```

- Use a context only when several nested components share the same state. Otherwise pass props.
- Each context file throws a clear error from its hook when it's used outside its provider.
- When a hook grows past about 200–300 lines, split it by concern, the way `useWizardPersistence` is separated from `useAuctionWizardController`.
- For simple list/detail screens, `app/(admin)/admin/users/` is the reference implementation.

## Every screen must have

Loading (skeleton matching the final layout), empty (with or without filters), error (`ErrorAlert` / `toast.error(getApiErrorMessage(...))`), a mobile layout (cards instead of table rows at `< md`), keyboard and focus states, and `aria-label` on icon-only buttons.

## Project skills

For Oxneer screens the project skills (`admin-screen`, `ui-review`, `run-web`) come before the general design skill (`impeccable`), which is for new visual direction on public or marketing surfaces.

## Reference docs (read when the task touches them)

- `AUCTION_CREATION_FLOW.md`: auction wizard steps, lifecycle and participant journey.
- `ATTRIBUTE_PROTOCOL.md`: component properties and the `ui:` / `form:` / `list:` namespaces. It's about 1,000 lines, so grep its headings and read only the section you need.
