'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuctionVM } from '@repo/api';
import { Button, toast } from '@repo/ui';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Calendar,
  Building2,
  IndianRupee,
  Hash,
} from 'lucide-react';
import { StatusBadge } from '@/components/common/admin/AuctionStatusBadge';
import { formatDateTime, formatLabel, resolveStr } from '@/components/common/admin/format';

interface AuctionViewHeaderProps {
  auction: AuctionVM;
  onRefreshPolicies?: () => void;
  reloadingPolicies?: boolean;
  onDelete?: () => void;
}

export function AuctionViewHeader({
  auction,
  onRefreshPolicies,
  reloadingPolicies = false,
  onDelete,
}: AuctionViewHeaderProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    if (auction.id) {
      navigator.clipboard.writeText(auction.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast?.success?.('Auction ID copied to clipboard');
    }
  };

  const primaryUnit = auction.units?.[0] ?? auction.unit;
  const price =
    primaryUnit?.openingPrice ?? (primaryUnit as { standingPrice?: number })?.standingPrice;
  const startTime = auction.schedule?.startTime ?? auction.startTime;
  const auctionTypeStr = resolveStr(auction.type);

  return (
    <div className="space-y-4 bg-card border border-border rounded-2xl p-6 shadow-xs">
      {/* Navigation & Actions Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/admin/auctions')}
          className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Auctions
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          {onRefreshPolicies && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefreshPolicies}
              disabled={reloadingPolicies}
              className="gap-2 text-xs rounded-xl"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${reloadingPolicies ? 'animate-spin' : ''}`} />
              Re-evaluate Policies
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/admin/auctions/${auction.id}/edit`)}
            className="gap-2 text-xs rounded-xl"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Auction
          </Button>

          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="gap-2 text-xs rounded-xl text-destructive hover:bg-destructive/10 border-destructive/30"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Main Title & Status Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {auction.title || 'Untitled Auction'}
            </h1>
            <StatusBadge value={auction.status} />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {auction.referenceId && (
              <span className="flex items-center gap-1.5 font-medium text-foreground bg-muted/60 px-2.5 py-1 rounded-md">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                Ref: {auction.referenceId}
              </span>
            )}

            <button
              onClick={handleCopyId}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors bg-muted/40 hover:bg-muted/80 px-2.5 py-1 rounded-md"
              title="Click to copy ID"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span className="font-mono">{auction.id}</span>
            </button>

            {auctionTypeStr && (
              <span className="flex items-center gap-1.5 bg-primary/10 text-primary font-medium px-2.5 py-1 rounded-md">
                <Building2 className="h-3.5 w-3.5" />
                {formatLabel(auctionTypeStr)}
              </span>
            )}
          </div>
        </div>

        {/* Highlight Stats Chips */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="bg-muted/40 border border-border/60 rounded-xl p-3 flex items-center gap-3 min-w-[140px]">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <IndianRupee className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                Opening Price
              </p>
              <p className="text-sm font-bold text-foreground">
                {price != null ? `₹${price.toLocaleString()}` : 'N/A'}
              </p>
            </div>
          </div>

          <div className="bg-muted/40 border border-border/60 rounded-xl p-3 flex items-center gap-3 min-w-[160px]">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                Start Time
              </p>
              <p className="text-sm font-bold text-foreground">
                {startTime ? formatDateTime(startTime) : 'Not scheduled'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
