'use client';

import type { ReactNode } from 'react';
import { PaginationBar } from './PaginationBar';

interface ListMobileFooterProps {
  /** The list's primary action, e.g. an "Add user" button (use `h-11` for a 44px target). */
  action: ReactNode;
  pageIndex: number;
  pageCount: number;
  pageSize: number;
  itemCount: number;
  totalRecords: number;
  onPageChange: (pageIndex: number) => void;
  isLoading: boolean;
}

/** Phone footer pinned to the bottom of a list: the primary action + "X–Y of Z" + prev/next. */
export function ListMobileFooter({ action, ...pagination }: ListMobileFooterProps) {
  return (
    <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex items-center gap-2 border-t border-border bg-card px-4 py-2.5">
      {action}
      <PaginationBar variant="compact" className="flex-1" {...pagination} />
    </div>
  );
}
