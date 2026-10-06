'use client';

import { ArrowDown, ArrowUp, Globe, Info, Lock, TrendingUp, Users } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui';
import type { AuctionVM } from '@repo/api';
import { formatLabel, resolveStr } from '@/components/common/admin/format';

export function DirectionCell({ value }: { value?: unknown }) {
  const str = resolveStr(value);
  if (!str) return <span className="text-xs text-muted-foreground">—</span>;
  const isForward = str === 'FORWARD';
  const Icon = isForward ? ArrowUp : ArrowDown;
  const label = formatLabel(str);
  const detail = isForward
    ? 'Buyers bid upward — highest price wins'
    : 'Sellers bid downward — lowest price wins';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center gap-1.5 cursor-default rounded-full px-2 py-0.5 text-xs font-medium border ${
            isForward
              ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-700 border-amber-500/30'
          }`}
        >
          <Icon className="h-3 w-3 shrink-0" />
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[180px] text-xs text-center">
        {detail}
      </TooltipContent>
    </Tooltip>
  );
}

export function AccessibilityCell({ value }: { value?: unknown }) {
  const str = resolveStr(value);
  if (!str) return <span className="text-xs text-muted-foreground">—</span>;
  const isPublic = str === 'PUBLIC';
  const Icon = isPublic ? Globe : Lock;
  const label = formatLabel(str);
  const detail = isPublic
    ? 'Open to all participants — no invite required'
    : 'Restricted access — participants must be invited';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center gap-1.5 cursor-default rounded-full px-2 py-0.5 text-xs font-medium border ${
            isPublic
              ? 'bg-blue-500/10 text-blue-700 border-blue-500/30'
              : 'bg-violet-500/10 text-violet-700 border-violet-500/30'
          }`}
        >
          <Icon className="h-3 w-3 shrink-0" />
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px] text-xs text-center">
        {detail}
      </TooltipContent>
    </Tooltip>
  );
}

export function ProtocolDetailsCell({ auction }: { auction: AuctionVM }) {
  const participantVis = resolveStr(auction.protocol?.participantVisibility);
  const offerVis = resolveStr(auction.protocol?.offerVisibility);
  if (!participantVis && !offerVis) return <span className="text-xs text-muted-foreground">—</span>;

  const participantLabel = participantVis ? formatLabel(participantVis) : null;
  const offerLabel = offerVis ? formatLabel(offerVis) : null;

  const tooltipContent = (
    <div className="space-y-2 text-xs min-w-[180px]">
      {participantLabel && (
        <div>
          <p className="font-semibold text-foreground/80 flex items-center gap-1">
            <Users className="h-3 w-3" /> Participant Visibility
          </p>
          <p className="text-muted-foreground mt-0.5">Identity visible to everyone</p>
          <p className="font-medium">{participantLabel}</p>
        </div>
      )}
      {offerLabel && (
        <div className={participantLabel ? 'pt-1.5 border-t border-border/40' : ''}>
          <p className="font-semibold text-foreground/80 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Offer Visibility
          </p>
          <p className="text-muted-foreground mt-0.5">Both price and rank visible to everyone</p>
          <p className="font-medium">{offerLabel}</p>
        </div>
      )}
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="p-3">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}
