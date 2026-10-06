'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown, Loader2, Search } from 'lucide-react';
import { Button } from '@repo/ui';
import { Input } from '@repo/ui';
import { SearchInput } from '@/components/common/admin/SearchInput';
import { PaginationBar } from '@/components/common/admin/PaginationBar';

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  isLoading?: boolean;
  emptyMessage?: string;
  searchPlaceholder?: string;
  pageSize?: number;
  enableUrlState?: boolean;
  onSearch?: (value: string) => void;
  searchValue?: string;
  toolbar?: React.ReactNode;
  hideSearch?: boolean;
  /** When true, `data` is treated as just the current server page; pagination is driven by the props below instead of paginating `data` client-side. */
  manualPagination?: boolean;
  /** Current zero-based page index. Required when manualPagination is true. */
  pageIndex?: number;
  /** Total number of pages available on the server. Required when manualPagination is true. */
  pageCount?: number;
  /** Total record count across all server pages, used for the "Showing X to Y of Z" caption. */
  rowCount?: number;
  /** Called with the next zero-based page index when Previous/Next is clicked. Required when manualPagination is true. */
  onPageChange?: (pageIndex: number) => void;
}

export function DataTable<TData>({
  data,
  columns,
  isLoading = false,
  emptyMessage = 'No data found.',
  searchPlaceholder = 'Search...',
  pageSize = 10,
  enableUrlState = true,
  onSearch,
  searchValue = '',
  toolbar,
  hideSearch = false,
  manualPagination = false,
  pageIndex = 0,
  pageCount,
  rowCount,
  onPageChange,
}: DataTableProps<TData>) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL or defaults
  const [sorting, setSorting] = useState<SortingState>(() => {
    if (!enableUrlState) return [];
    const sortParam = searchParams.get('sort');
    if (sortParam) {
      try {
        return JSON.parse(sortParam);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState(() => {
    if (!enableUrlState || onSearch) return '';
    return searchParams.get('search') || '';
  });

  // local input state for server-side search
  const [localSearch, setLocalSearch] = useState(searchValue);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localPagination, setLocalPagination] = useState(() => {
    if (!enableUrlState) return { pageIndex: 0, pageSize };
    const page = parseInt(searchParams.get('page') || '1') - 1; // URL is 1-based
    return {
      pageIndex: Math.max(0, page),
      pageSize: parseInt(searchParams.get('pageSize') || pageSize.toString()),
    };
  });

  // In manual mode the parent owns pageIndex/pageSize; otherwise DataTable paginates `data` itself.
  const pagination = manualPagination ? { pageIndex, pageSize } : localPagination;

  // Keep a ref to searchParams so URL effect can read current external params
  // without adding searchParams to its dependency array (which would cause loops)
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  // Update URL when DataTable-owned state changes.
  // We preserve external params (phrases, available, etc.) by merging them in.
  useEffect(() => {
    if (!enableUrlState || manualPagination) return;

    // Start from existing params to preserve external filter keys
    const params = new URLSearchParams();
    searchParamsRef.current.forEach((value, key) => {
      // Skip keys owned by DataTable; we'll re-add them below
      if (!['page', 'pageSize', 'sort', 'search'].includes(key)) {
        params.append(key, value);
      }
    });

    if (localPagination.pageIndex > 0) {
      params.set('page', (localPagination.pageIndex + 1).toString());
    }
    if (localPagination.pageSize !== pageSize) {
      params.set('pageSize', localPagination.pageSize.toString());
    }
    if (sorting.length > 0) {
      params.set('sort', JSON.stringify(sorting));
    }
    if (!onSearch && globalFilter) {
      params.set('search', globalFilter);
    }

    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.replace(newUrl, { scroll: false });
  }, [
    localPagination,
    sorting,
    globalFilter,
    enableUrlState,
    router,
    pageSize,
    onSearch,
    manualPagination,
  ]);

  // Reset to first page when search changes (client-side search only)
  useEffect(() => {
    if (enableUrlState && !manualPagination) {
      setLocalPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }
  }, [globalFilter, enableUrlState, manualPagination]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: onSearch ? undefined : getFilteredRowModel(),
    manualPagination,
    pageCount: manualPagination ? (pageCount ?? -1) : undefined,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: onSearch ? undefined : setGlobalFilter,
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater;
      if (manualPagination) {
        onPageChange?.(next.pageIndex);
      } else {
        setLocalPagination(next);
      }
    },
    state: {
      sorting,
      columnFilters,
      globalFilter: onSearch ? undefined : globalFilter,
      pagination,
    },
  });

  const totalRows = manualPagination
    ? (rowCount ?? data.length)
    : table.getFilteredRowModel().rows.length;

  return (
    <div className="space-y-4">
      {/* Search + toolbar */}
      {!hideSearch && (
        <div className="flex items-center gap-3">
          {onSearch ? (
            <SearchInput
              value={searchValue}
              onChange={onSearch}
              placeholder={searchPlaceholder}
              className="flex-1 max-w-sm"
            />
          ) : (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={globalFilter ?? ''}
                onChange={(event) => setGlobalFilter(String(event.target.value))}
                className="pl-9"
              />
            </div>
          )}
          {toolbar && <div className="flex items-center gap-3 ml-auto">{toolbar}</div>}
        </div>
      )}
      {hideSearch && toolbar && <div className="flex items-center gap-3">{toolbar}</div>}

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left font-medium"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={
                            header.column.getCanSort()
                              ? 'cursor-pointer select-none flex items-center gap-1 hover:text-foreground'
                              : ''
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <div className="flex flex-col">
                              {header.column.getIsSorted() === 'asc' ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : header.column.getIsSorted() === 'desc' ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronsUpDown className="h-3 w-3 opacity-50" />
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                    Loading...
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PaginationBar
        pageIndex={pagination.pageIndex}
        pageCount={manualPagination ? (pageCount ?? 0) : table.getPageCount()}
        pageSize={pagination.pageSize}
        itemCount={data.length}
        totalRecords={totalRows}
        onPageChange={(nextPage) => {
          if (manualPagination) {
            onPageChange?.(nextPage);
          } else {
            table.setPageIndex(nextPage);
          }
        }}
        isLoading={isLoading}
      />
    </div>
  );
}
