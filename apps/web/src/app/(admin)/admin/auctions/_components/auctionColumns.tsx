'use client';

import { Ban, CalendarClock, Eye, Info, Loader2, Pencil, Send, Trash2 } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { AuctionVM } from '@repo/api';
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui';
import Tip from '@/components/common/admin/Tip';
import { StatusBadge } from '@/components/common/admin/AuctionStatusBadge';
import { currencySymbol, formatLabel, resolveStr } from '@/components/common/admin/format';
import { AccessibilityCell, DirectionCell, ProtocolDetailsCell } from './AuctionTableCells';

export interface AuctionColumnActions {
  router: AppRouterInstance;
  deletingId: string | null;
  publishingId: string | null;
  cancellingId: string | null;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onCancel: (id: string) => void;
}

export function buildAuctionColumns({
  router,
  deletingId,
  publishingId,
  cancellingId,
  onDelete,
  onPublish,
  onCancel,
}: AuctionColumnActions): ColumnDef<AuctionVM>[] {
  return [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => router.push(`/admin/auctions/${row.original.id}/view`)}
            className="font-medium text-sm text-foreground hover:text-primary hover:underline text-left truncate max-w-[200px] block"
          >
            {row.original.title}
          </button>
          {row.original.referenceId && (
            <span className="font-mono text-[10px] text-muted-foreground">
              {row.original.referenceId}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'format',
      header: 'Format / Type',
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <div className="text-sm text-foreground">{formatLabel(row.original.format)}</div>
          {row.original.type && (
            <div className="text-[11px] text-muted-foreground">
              {formatLabel(row.original.type)}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'accessibility',
      header: 'Access',
      cell: ({ row }) => <AccessibilityCell value={row.original.protocol?.accessibility} />,
    },
    {
      id: 'direction',
      header: 'Direction',
      cell: ({ row }) => <DirectionCell value={row.original.protocol?.direction} />,
    },
    {
      id: 'protocol',
      header: () => (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex items-center gap-1 cursor-default">
              Protocol <Info className="h-3 w-3 text-muted-foreground/60" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Participant &amp; offer visibility details
          </TooltipContent>
        </Tooltip>
      ),
      cell: ({ row }) => <ProtocolDetailsCell auction={row.original} />,
    },
    {
      id: 'currency',
      header: 'Currency',
      cell: ({ row }) => {
        const curr = resolveStr(row.original.monetaryOptions?.currencyUnit);
        if (!curr) return <span className="text-xs text-muted-foreground">—</span>;
        const symbol = currencySymbol(curr);
        return (
          <span className="inline-flex items-center gap-1 font-mono text-xs font-medium text-foreground">
            {symbol && <span className="text-muted-foreground">{symbol}</span>}
            {curr}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge value={row.original.status} size="sm" showIcon={false} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const status = resolveStr(row.original.status);
        const canDelete = status === 'DRAFT' || status === 'SCHEDULED';
        const canCancel = status === 'SCHEDULED' || status === 'PUBLISHED' || status === 'LIVE';
        return (
          <div className="flex items-center gap-0.5 justify-end">
            <Tip label="View">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => router.push(`/admin/auctions/${row.original.id}/view`)}
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </Tip>
            <Tip label="Edit">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => router.push(`/admin/auctions/${row.original.id}/edit`)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </Tip>
            {status === 'DRAFT' && (
              <Tip label="Schedule">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
                  onClick={() => router.push(`/admin/auctions/${row.original.id}/edit?step=5`)}
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                </Button>
              </Tip>
            )}
            {status === 'SCHEDULED' && (
              <Tip label="Publish">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10"
                  onClick={() => onPublish(row.original.id)}
                  disabled={publishingId === row.original.id}
                >
                  {publishingId === row.original.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </Button>
              </Tip>
            )}
            {canCancel && (
              <Tip label="Cancel">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onCancel(row.original.id)}
                  disabled={cancellingId === row.original.id}
                >
                  {cancellingId === row.original.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Ban className="h-3.5 w-3.5" />
                  )}
                </Button>
              </Tip>
            )}
            {canDelete && (
              <Tip label="Delete">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(row.original.id)}
                  disabled={deletingId === row.original.id}
                >
                  {deletingId === row.original.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </Tip>
            )}
          </div>
        );
      },
    },
  ];
}
