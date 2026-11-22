'use client';

import React, { useState } from 'react';
import { masterApi, SubCategoryVM } from '@oxneer/api';
import { Loader2 } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@oxneer/ui';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import EmojiPicker from '@/components/common/EmojiPicker';
import { parseApiError } from '@/lib/api-errors';
import { resolvesExists } from '@/lib/exists-check';

interface SubCategoryFormDialogProps {
  categoryId: string | null;
  categoryName?: string;
  onClose: () => void;
  onCreated: (categoryId: string, subs: SubCategoryVM[]) => void;
}

interface SubCategoryFormValues {
  name: string;
  icon: string;
}

const EMPTY_SUBCATEGORY_FORM: SubCategoryFormValues = {
  name: '',
  icon: '',
};

export function SubCategoryFormDialog({
  categoryId,
  categoryName,
  onClose,
  onCreated,
}: SubCategoryFormDialogProps) {
  const [form, setForm] = useState<SubCategoryFormValues>(EMPTY_SUBCATEGORY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof SubCategoryFormValues>(
    key: K,
    value: SubCategoryFormValues[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const reset = () => {
    setForm(EMPTY_SUBCATEGORY_FORM);
    setFieldErrors({});
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) return;
    setError(null);
    setFieldErrors({});
    setSaving(true);
    try {
      await masterApi.createSubCategory(categoryId, {
        name: form.name.trim(),
        icon: form.icon || undefined,
      });
      const subs = await masterApi.getSubCategoriesByCategory(categoryId);
      reset();
      onCreated(categoryId, subs);
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to create sub-category.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!categoryId}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>Add sub-category</DialogTitle>
          <DialogDescription>
            Add a sub-category to{' '}
            <span className="font-medium text-foreground">{categoryName}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="sc-name" className={fieldErrors.name ? 'text-destructive' : ''}>
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sc-name"
              value={form.name}
              onChange={(e) => {
                setField('name', e.target.value);
                setFieldErrors((p) => {
                  const n = { ...p };
                  delete n.name;
                  return n;
                });
              }}
              onBlur={async (e) => {
                const value = e.target.value.trim();
                if (!value) return;
                const taken = await resolvesExists(masterApi.checkSubCategoryNameExists(value));
                if (taken) setFieldErrors((p) => ({ ...p, name: 'This name is already in use.' }));
              }}
              placeholder="Mobile"
              autoComplete="off"
              className={
                fieldErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''
              }
            />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>
          <div className="space-y-1">
            <Label>
              Icon <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <EmojiPicker
              value={form.icon}
              onChange={(value) => setField('icon', value)}
              placeholder="Pick an icon for this sub-category"
            />
          </div>
          {error && <ErrorAlert message={error} />}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Saving
                </>
              ) : (
                'Add'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
