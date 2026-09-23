'use client';

import { Button } from '@repo/ui';

interface PaginationBarProps {
  pageIndex: number;
  pageCount: number;
  pageSize: number;
  /** Number of items on the current page (used for the "Showing X–Y" caption). */
  itemCount: number;
  totalRecords: number;
  onPageChange: (pageIndex: number) => void;
  isLoading?: boolean;
}

/** Shared Previous/Next pagination footer for server-paginated lists. */
export function PaginationBar({
  pageIndex,
  pageCount,
  pageSize,
  itemCount,
  totalRecords,
  onPageChange,
  isLoading = false,
}: PaginationBarProps) {
  if (pageCount <= 1) return null;

  const start = pageIndex * pageSize + 1;
  const end = pageIndex * pageSize + itemCount;

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">
        Showing {start}–{end} of {totalRecords} results
      </span>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pageIndex - 1)}
          disabled={pageIndex === 0 || isLoading}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {pageIndex + 1} of {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pageIndex + 1)}
          disabled={pageIndex + 1 >= pageCount || isLoading}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
