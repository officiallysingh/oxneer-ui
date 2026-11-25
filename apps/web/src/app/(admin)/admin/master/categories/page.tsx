'use client';

import { useEffect, useState } from 'react';
import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { masterApi, CategoryVM, SubCategoryVM } from '@oxneer/api';
import {
  Loader2,
  Trash2,
  RefreshCw,
  Plus,
  Pencil,
  ChevronDown,
  ChevronUp,
  Tag,
} from 'lucide-react';
import { Button, cn } from '@oxneer/ui';
import { PhraseSearchBar } from '@/components/common/admin/PhraseSearchBar';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import Tip from '@/components/common/admin/Tip';

export default function CategoriesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<CategoryVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [subCatMap, setSubCatMap] = useState<Record<string, SubCategoryVM[]>>({});
  const [subCatLoading, setSubCatLoading] = useState<Record<string, boolean>>({});
  const [phrases, setPhrases] = useState<string[]>(() => searchParams.getAll('phrases'));

  const confirm_state = {
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  };
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>(confirm_state);

  const openConfirm = (title: string, description: string, onConfirm: () => void) =>
    setConfirm({ open: true, title, description, onConfirm });
  const closeConfirm = () => setConfirm((prev) => ({ ...prev, open: false }));

  const fetchCategories = async (ph?: string[]) => {
    setIsLoading(true);
    setError(null);
    try {
      setCategories(await masterApi.getCategories(false, ph?.length ? ph : undefined));
    } catch {
      setError('Failed to load categories.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories(searchParams.getAll('phrases'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    const params = new URLSearchParams();
    phrases.forEach((p) => params.append('phrases', p));
    router.replace(params.toString() ? `?${params.toString()}` : '', { scroll: false });
    fetchCategories(phrases.length ? phrases : undefined);
  };

  const handleReset = () => {
    setPhrases([]);
    router.replace('', { scroll: false });
    fetchCategories([]);
  };

  const toggleExpand = async (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      next.add(id);
      return next;
    });
    if (!subCatMap[id]) {
      setSubCatLoading((prev) => ({ ...prev, [id]: true }));
      try {
        const subs = await masterApi.getSubCategoriesByCategory(id);
        setSubCatMap((prev) => ({ ...prev, [id]: subs }));
      } catch {
        /* silently fail */
      } finally {
        setSubCatLoading((prev) => ({ ...prev, [id]: false }));
      }
    }
  };

  const handleDeleteCategory = (id: string) => {
    openConfirm(
      'Delete category?',
      'This will permanently remove the category and all its sub-categories.',
      async () => {
        try {
          await masterApi.deleteCategory(id);
          setCategories((prev) => prev.filter((c) => c.id !== id));
        } catch {
          setError('Failed to delete category.');
        }
      },
    );
  };

  const handleDeleteSubCategory = (subId: string, categoryId: string) => {
    openConfirm(
      'Delete sub-category?',
      'This will permanently remove the sub-category.',
      async () => {
        try {
          await masterApi.deleteSubCategory(subId);
          setSubCatMap((prev) => ({
            ...prev,
            [categoryId]: (prev[categoryId] ?? []).filter((s) => s.id !== subId),
          }));
        } catch {
          setError('Failed to delete sub-category.');
        }
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Manage auction item categories and sub-categories"
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => router.push('/admin/master/categories/new')}>
              <Plus className="h-4 w-4 mr-1" />
              Add category
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchCategories(phrases.length ? phrases : undefined)}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-4 w-4 mr-1', isLoading ? 'animate-spin' : '')} />
              Refresh
            </Button>
          </div>
        }
      />

      {error && <ErrorAlert message={error} />}

      <PhraseSearchBar
        phrases={phrases}
        onPhrasesChange={setPhrases}
        onSearch={handleSearch}
        onReset={handleReset}
        placeholder="Search categories..."
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading categories...</span>
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Tag className="h-10 w-10 opacity-30" />
          <p className="text-sm">No categories yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const isExpanded = expanded.has(cat.id);
            const subs = subCatMap[cat.id] ?? [];
            const loading = subCatLoading[cat.id];

            return (
              <div
                key={cat.id}
                className="rounded-xl border border-border bg-card overflow-hidden flex flex-col transition-shadow hover:shadow-md hover:shadow-black/20"
              >
                <div className="p-4 flex items-start gap-3">
                  <div className="shrink-0 h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl">
                    <CategoryIcon value={cat.icon} size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{cat.name}</h3>
                    {cat.code && (
                      <span className="font-mono text-xs text-muted-foreground">{cat.code}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Tip label="Edit category">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={() => router.push(`/admin/master/categories/${cat.id}/edit`)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </Tip>
                    <Tip label="Delete category">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteCategory(cat.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </Tip>
                  </div>
                </div>

                <div className="mt-auto border-t border-border px-4 py-2.5 flex items-center justify-between bg-muted/20">
                  <button
                    onClick={() => toggleExpand(cat.id)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {isExpanded ? 'Hide' : 'Show'} sub-categories
                      {subCatMap[cat.id] ? ` (${subs.length})` : ''}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1"
                    onClick={() =>
                      router.push(`/admin/master/categories/${cat.id}/subcategories/new`)
                    }
                  >
                    <Plus className="h-3 w-3" />
                    Add sub
                  </Button>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-3 border-t border-border bg-muted/10">
                    {loading ? (
                      <div className="flex items-center gap-2 text-muted-foreground text-xs py-1">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading...
                      </div>
                    ) : subs.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No sub-categories yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {subs.map((sub) => (
                          <div
                            key={sub.id}
                            className="group flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs"
                          >
                            {sub.icon && <CategoryIcon value={sub.icon} size={14} />}
                            <span className="text-foreground font-medium">{sub.name}</span>
                            <button
                              onClick={() => handleDeleteSubCategory(sub.id, cat.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                              aria-label={`Delete ${sub.name}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        description={confirm.description}
        confirmLabel="Delete"
        onConfirm={() => {
          confirm.onConfirm();
          closeConfirm();
        }}
        onCancel={closeConfirm}
      />
    </div>
  );
}
