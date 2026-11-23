import type { CategoryVM } from '@oxneer/api';
import type { CheckListOption } from '@/components/common/admin/SearchableCheckList';

/** Category facet options. */
export function categoryOptions(categories: CategoryVM[]): CheckListOption[] {
  return categories.map((c) => ({ value: c.id, label: c.name }));
}

/** Sub-category facet options, limited to the chosen categories (all when none chosen),
 *  each labelled with its category so same-named sub-categories stay distinguishable. */
export function subCategoryOptions(
  categories: CategoryVM[],
  selectedCategoryIds: string[],
): CheckListOption[] {
  const inScope = selectedCategoryIds.length
    ? categories.filter((c) => selectedCategoryIds.includes(c.id))
    : categories;
  return inScope.flatMap((c) =>
    (c.subCategories ?? []).map((s) => ({ value: s.id, label: s.name, sublabel: c.name })),
  );
}

/** Drops chosen sub-categories that no longer belong to the chosen categories. */
export function pruneSubCategories(
  categories: CategoryVM[],
  selectedCategoryIds: string[],
  subCategoryIds: string[],
): string[] {
  const allowed = new Set(subCategoryOptions(categories, selectedCategoryIds).map((o) => o.value));
  return subCategoryIds.filter((id) => allowed.has(id));
}
