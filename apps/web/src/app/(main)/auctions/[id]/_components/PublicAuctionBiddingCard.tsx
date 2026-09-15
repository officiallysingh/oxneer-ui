'use client';

import { AuctionVM, ParticipantVM } from '@repo/api';
import { Button, Badge } from '@repo/ui';
import { IndianRupee, Gavel, CheckCircle2, Clock, GitFork, Loader2 } from 'lucide-react';
import { formatDateTime } from '@/components/common/admin/format';

interface PublicAuctionBiddingCardProps {
  auction: AuctionVM;
  participant: ParticipantVM | null;
  isLoggedIn: boolean;
  joining: boolean;
  onJoin: () => void;
  onOpenWizard: () => void;
  hasWorkflowSteps: boolean;
}

export function PublicAuctionBiddingCard({
  auction,
  participant,
  isLoggedIn,
  joining,
  onJoin,
  onOpenWizard,
  hasWorkflowSteps,
}: PublicAuctionBiddingCardProps) {
  const primaryUnit = auction.units?.[0] ?? auction.unit;
  const price = primaryUnit?.openingPrice;
  const startTime = auction.schedule?.startTime ?? auction.startTime;
  const endTime = auction.schedule?.endTime ?? auction.endTime;

  const isJoined = !!participant;

  return (
    <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-6">
      {/* Price Header */}
      <div className="space-y-1 bg-muted/30 p-4 rounded-2xl border border-border/50">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Opening Price
        </p>
        <div className="flex items-baseline gap-1 text-3xl font-extrabold text-foreground tracking-tight">
          <span className="text-emerald-600 dark:text-emerald-400">₹</span>
          <span>{price != null ? price.toLocaleString() : 'N/A'}</span>
        </div>
      </div>

      {/* Schedule Info */}
      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between py-1.5 border-b border-border/40">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" /> Start Time
          </span>
          <span className="font-semibold text-foreground">
            {startTime ? formatDateTime(startTime) : 'Not scheduled'}
          </span>
        </div>
        <div className="flex items-center justify-between py-1.5 border-b border-border/40">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" /> End Time
          </span>
          <span className="font-semibold text-foreground">
            {endTime ? formatDateTime(endTime) : 'Not scheduled'}
          </span>
        </div>
      </div>

      {/* Action CTA */}
      <div className="space-y-3 pt-2">
        {isJoined ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-2xl border border-emerald-500/30 text-xs font-semibold">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              You are registered for this auction
            </div>
            {hasWorkflowSteps && (
              <Button
                onClick={onOpenWizard}
                className="w-full gap-2 rounded-2xl font-semibold text-xs py-5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
              >
                <GitFork className="h-4 w-4" />
                Complete Registration Steps
              </Button>
            )}
          </div>
        ) : (
          <Button
            onClick={onJoin}
            disabled={joining}
            className="w-full gap-2 rounded-2xl font-semibold text-sm py-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all"
          >
            {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />}
            {isLoggedIn ? 'Register to Bid' : 'Sign in to Register'}
          </Button>
        )}
      </div>
    </div>
  );
}
