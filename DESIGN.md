# Oxneer Design System

Oxneer is an auction platform. The visual identity is **navy + gold on cream**: trustworthy and premium, but calm. The admin back office is in **Operate** mode, so scanability, density and consistency matter more than decoration. Brand shows in precise details (gold focus rings, the primary action, active nav) and not in large color fields.

Sources of truth:

- Tokens: `packages/ui/src/globals.css` (CSS vars, HSL channels)
- Tailwind mapping: `packages/ui/tailwind.config.ts`
- Primitives: `packages/ui/src/components/*` (shadcn new-york)
- Admin patterns: `apps/web/src/components/common/admin/*`
- Reference screen: `apps/web/src/app/(admin)/admin/users/page.tsx`

---

## 1. Color

All colors are HSL channel CSS variables, used as `hsl(var(--x))` and exposed as Tailwind classes. **Use semantic classes only.** No raw palette classes (`blue-500`, `gray-400`) and no hex in components.

| Token                        | Light                         | Dark                  | Use                                                          |
| ---------------------------- | ----------------------------- | --------------------- | ------------------------------------------------------------ |
| `background`                 | cream `40 25% 97%`            | `220 20% 7%`          | Page canvas                                                  |
| `foreground`                 | navy `220 20% 10%`            | `40 20% 92%`          | Primary text                                                 |
| `card` / `popover`           | white                         | `220 18% 10%` / `12%` | Surfaces: cards, sheets, menus                               |
| `primary`                    | gold `42 78% 45%`             | `42 78% 55%`          | The one main action per view, active state, focus ring       |
| `primary-foreground`         | navy                          | navy                  | Text on gold (white on gold fails contrast, so never use it) |
| `secondary`                  | `220 15% 92%`                 | `220 15% 16%`         | Secondary buttons, subtle fills                              |
| `muted` / `muted-foreground` | `220 14% 92%` / `220 10% 45%` | `14%` / `55%`         | Table header fills, help text, metadata                      |
| `border` / `input`           | `220 14% 86%`                 | `220 14% 18%`         | Dividers, field outlines                                     |
| `ring`                       | gold                          | gold                  | Focus rings                                                  |
| `destructive`                | `0 72% 51%`                   | same                  | Delete, disabled, errors                                     |
| `success`                    | emerald `160 60% 35%`         | `45%`                 | Active, verified, completed                                  |
| `warning`                    | `32 95% 44%`                  | `38 92% 55%`          | Locked, expiring, needs attention                            |
| `info`                       | `217 85% 50%`                 | `213 90% 62%`         | Neutral informational state, scheduled                       |
| `policy` / `policy-raise`    | `220 20% 10%` / `220 18% 19%` | `220 22% 15%` / `23%` | Dark policy cards (stay dark in both themes) and their tags  |
| `sidebar-*`                  |                               |                       | Admin sidebar only                                           |

Brand aliases (`gold`, `gold-light`, `gold-dark`, `navy`, `cream`, `emerald`, `ruby`) exist as CSS vars. Prefer the semantic token (`primary`, `success`, `destructive`) in components. Use brand aliases only for marketing or hero surfaces.

**Tinted status fills** follow one formula (see `Pill`): `bg-{tone}/10 text-{tone}`, with warning at `/15` for legibility. Hover fills on rows use `bg-muted/30`, and selected rows use `bg-primary/5` or `bg-muted/50`.

**Gold is scarce.** In admin, use it for at most one filled primary button per view, plus focus rings, active nav and small icon chips (`bg-primary/10 text-primary`). Don't use gold for status, and don't use gradients in admin.

Utilities `bg-gradient-gold`, `text-gradient-gold`, `shadow-gold` and `bg-gradient-card` are reserved for public and marketing surfaces (`(main)`, auth illustration).

## 2. Typography

- **Display:** Space Grotesk (`font-display`), applied automatically to `h1`–`h6`.
- **Body/UI:** Inter (`font-sans` / `font-body`).
- Use `tabular-nums` for money, counts, IDs, dates in tables, and timers.

