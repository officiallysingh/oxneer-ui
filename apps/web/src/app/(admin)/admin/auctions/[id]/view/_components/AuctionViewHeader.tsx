'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft, Clock, Copy, MoreHorizontal, Pencil, Ban, Trash2 } from 'lucide-react';
import type { AuctionVM } from '@oxneer/api';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@oxneer/ui';
import { Pill } from '@/components/common/admin/Pill';
import Tip from '@/components/common/admin/Tip';
import { formatDateTime } from '../../../_lib/wizard/summary';
import type { AuctionChip } from '../_lib/facts';
import { STAGE_META, type AuctionStage, type Countdown } from '../_lib/stage';
import { CHIP_ICON } from './viewIcons';

interface AuctionViewHeaderProps {
  auction: AuctionVM;
  stage: AuctionStage;
  chips: AuctionChip[];
  countdown: Countdown | null;
  onCopyId: () => void;
  onCancel: () => void;
  onDelete: () => void;
  /** The tab list, drawn along the bottom edge of the header. */
  tabs: ReactNode;
}

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

/** Cancelling is for auctions people may already be joining. */
function canCancel(stage: AuctionStage): boolean {
  return stage === 'registration' || stage === 'bidding';
}

function HeaderActions({
  auctionId,
  stage,
  onCancel,
  onDelete,
}: {
  auctionId: string;
  stage: AuctionStage;
  onCancel: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={`/admin/auctions/${auctionId}/edit`}>
          <Pencil />
          Edit setup
        </Link>
      </Button>
      <DropdownMenu>
        <Tip label="More actions">
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9" aria-label="More actions">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
        </Tip>
        <DropdownMenuContent align="end">
          {canCancel(stage) && (
            <DropdownMenuItem onSelect={onCancel}>
              <Ban className="h-4 w-4" />
              Cancel auction
            </DropdownMenuItem>
          )}
          {canCancel(stage) && <DropdownMenuSeparator />}
          <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4" />
            Delete auction
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function CountdownBox({ countdown }: { countdown: Countdown }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-policy-border bg-policy px-4 py-2.5 text-policy-foreground">
      <Clock className="h-5 w-5 shrink-0" aria-hidden />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide">{countdown.label}</p>
        <p className="font-display text-xl font-semibold tabular-nums">{countdown.remaining}</p>
        <p className="text-xs tabular-nums">{formatDateTime(countdown.at.toISOString())}</p>
      </div>
    </div>
  );
}

export function AuctionViewHeader({
  auction,
  stage,
  chips,
  countdown,
  onCopyId,
  onCancel,
  onDelete,
  tabs,
}: AuctionViewHeaderProps) {
  const title = auction.title || 'Untitled auction';
  const stageMeta = STAGE_META[stage];

  return (
    <header className="flex flex-col gap-4 border border-border bg-card px-4 pt-4 sm:px-6 sm:pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
          <Link
            href="/admin/auctions"
            className="inline-flex min-h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            All auctions
          </Link>
          {/* On a phone the title right below says the same thing. */}
          <span className="hidden text-muted-foreground sm:inline" aria-hidden>
            /
          </span>
          <span
            className="hidden truncate font-semibold text-foreground sm:inline"
            aria-current="page"
          >
            {title}
          </span>
        </nav>
        <HeaderActions
          auctionId={auction.id}
          stage={stage}
          onCancel={onCancel}
          onDelete={onDelete}
        />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            <Pill tone={stageMeta.tone} dot>
              {stageMeta.label}
            </Pill>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {chips.map((chip) => {
              const Icon = CHIP_ICON[chip.key];
              return (
                <Pill key={chip.key} tone="muted">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {chip.label}
                </Pill>
              );
            })}
            {auction.referenceId && <span>Ref {auction.referenceId}</span>}
            <Tip label="Copy auction ID">
              <button
                type="button"
                onClick={onCopyId}
                aria-label={`Copy auction ID ${auction.id}`}
                className="inline-flex min-h-8 items-center gap-1 rounded-md px-1 font-mono text-xs tabular-nums transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                {shortId(auction.id)}
              </button>
            </Tip>
          </div>
        </div>
        {countdown && <CountdownBox countdown={countdown} />}
      </div>

      {tabs}
    </header>
  );
}
