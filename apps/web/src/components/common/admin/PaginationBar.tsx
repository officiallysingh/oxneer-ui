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
  /** When set, shows a "Rows per page" select and keeps the bar visible on a single page. */
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
  /** Noun used in the caption, e.g. "users". Defaults to "results". */
  itemLabel?: string;
  className?: string;
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
  pageSizeOptions,
  onPageSizeChange,
  itemLabel = 'results',
  className = '',
}: PaginationBarProps) {
  const showPageSize = !!pageSizeOptions?.length && !!onPageSizeChange;
  if (pageCount <= 1 && !(showPageSize && totalRecords > 0)) return null;

  const start = pageIndex * pageSize + 1;
  const end = pageIndex * pageSize + itemCount;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <span className="text-sm text-muted-foreground">
        Showing{' '}
        <span className="font-semibold text-foreground">
          {start}–{end}
        </span>{' '}
        of <span className="font-semibold text-foreground">{totalRecords}</span> {itemLabel}
      </span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {showPageSize && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Rows per page
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              disabled={isLoading}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
        {pageCount > 1 && (
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
        )}
      </div>
    </div>
  );
}
