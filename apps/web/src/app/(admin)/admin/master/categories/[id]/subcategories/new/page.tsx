'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { masterApi } from '@oxneer/api';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button, Input, Label } from '@oxneer/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import EmojiPicker from '@/components/common/EmojiPicker';
import { parseApiError } from '@/lib/api-errors';
import { resolvesExists } from '@/lib/exists-check';

export default function NewSubCategoryPage() {
  const { id: categoryId } = useParams<{ id: string }>();
  const router = useRouter();

  const [categoryName, setCategoryName] = useState('');
  const [form, setForm] = useState({ name: '', icon: '' });
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    masterApi
      .getCategoryById(categoryId)
      .then((c) => setCategoryName(c.name))
      .catch(() => {});
  }, [categoryId]);

  const clearErr = (f: string) =>
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[f];
      return n;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (!form.name.trim()) {
      setFieldErrors({ name: 'Name is required.' });
      return;
    }
    setSaving(true);
    try {
      await masterApi.createSubCategory(categoryId, {
        name: form.name.trim(),
        icon: form.icon || undefined,
      });
      router.push('/admin/master/categories');
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to create sub-category.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add sub-category"
        description={categoryName ? `Under: ${categoryName}` : 'Loading...'}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin/master/categories')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="sc-name" className={fieldErrors.name ? 'text-destructive' : ''}>
              Name
            </Label>
            <Input
              id="sc-name"
              value={form.name}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, name: e.target.value }));
                clearErr('name');
              }}
              onBlur={async (e) => {
                const value = e.target.value.trim();
                if (!value) return;
                const taken = await resolvesExists(masterApi.checkSubCategoryNameExists(value));
                if (taken) setFieldErrors((p) => ({ ...p, name: 'This name is already in use.' }));
              }}
              placeholder="e.g. Mobile"
              autoComplete="off"
              className={
                fieldErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''
              }
            />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>
              Icon <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <EmojiPicker
              value={form.icon}
              onChange={(value) => setForm((prev) => ({ ...prev, icon: value }))}
              placeholder="Pick an icon for this sub-category"
            />
          </div>

          {error && <ErrorAlert message={error} />}

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Add sub-category'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/master/categories')}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
