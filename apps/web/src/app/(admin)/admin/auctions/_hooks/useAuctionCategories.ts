'use client';

import { useEffect, useState } from 'react';
import { masterApi, type CategoryVM } from '@oxneer/api';

/** Categories with their sub-categories, for the list filters. Empty while
 *  loading or if the call fails: the filters then just offer nothing to pick. */
export function useAuctionCategories(): CategoryVM[] {
  const [categories, setCategories] = useState<CategoryVM[]>([]);
  useEffect(() => {
    let active = true;
    masterApi
      .getCategories(true)
      .then((list) => active && setCategories(list))
      .catch(() => active && setCategories([]));
    return () => {
      active = false;
    };
  }, []);
  return categories;
}
