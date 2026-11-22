'use client';

import { ArrowRight } from 'lucide-react';
import { Button, Input, Label } from '@oxneer/ui';
import { TagInput } from '@/components/common/admin/TagInput';
import { GroupedSubcategorySelect } from '@/components/common/admin/GroupedSubcategorySelect';
import type { CategoryVM } from '@oxneer/api';

export interface ListingDetails {
  name: string;
  description: string;
  categoryId: string;
  subCategory: string;
  tags: string[];
  quantity: number;
}

interface Step1Props {
  values: ListingDetails;
  onChange: (patch: Partial<ListingDetails>) => void;
  categories: CategoryVM[];
  fieldErrors: Record<string, string>;
  onNext: (e: React.FormEvent) => void;
  onCancel: () => void;
  onSkip?: () => void;
  nextLabel?: string;
}

export function Step1Details({
  values,
  onChange,
  categories,
  fieldErrors,
  onNext,
  onCancel,
  onSkip,
  nextLabel = 'Save & Continue',
}: Step1Props) {
  const selectedCategory = categories.find((c) => c.id === values.categoryId);

  return (
    <form onSubmit={onNext} className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Listing details</h3>

        <div className="space-y-1.5">
          <Label htmlFor="ls-name" className={fieldErrors.name ? 'text-destructive' : ''}>
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ls-name"
            value={values.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="iPhone 14 Pro"
            autoComplete="off"
            className={fieldErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
          {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ls-desc">
            Description <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <textarea
            id="ls-desc"
            value={values.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Describe the listing..."
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ls-cat">
              Category <span className="text-destructive">*</span>
            </Label>
            <select
              id="ls-cat"
              value={values.categoryId}
              onChange={(e) => onChange({ categoryId: e.target.value, subCategory: '' })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon ? `${c.icon} ` : ''}
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className={fieldErrors.subCategory ? 'text-destructive' : ''}>
              Sub-category <span className="text-destructive">*</span>
            </Label>
            <GroupedSubcategorySelect
              categories={selectedCategory ? [selectedCategory] : categories}
              value={values.subCategory}
              onChange={(id) => onChange({ subCategory: id })}
              placeholder={values.categoryId ? 'Select sub-category...' : 'Select sub-category...'}
              noOptionsMessage="No sub-categories found"
            />
            {fieldErrors.subCategory && (
              <p className="text-xs text-destructive">{fieldErrors.subCategory}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>
            Tags <span className="text-muted-foreground font-normal">(optional, max 3)</span>
          </Label>
          <TagInput value={values.tags} onChange={(tags) => onChange({ tags })} max={3} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ls-qty">
            Quantity <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="ls-qty"
            type="number"
            min={0}
            value={values.quantity}
            onChange={(e) => onChange({ quantity: parseInt(e.target.value) || 0 })}
            placeholder="0"
            className="w-40"
          />
        </div>
      </div>

      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {onSkip ? (
          <Button type="button" variant="ghost" onClick={onSkip} className="gap-2">
            Skip <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="submit" className="gap-2">
            {nextLabel} <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  );
}
