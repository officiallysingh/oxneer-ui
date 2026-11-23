'use client';

import { Ban, CalendarClock, Eye, Loader2, MoreVertical, Pencil, Send, Trash2 } from 'lucide-react';
import type { AuctionVM } from '@oxneer/api';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@oxneer/ui';
import { auctionTitle, permittedActions } from '../../_lib/auction-display';

/** Everything a row or card can do to an auction. Built once by the page. */
export interface AuctionRowHandlers {
  onView: (auction: AuctionVM) => void;
  onEdit: (auction: AuctionVM) => void;
  onSchedule: (auction: AuctionVM) => void;
  onPublish: (auction: AuctionVM) => void;
  onCancel: (auction: AuctionVM) => void;
  onDelete: (auction: AuctionVM) => void;
  busyIds: ReadonlySet<string>;
}

const TRIGGER_CLASS = {
  row: 'h-9 w-9 text-muted-foreground hover:text-foreground',
  card: '-my-1.5 -mr-2 h-11 w-11 text-muted-foreground hover:text-foreground',
} as const;

interface AuctionActionsMenuProps {
  auction: AuctionVM;
  handlers: AuctionRowHandlers;
  /** `row`: compact ghost trigger. `card`: 44px touch target for phone cards. */
  variant?: 'row' | 'card';
}

/** "⋮" menu with the actions the auction's status allows. */
export function AuctionActionsMenu({
  auction,
  handlers,
  variant = 'row',
}: AuctionActionsMenuProps) {
  const busy = handlers.busyIds.has(auction.id);
  const can = permittedActions(auction);
  const hasEndingAction = can.cancel || can.delete;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={TRIGGER_CLASS[variant]}
          aria-label={`More actions for ${auctionTitle(auction)}`}
          disabled={busy}
        >
          {busy ? <Loader2 className="animate-spin" /> : <MoreVertical />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => handlers.onView(auction)}>
          <Eye className="mr-2 h-4 w-4" />
          View details
        </DropdownMenuItem>
        {can.edit && (
          <DropdownMenuItem onSelect={() => handlers.onEdit(auction)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit auction
          </DropdownMenuItem>
        )}
        {can.schedule && (
          <DropdownMenuItem onSelect={() => handlers.onSchedule(auction)}>
            <CalendarClock className="mr-2 h-4 w-4" />
            Set schedule
          </DropdownMenuItem>
        )}
        {can.publish && (
          <DropdownMenuItem onSelect={() => handlers.onPublish(auction)}>
            <Send className="mr-2 h-4 w-4" />
            Publish auction
          </DropdownMenuItem>
        )}
        {hasEndingAction && <DropdownMenuSeparator />}
        {can.cancel && (
          <DropdownMenuItem
            onSelect={() => handlers.onCancel(auction)}
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <Ban className="mr-2 h-4 w-4" />
            Cancel auction…
          </DropdownMenuItem>
        )}
        {can.delete && (
          <DropdownMenuItem
            onSelect={() => handlers.onDelete(auction)}
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete auction…
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
