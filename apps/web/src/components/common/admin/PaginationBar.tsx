'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, cn } from '@repo/ui';

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
  /** `compact`: just "X–Y of Z" and 44px prev/next buttons, for phone footers. */
  variant?: 'full' | 'compact';
  className?: string;
}

/** Shared pagination footer for server-paginated lists. */
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
  variant = 'full',
  className = '',
}: PaginationBarProps) {
  const compact = variant === 'compact';
  const showPageSize = !compact && !!pageSizeOptions?.length && !!onPageSizeChange;
  const alwaysShow = (compact || showPageSize) && totalRecords > 0;
  if (pageCount <= 1 && !alwaysShow) return null;

  const start = totalRecords === 0 ? 0 : pageIndex * pageSize + 1;
  const end = pageIndex * pageSize + itemCount;
  const canPrev = pageIndex > 0 && !isLoading;
  const canNext = pageIndex + 1 < pageCount && !isLoading;
  const navButton = compact ? 'h-11 w-11' : 'h-9 w-9';

  const prevButton = (
    <Button
      variant="outline"
      size="icon"
      className={navButton}
      onClick={() => onPageChange(pageIndex - 1)}
      disabled={!canPrev}
      aria-label="Previous page"
    >
      <ChevronLeft />
    </Button>
  );
  const nextButton = (
    <Button
      variant="outline"
      size="icon"
      className={navButton}
      onClick={() => onPageChange(pageIndex + 1)}
      disabled={!canNext}
      aria-label="Next page"
    >
      <ChevronRight />
    </Button>
  );

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span className="flex-1 text-right text-[13px] text-muted-foreground tabular-nums">
          {start}–{end} of {totalRecords}
        </span>
        {prevButton}
        {nextButton}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <span className="text-sm text-muted-foreground tabular-nums">
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
        <nav aria-label="Pagination" className="flex items-center gap-1">
          {prevButton}
          <span
            aria-current="page"
            title={`Page ${pageIndex + 1} of ${Math.max(pageCount, 1)}`}
            className="grid h-9 min-w-9 place-items-center rounded-md border border-primary px-2 text-sm font-bold text-primary tabular-nums"
          >
            <span className="sr-only">Page </span>
            {pageIndex + 1}
            <span className="sr-only"> of {Math.max(pageCount, 1)}</span>
          </span>
          {nextButton}
        </nav>
      </div>
    </div>
  );
}