| Role                 | Classes                                                                       |
| -------------------- | ----------------------------------------------------------------------------- |
| Page title           | `font-display text-2xl font-semibold`                                         |
| Section / card title | `text-sm font-bold tracking-tight` (SectionCard) or `text-base font-semibold` |
| Body                 | `text-sm` (admin default)                                                     |
| Label / metadata     | `text-xs font-medium text-muted-foreground`                                   |
| Pill / badge         | `text-xs font-semibold`                                                       |
| Large metric         | `font-display text-2xl–3xl font-semibold tabular-nums`                        |

Admin body text is `text-sm`. Don't use `text-base` for table cells or form help.

## 3. Spacing, radius, elevation

- Spacing is on the 4px Tailwind scale. Page sections stack with `space-y-4`, form sections with `space-y-6`, and inline controls use `gap-2`.
- Page header: `pb-6 border-b`. Card padding is `px-4 py-3`/`py-3.5`. Detail rows are `px-4 py-3`.
- Radius: `--radius` is `0.5rem`, giving `rounded-lg` (8px) on inputs and buttons, `rounded-md` / `rounded-sm` for nested items, `rounded-2xl` for section cards and large panels, and `rounded-full` for pills, avatars and dots.
- Elevation: admin surfaces use borders first, shadows second. `shadow-xs` at rest, then `hover:shadow-md` on interactive cards. Use `shadow-admin`, `shadow-admin-md` and `shadow-admin-lg` for popovers and floating bars. `shadow-card` and `shadow-gold` are for public pages.
- Don't nest cards inside cards. Inside a card, divide with `divide-y divide-border/40`.

## 4. Motion

- Durations are 150–200ms with `ease-out`. Use `transition-colors` for hovers and `transition-[width]` for sidebar collapse.
- Available animations: `animate-fade-in`, `animate-slide-in-from-top`/`-bottom`, `animate-shimmer` (skeletons), `animate-spin` (Loader2 / RefreshCw while busy), and accordion.
- `framer-motion` is available for list reordering and wizard step transitions only. No decorative motion in admin.
- Respect `prefers-reduced-motion` for anything beyond a fade.

## 5. Iconography

- `lucide-react` only, sized by context: `h-4 w-4` inline and in buttons (the shadcn Button sizes its svg automatically), `h-5 w-5` for loaders, and `h-10 w-10 opacity-30` for empty-state illustrations.
- Icon-only buttons are `size="icon"` with an `aria-label` and are wrapped in `<Tip label="…">`.
- Icon chip: `p-1.5 rounded-lg bg-primary/10 text-primary`.

## 6. Components (use these, don't recreate them)

### Primitives (`@repo/ui`)

Button (`default` = gold primary, `outline`, `secondary`, `ghost`, `destructive`, `link`; sizes `sm`/`default`/`lg`/`icon`), Input, Textarea, Select, Checkbox, Switch, RadioGroup, Tabs, Dialog, AlertDialog, Sheet, Drawer, Popover, DropdownMenu, Command, Tooltip, Badge, Avatar, Skeleton, Table, Pagination, Calendar/DatePicker, Sidebar, Sonner `toast`.

### Admin patterns (`apps/web/src/components/common/admin`)

