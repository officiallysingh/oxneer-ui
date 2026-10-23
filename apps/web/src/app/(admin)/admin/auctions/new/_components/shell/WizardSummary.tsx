'use client';

import type { ReactNode } from 'react';
import type { InviteStats, WizardState } from '../shared/types';
import {
  formatDateTime,
  formatMoney,
  minimumLabel,
  softCloseLabel,
  winnerLabel,
} from '../shared/summary';

function SummaryItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-medium text-muted-foreground">{label}</dt>
      <dd className="text-[11px] font-semibold leading-snug text-foreground">{value}</dd>
    </div>
  );
}

/** Sticky summary of the choices made so far. */
export function WizardSummary({
  state,
  workflowCount,
  postWorkflowCount,
  published,
  inviteStats,
}: {
  state: WizardState;
  workflowCount: number;
  postWorkflowCount: number;
  published?: boolean;
  inviteStats?: InviteStats | null;
}) {
  const { basics, offer, schedule } = state;
  const isPrivate = basics.accessibility === 'PRIVATE';
  const item = basics.items[0];
  const unit =
    basics.unitType === 'SINGLE_UNIT'
      ? item
        ? `Single Unit · ${item.quantity} × ${basics.unitName || item.name}`
        : 'Single Unit · no listing yet'
      : `Bundle · ${basics.items.length} item${basics.items.length === 1 ? '' : 's'}`;

  return (
    <div className="rounded-lg border border-border bg-card">
      <p className="border-b border-border px-3 py-2 text-xs font-semibold text-foreground">
        Summary
      </p>
      <dl className="space-y-2.5 px-3 py-3">
        <SummaryItem label="Auction type" value="SIMPLE" />
        <SummaryItem
          label="Direction"
          value={basics.direction === 'FORWARD' ? 'Forward (selling)' : 'Reverse (buying)'}
        />
        <SummaryItem
          label="Who can join"
          value={
            isPrivate
              ? published
                ? `Private${inviteStats ? ` · ${inviteStats.invited} invited` : ''}`
                : 'Private · invite after publishing'
              : 'Public'
          }
        />
        <SummaryItem label="Unit" value={unit} />
        <SummaryItem
          label={basics.direction === 'FORWARD' ? 'Opening price' : 'Starting price'}
          value={
            basics.openingPrice ? formatMoney(basics.openingPrice, basics.currencyUnit) : 'Not set'
          }
        />
        <SummaryItem
          label="Reserve"
          value={
            basics.reserveEnabled
              ? `${formatMoney(basics.reserveAmount, basics.currencyUnit)} · ${
                  basics.reserveVisibility === 'SHOWN'
                    ? 'shown'
                    : basics.reserveVisibility === 'MET_ONLY'
                      ? 'shown once met'
                      : 'hidden'
                }`
              : 'None'
          }
        />
        <SummaryItem
          label="Mechanism"
          value={
            offer.mechanism === 'OPEN' ? 'Open' : offer.mechanism === 'CLOCK' ? 'Clock' : 'Sealed'
          }
        />
        <SummaryItem
          label="Price progression"
          value={
            offer.mechanism === 'SEALED'
              ? 'Not used (sealed)'
              : `${offer.windows.length} window${offer.windows.length === 1 ? '' : 's'}`
          }
        />
        <SummaryItem label="Starts" value={formatDateTime(schedule.startTime)} />
        <SummaryItem
          label="Soft close"
          value={
            offer.mechanism === 'SEALED' || !schedule.softCloseEnabled
              ? 'Not used'
              : softCloseLabel(schedule)
          }
        />
        <SummaryItem label="Winner" value={winnerLabel(state)} />
        <SummaryItem label="Steps" value={`${workflowCount} before · ${postWorkflowCount} after`} />
        <SummaryItem label="Minimum participants" value={minimumLabel(state)} />
      </dl>
    </div>
  );
}
