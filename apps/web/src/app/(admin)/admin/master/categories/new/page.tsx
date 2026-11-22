'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { masterApi } from '@oxneer/api';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button, Input, Label } from '@oxneer/ui';
import Link from 'next/link';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import EmojiPicker from '@/components/common/EmojiPicker';
import { parseApiError } from '@/lib/api-errors';
import { resolvesExists } from '@/lib/exists-check';

interface NewCategoryFormValues {
  name: string;
  icon: string;
}

const EMPTY_NEW_CATEGORY_FORM: NewCategoryFormValues = {
  name: '',
  icon: '',
};

export default function NewCategoryPage() {
  const router = useRouter();
  const [form, setForm] = useState<NewCategoryFormValues>(EMPTY_NEW_CATEGORY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof NewCategoryFormValues>(
    key: K,
    value: NewCategoryFormValues[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSaving(true);
    try {
      await masterApi.createCategory({ name: form.name.trim(), icon: form.icon || undefined });
      router.push('/admin/master/categories');
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to create category.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add category"
        description="Create a new auction item category"
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
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="name" className={fieldErrors.name ? 'text-destructive' : ''}>
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
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
                const taken = await resolvesExists(masterApi.checkCategoryNameExists(value));
                if (taken) setFieldErrors((p) => ({ ...p, name: 'This name is already in use.' }));
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
              onChange={(value) => setField('icon', value)}
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
                'Create category'
              )}
            </Button>
            <Link href="/admin/master/categories">
              <Button type="button" variant="outline" disabled={saving}>
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
