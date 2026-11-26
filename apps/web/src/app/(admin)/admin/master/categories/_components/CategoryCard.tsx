'use client';

import Link from 'next/link';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import type { CategoryVM, SubCategoryVM } from '@oxneer/api';
import { Button } from '@oxneer/ui';
import Tip from '@/components/common/admin/Tip';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { NestedState } from '@/components/common/master';

interface CategoryCardProps {
  category: CategoryVM;
  expanded: boolean;
  loadingSubs: boolean;
  /** `undefined` until the card has been opened once. */
  subCategories?: SubCategoryVM[];
  onToggle: () => void;
  onDelete: () => void;
  onDeleteSubCategory: (sub: SubCategoryVM) => void;
}

function SubCategoryChips({
  subCategories,
  onDelete,
}: {
  subCategories: SubCategoryVM[];
  onDelete: (sub: SubCategoryVM) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {subCategories.map((sub) => (
        <div
          key={sub.id}
          className="group flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs"
        >
          {sub.icon && <CategoryIcon value={sub.icon} size={14} />}
          <span className="text-foreground font-medium">{sub.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onDelete(sub)}
            className="ml-0.5 h-5 w-5 text-muted-foreground hover:text-destructive"
            aria-label={`Delete ${sub.name}`}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}

export function CategoryCard({
  category,
  expanded,
  loadingSubs,
  subCategories,
  onToggle,
  onDelete,
  onDeleteSubCategory,
}: CategoryCardProps) {
  const ToggleIcon = expanded ? ChevronUp : ChevronDown;
  const countSuffix = subCategories ? ` (${subCategories.length})` : '';
  const newSubHref = `/admin/master/categories/${category.id}/subcategories/new`;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col transition-shadow hover:shadow-admin-md">
      <div className="p-4 flex items-start gap-3">
        <div className="shrink-0 h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl">
          <CategoryIcon value={category.icon} size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate" title={category.name}>
            {category.name}
          </h3>
          {category.code && (
            <span className="font-mono text-xs text-muted-foreground">{category.code}</span>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Tip label="Edit category">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <Link
                href={`/admin/master/categories/${category.id}/edit`}
                aria-label="Edit category"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </Tip>
          <Tip label="Delete category">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete}
              aria-label="Delete category"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </Tip>
        </div>
      </div>

      <div className="mt-auto border-t border-border px-4 py-2.5 flex items-center justify-between bg-muted/20">
        <Button
          type="button"
          variant="ghost"
          onClick={onToggle}
          aria-expanded={expanded}
          className="h-auto gap-1.5 p-0 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
        >
          <ToggleIcon className="h-3.5 w-3.5" />
          {expanded ? 'Hide' : 'Show'} sub-categories{countSuffix}
        </Button>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1"
        >
          <Link href={newSubHref}>
            <Plus className="h-3 w-3" />
            Add sub
          </Link>
        </Button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-3 border-t border-border bg-muted/10">
          <NestedState loading={loadingSubs} isEmpty={!subCategories?.length} noun="sub-categories">
            <SubCategoryChips subCategories={subCategories ?? []} onDelete={onDeleteSubCategory} />
          </NestedState>
        </div>
      )}
    </div>
  );
}
