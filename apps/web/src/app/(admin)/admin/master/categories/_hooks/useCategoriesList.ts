'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getApiErrorMessage, masterApi, type CategoryVM, type SubCategoryVM } from '@oxneer/api';
import { useLazyChildren } from '@/hooks/admin';

const loadSubCategories = (categoryId: string) => masterApi.getSubCategoriesByCategory(categoryId);

function phrasesQuery(phrases: string[]): string {
  const params = new URLSearchParams();
  phrases.forEach((p) => params.append('phrases', p));
  return params.toString();
}

/**
 * Categories matching the applied search phrases (mirrored to `?phrases=`), each
 * opening onto its lazily loaded sub-categories.
 */
export function useCategoriesList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [phrases, setPhrases] = useState<string[]>(() => searchParams.getAll('phrases'));
  const [appliedPhrases, setAppliedPhrases] = useState<string[]>(phrases);
  const [categories, setCategories] = useState<CategoryVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  const subCategories = useLazyChildren<SubCategoryVM>({
    load: loadSubCategories,
    onError: setError,
    loadErrorMessage: 'Failed to load sub-categories.',
  });
  const { removeChild: removeSubCategory } = subCategories;

  useEffect(() => {
    let cancelled = false;
    // Loading is switched on by whatever triggers a reload (initial state, search, refresh).
    const run = async () => {
      try {
        const result = await masterApi.getCategories(
          false,
          appliedPhrases.length ? appliedPhrases : undefined,
        );
        if (!cancelled) setCategories(result);
      } catch {
        if (!cancelled) setError('Failed to load categories.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [appliedPhrases, reloadCount]);

  const reload = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setReloadCount((n) => n + 1);
  }, []);

  const applySearch = useCallback(
    (next: string[]) => {
      const qs = phrasesQuery(next);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      setAppliedPhrases(next);
      reload();
    },
    [router, pathname, reload],
  );

  const search = useCallback(() => applySearch(phrases), [applySearch, phrases]);

  const reset = useCallback(() => {
    setPhrases([]);
    applySearch([]);
  }, [applySearch]);

  const deleteCategory = useCallback(async (category: CategoryVM) => {
    try {
      await masterApi.deleteCategory(category.id);
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete category.'));
    }
  }, []);

  const deleteSubCategory = useCallback(
    async (categoryId: string, subCategory: SubCategoryVM) => {
      try {
        await masterApi.deleteSubCategory(subCategory.id);
        removeSubCategory(categoryId, subCategory.id);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to delete sub-category.'));
      }
    },
    [removeSubCategory],
  );

  return {
    categories,
    isLoading,
    error,
    phrases,
    setPhrases,
    hasSearch: appliedPhrases.length > 0,
    search,
    reset,
    refresh: reload,
    subCategories,
    deleteCategory,
    deleteSubCategory,
  };
}
