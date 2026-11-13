'use client';

import type { ReactNode } from 'react';
import {
  BadgeCheck,
  CalendarClock,
  Eye,
  Flag,
  ListChecks,
  Package,
  PackageX,
  Scale,
  ShieldCheck,
  Tag,
  Timer,
  TrendingUp,
  Trophy,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui';
import { currencySymbol } from '@/components/common/admin/format';
import { useAuctionWizard } from '../../../_context';
import {
  confirmationLabel,
  endTimeFor,
  formatDateTime,
  formatMoney,
  minimumLabel,
  noSaleLabel,
  softCloseLabel,
  tiesLabel,
  windowSummary,
  winnerLabel,
} from '../../../_lib/wizard/summary';
import { AuctionFacts } from './AuctionFacts';

/** One fact: an icon that names it on hover, and its value. */
function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <dt className="mt-px shrink-0 cursor-default text-muted-foreground">
            <Icon className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">{label}</span>
          </dt>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
      <dd className="min-w-0 text-[11px] leading-snug text-foreground">{children}</dd>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <dl className="space-y-1.5">{children}</dl>
    </div>
  );
}

const Muted = ({ children }: { children: ReactNode }) => (
  <span className="text-muted-foreground">{children}</span>
);

/** Sticky summary of the choices made so far, grouped by step. The auction's
 *  type, direction, access, mechanism and currency are icons beside the title. */
export function WizardSummary() {
  const { state, workflowCount, postWorkflowCount } = useAuctionWizard();
  const { basics, offer, schedule, participation } = state;
  const forward = basics.direction === 'FORWARD';
  const nouns = forward ? 'bidders' : 'suppliers';
  const money = (value: string) => formatMoney(value, basics.currencyUnit);
  const item = basics.items[0];
  const unit =
    basics.unitType === 'SINGLE_UNIT'
      ? item
        ? `${item.quantity} × ${basics.unitName || item.name}`
        : null
      : basics.items.length
        ? `${basics.unitName || 'Bundle'} · ${basics.items.length} item${basics.items.length === 1 ? '' : 's'}`
        : null;
  const windows = offer.mechanism === 'CLOCK' ? offer.clockWindows : offer.windows;
  const symbol = currencySymbol(basics.currencyUnit) || basics.currencyUnit;
  const closing = endTimeFor(schedule);
  const sees = {
    FULL: 'Best price and own rank',
    RANK: 'Own rank only',
    NOTHING: 'Nothing until close',
  }[offer.offerVisibility];
  const names = { ALIAS: 'Aliases', REAL: 'Real names', HIDDEN: 'Hidden' }[
    offer.participantVisibility
  ];

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
        <p className="text-xs font-semibold text-foreground">Summary</p>
        <AuctionFacts />
      </div>

      <div className="space-y-3 px-3 py-3">
        <Group title="Unit and price">
          <Row icon={Package} label={basics.unitType === 'SINGLE_UNIT' ? 'Single Unit' : 'Bundle'}>
            {unit ?? <Muted>No listing yet</Muted>}
          </Row>
          <Row icon={Tag} label={forward ? 'Opening price' : 'Starting price'}>
            {basics.openingPrice ? money(basics.openingPrice) : <Muted>Not set</Muted>}
          </Row>
          <Row icon={ShieldCheck} label={forward ? 'Reserve price' : 'Maximum price'}>
            {basics.reserveEnabled ? (
              <>
                {money(basics.reserveAmount)}{' '}
                <Muted>
                  ·{' '}
                  {basics.reserveVisibility === 'SHOWN'
                    ? 'shown'
                    : basics.reserveVisibility === 'MET_ONLY'
                      ? 'shown once met'
                      : 'hidden'}
                </Muted>
              </>
            ) : (
              <Muted>None</Muted>
            )}
          </Row>
        </Group>

        <Group title="Bidding">
          <Row icon={TrendingUp} label="Price progression">
            {offer.mechanism === 'SEALED' ? (
              <Muted>Not used (sealed)</Muted>
            ) : windows.length ? (
              windows.map((window) => windowSummary(window, symbol)).join(' → ')
            ) : (
              <Muted>No windows yet</Muted>
            )}
          </Row>
          {offer.mechanism !== 'SEALED' && (
            <Row icon={Eye} label={`What ${nouns} see`}>
              {sees}
            </Row>
          )}
          <Row icon={UserRound} label="Names">
            {names}
          </Row>
        </Group>

        <Group title="Schedule">
          <Row icon={CalendarClock} label="Bidding opens">
            {schedule.startTime ? formatDateTime(schedule.startTime) : <Muted>Not set</Muted>}
          </Row>
          {offer.mechanism !== 'CLOCK' && (
            <Row icon={Flag} label="Bidding closes">
              {closing ? (
                <>
                  {formatDateTime(closing)}
                  {schedule.endMode === 'DURATION' && (
                    <Muted>
                      {' '}
                      · {schedule.durationHours || 0}h {schedule.durationMinutes || 0}m
                    </Muted>
                  )}
                </>
              ) : (
                <Muted>Not set</Muted>
              )}
            </Row>
          )}
          <Row icon={Timer} label="Soft close">
            {offer.mechanism !== 'OPEN' || !schedule.softCloseEnabled ? (
              <Muted>Not used</Muted>
            ) : (
              softCloseLabel(schedule)
            )}
          </Row>
        </Group>

        <Group title="Participation">
          <Row icon={Users} label="Minimum participants">
            {participation.minimumEnabled ? minimumLabel(state) : <Muted>No minimum</Muted>}
          </Row>
          <Row icon={ListChecks} label="Workflow steps before the auction">
            {workflowCount} step{workflowCount === 1 ? '' : 's'} before
          </Row>
        </Group>

        <Group title="Award">
          <Row icon={Trophy} label="Who wins and what they pay">
            {winnerLabel(state)}
          </Row>
          <Row icon={Scale} label="Ties">
            {tiesLabel(state)}
          </Row>
          <Row icon={PackageX} label={forward ? 'If nothing sells' : 'If nothing is awarded'}>
            {noSaleLabel(state)}
          </Row>
          <Row icon={BadgeCheck} label="Confirming the result">
            {confirmationLabel(state)}
          </Row>
          <Row icon={ListChecks} label="Workflow steps after the auction">
            {postWorkflowCount} step{postWorkflowCount === 1 ? '' : 's'} after
          </Row>
        </Group>
      </div>
    </div>
  );
}
