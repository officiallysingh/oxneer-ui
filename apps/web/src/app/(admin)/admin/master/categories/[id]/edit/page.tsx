'use client';

import { useEffect, useState } from 'react';
import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { masterApi } from '@oxneer/api';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button, Input, Label } from '@oxneer/ui';
import Link from 'next/link';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import EmojiPicker from '@/components/common/EmojiPicker';
import { parseApiError } from '@/lib/api-errors';
import { resolvesExists } from '@/lib/exists-check';

export default function EditCategoryPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  interface EditCategoryFormValues {
    name: string;
    icon: string;
  }

  const [form, setForm] = useState<EditCategoryFormValues>({ name: '', icon: '' });
  const originalRef = React.useRef<{ name: string; icon: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    masterApi
      .getCategoryById(id)
      .then((cat) => {
        originalRef.current = { name: cat.name, icon: cat.icon ?? '' };
        setForm({ name: cat.name, icon: cat.icon ?? '' });
      })
      .catch(() => setLoadError('Failed to load category.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const orig = originalRef.current;
    const patch: { name?: string; icon?: string } = {};
    if (!orig || form.name.trim() !== orig.name) patch.name = form.name.trim() || undefined;
    if (!orig || form.icon !== orig.icon) patch.icon = form.icon || undefined;
    if (orig && Object.keys(patch).length === 0) {
      router.push('/admin/master/categories');
      return;
    }
    setSaving(true);
    try {
      await masterApi.updateCategory(id, patch);
      router.push('/admin/master/categories');
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to update category.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit category"
        description="Update category details"
        actions={
          <Link href="/admin/master/categories">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
        }
      />

      <div className="rounded-xl border border-border bg-card p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : loadError ? (
          <ErrorAlert message={loadError} />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name" className={fieldErrors.name ? 'text-destructive' : ''}>
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, name: e.target.value }));
                  setFieldErrors((p) => {
                    const n = { ...p };
                    delete n.name;
                    return n;
                  });
                }}
                onBlur={async (e) => {
                  const value = e.target.value.trim();
                  if (!value || value === (originalRef.current?.name ?? '')) return;
                  const taken = await resolvesExists(masterApi.checkCategoryNameExists(value));
                  if (taken) {
                    setFieldErrors((p) => ({ ...p, name: 'This name is already in use.' }));
                  }
                }}
                placeholder="Electronics"
                autoComplete="off"
                autoFocus
                className={
                  fieldErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''
                }
              />
              {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>
                Icon <span className="text-muted-foreground font-normal text-xs">(optional)</span>
              </Label>
              <EmojiPicker
                value={form.icon}
                onChange={(value) => setForm((prev) => ({ ...prev, icon: value }))}
                placeholder="Pick an icon for this category"
              />
            </div>

            {error && <ErrorAlert message={error} />}

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    Saving...
                  </>
                ) : (
                  'Save changes'
                )}
              </Button>
              <Link href="/admin/master/categories">
                <Button type="button" variant="outline" disabled={saving}>
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
