'use client';

import type { ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Coins,
  EyeOff,
  Gavel,
  Globe,
  Layers,
  Lock,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui';
import { useAuctionWizard } from '../../../_context';

function Fact({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  /** What the chip is, e.g. "Direction". */
  label: string;
  value: string;
  detail: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <li
          tabIndex={0}
          aria-label={`${label}: ${value}`}
          className="flex h-6 w-6 cursor-default items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </li>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[240px] text-xs">
        <p className="font-semibold">
          {label}: {value}
        </p>
        <p className="mt-0.5 text-muted-foreground">{detail}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/** What kind of auction this is, as icons: hover or focus one for its value and
 *  meaning. Sits on the right of the Summary heading. */
export function AuctionFacts() {
  const { state, published, inviteStats } = useAuctionWizard();
  const { basics, offer } = state;
  const forward = basics.direction === 'FORWARD';
  const isPrivate = basics.accessibility === 'PRIVATE';
  const mechanism = {
    OPEN: {
      icon: Gavel,
      value: 'Open',
      detail: `${forward ? 'Bidders' : 'Suppliers'} post prices that beat the current price.`,
    },
    CLOCK: {
      icon: Timer,
      value: 'Clock',
      detail: `The platform ${forward ? 'raises' : 'lowers'} the price on a timer.`,
    },
    SEALED: {
      icon: EyeOff,
      value: 'Sealed',
      detail: `Hidden ${forward ? 'bids' : 'asks'} by a deadline, opened together.`,
    },
  }[offer.mechanism];

  return (
    <ul aria-label="Auction type" className="flex items-center gap-1">
      <Fact icon={Layers} label="Auction type" value="Simple" detail="One unit, one round." />
      <Fact
        icon={forward ? ArrowUp : ArrowDown}
        label="Direction"
        value={forward ? 'Forward' : 'Reverse'}
        detail={
          forward
            ? 'Selling. Buyers bid the price up and the highest bid wins.'
            : 'Buying. Suppliers bid the price down and the lowest ask wins.'
        }
      />
      <Fact
        icon={isPrivate ? Lock : Globe}
        label="Who can join"
        value={
          isPrivate && published && inviteStats
            ? `Private · ${inviteStats.invited} invited`
            : isPrivate
              ? 'Private'
              : 'Public'
        }
        detail={
          isPrivate
            ? published
              ? 'Only the people you invite.'
              : 'Only the people you invite, once it’s published.'
            : 'Any registered user can join.'
        }
      />
      <Fact
        icon={mechanism.icon}
        label="Mechanism"
        value={mechanism.value}
        detail={mechanism.detail}
      />
      <Fact
        icon={Coins}
        label="Regional settings"
        value={basics.currencyUnit}
        detail={`${basics.currencyUnit} · ${basics.timeZone} · rounding ${basics.roundingMode
          .toLowerCase()
          .replace(/_/g, ' ')}`}
      />
    </ul>
  );
}
