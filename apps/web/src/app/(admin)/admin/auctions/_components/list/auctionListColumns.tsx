'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import type { AuctionVM } from '@oxneer/api';
import { Button } from '@oxneer/ui';
import Tip from '@/components/common/admin/Tip';
import { StatusBadge } from '@/components/common/admin/AuctionStatusBadge';
import { auctionTitle, permittedActions } from '../../_lib/auction-display';
import { AuctionActionsMenu, type AuctionRowHandlers } from './AuctionActionsMenu';
import {
  AuctionIdentity,
  AuctionPriceCell,
  AuctionProtocolTags,
  AuctionScheduleCell,
} from './AuctionListCells';

/** No column is sortable: the API always orders by start time, newest first. */
export function buildAuctionListColumns(handlers: AuctionRowHandlers): ColumnDef<AuctionVM>[] {
  return [
    {
      id: 'auction',
      header: 'Auction',
      size: 300,
      enableSorting: false,
      cell: ({ row }) => <AuctionIdentity auction={row.original} />,
    },
    {
      id: 'status',
      header: 'Status',
      size: 130,
      enableSorting: false,
      cell: ({ row }) => <StatusBadge value={row.original.status} size="sm" />,
    },
    {
      id: 'schedule',
      header: 'Starts',
      size: 150,
      enableSorting: false,
      cell: ({ row }) => <AuctionScheduleCell auction={row.original} />,
    },
    {
      id: 'price',
      header: () => <span className="block whitespace-nowrap text-right">Opening price</span>,
      size: 150,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="text-right">
          <AuctionPriceCell auction={row.original} />
        </div>
      ),
    },
    {
      id: 'protocol',
      header: 'Access',
      size: 190,
      enableSorting: false,
      cell: ({ row }) => <AuctionProtocolTags auction={row.original} />,
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      size: 92,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-0.5">
          {permittedActions(row.original).edit && (
            <Tip label="Edit auction">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={() => handlers.onEdit(row.original)}
                aria-label={`Edit ${auctionTitle(row.original)}`}
              >
                <Pencil />
              </Button>
            </Tip>
          )}
          <AuctionActionsMenu auction={row.original} handlers={handlers} />
        </div>
      ),
    },
  ];
}