| Need                 | Component                                                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page title + actions | `PageHeader`                                                                                                                                            |
| Status label         | `Pill` (`tone`: success / warning / destructive / info / muted / outline, `dot`) wrapped in a feature-specific `XStatusBadge` with a status-to-tone map |
| Detail panel         | `SectionCard` + `DetailRow`                                                                                                                             |
| Lists                | `DataTable` (TanStack) with `loadingState`, `emptyState`, `renderMobileCard`, `mobileFooter`                                                            |
| Empty / loading      | `EmptyState`, `LoadingBlock` (`ListState`), `PageLoading`                                                                                               |
| Errors               | `ErrorAlert` inline, `PageErrorBanner` page-level, `toast.error(getApiErrorMessage(err, '…'))`                                                          |
| Filters              | `FacetFilter`, `SearchInput` / `QuickSearchInput`, `SegmentedControl`, `RemovableChip`, `TabCount`                                                      |
| Forms                | `FormSection`, `FormField`, `LabelWithTip`, `ToggleField`, `SettingRow`, `FormErrorSummary`, `SaveButton`, `StickyActionBar`                            |
| Confirm              | `ConfirmDialog` / `useConfirmDialog`; `TypeToConfirmDialog` for irreversible deletes                                                                    |
| Row actions          | `RowActions` / a feature `XActionsMenu` (DropdownMenu)                                                                                                  |
| Misc                 | `Tip`, `UserAvatar`, `TagInput`, `TagList`, `MultiSelect`, `StepIndicator`, `ShortcutHint`                                                              |

## 7. Page patterns

### Admin list page (see `admin/users/page.tsx`)

```
PageHeader  [refresh icon (Tip)] [Export outline] [Primary "Add X" (hidden on mobile)]
StatusTabs  (counts via TabCount)
FilterBar   search + facets + "More filters" popover; MobileFiltersSheet at < md
ActiveFilterChips  (removable, "Clear all")
ErrorAlert  (if error)
BulkBar     (when rows selected)
DataTable   server sorting/pagination, row click opens DetailsSheet
            loadingState = feature skeleton, emptyState = filtered vs. truly empty
            renderMobileCard = XCard, mobileFooter = sticky add + pager
DetailsSheet (right Sheet, URL-synced viewId)
Delete dialog
```

- Selection resets when filters, page or sort change.
- Long-running actions show `Loader2 animate-spin` in the button and disable it. Report the result with `toast.success` / `toast.error`.

### Detail / view page

A header with name, status badge and actions, then a grid of `SectionCard`s (`grid gap-4 lg:grid-cols-2`) built from `DetailRow`s. Money and dates use `format.ts` helpers.

### Create / edit form

`FormSection`s stacked with `space-y-6`, two-column fields at `md` (`grid gap-4 md:grid-cols-2`), inline field errors via `useFieldErrors`, `FormErrorSummary` at the top on submit failure, and a `StickyActionBar` holding Cancel (outline) and Save (primary `SaveButton`). Mark unsaved changes with `ChangedDot`.

### Wizard (auction / listing creation)

`StepIndicator` at the top, one concern per step, Back/Next in a sticky bar, and validation per step.

## 8. States checklist (every screen)

- **Loading:** a skeleton shaped like the real content (not a lone spinner for lists).
- **Empty:** distinguish "no data yet" (offer the primary CTA) from "no results for filters" (offer "Clear filters").
- **Error:** an inline `ErrorAlert` with retry for lists, or a toast for actions. Use human copy, never a raw error.
- **Disabled and busy:** buttons disable during requests, and icon buttons spin.
- **Mobile (< md):** the table becomes cards, filters move to a Sheet, and the primary action moves to the sticky footer.
- **Accessibility:** visible focus ring (gold), `aria-label` on icon buttons, `sr-only` titles on Sheets/Dialogs, and contrast of at least 4.5:1 (never white text on gold).
- **Theme:** check dark (the default) and light.

## 9. Copy

- Sentence case everywhere ("Add user", not "Add User").
- Buttons are verb + noun. Destructive confirmations name the object ("Delete user Jane Doe?").
- Toasts are short and past tense ("Exported 24 users"). Errors say what to do next ("Export failed. Please try again.").
- Use the `plural()` helper for counts.

## 10. Known debt (don't copy)

Some older files use raw palette classes (`bg-blue-500`, `text-amber-400`, `bg-orange-500`, …) or hex values (`listings/_components/Step3Catalog.tsx`, `auctions/_components/wizard/ParticipantCustomForm.tsx`). When you touch them, move them to `info` / `warning` / `success` tokens. Brand hex in `GoogleSignInButton` is intentional.
