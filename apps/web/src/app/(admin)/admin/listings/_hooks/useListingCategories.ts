'use client';

import { useEffect, useState } from 'react';
import { masterApi, type CategoryVM } from '@oxneer/api';

/** Active categories (with sub-categories) for the listings filters. */
export function useListingCategories() {
  const [categories, setCategories] = useState<CategoryVM[]>([]);

  useEffect(() => {
    let cancelled = false;
    masterApi
      .getCategories(true)
      .then((result) => {
        if (!cancelled) setCategories(result);
      })
      // The filters still work without categories, so a failure here stays silent.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return categories;
}
