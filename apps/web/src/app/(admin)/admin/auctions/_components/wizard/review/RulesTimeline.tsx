'use client';

import type { ReactNode } from 'react';
import {
  CalendarClock,
  ClipboardList,
  CreditCard,
  FileText,
  Flag,
  Gavel,
  Info,
  Landmark,
  Loader2,
  Lock,
  SquarePen,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@repo/ui';
import type { AuctionWorkflowStep } from '@repo/api';
import { paymentStepData, resolveStr } from '../../../_components/PolicyShared';
import type { PriceWindow, WizardState } from '../../../_lib/wizard/types';
import {
  endTimeFor,
  formatShortDate,
  formatTime,
  latestCloseFor,
  parseDuration,
  windowSummary,
} from '../../../_lib/wizard/summary';
import { offsetMinutes } from '../../../_lib/wizard/workflow';
import {
  buildTimeline,
  type TimelineIcon,
  type TimelineItem,
  type TimelinePhase,
} from './timeline';

const ITEM_ICON: Record<TimelineIcon, LucideIcon> = {
  terms: FileText,
  form: ClipboardList,
  custom: SquarePen,
  bank: Landmark,
  payment: CreditCard,
  policy: Zap,
  sealed: Lock,
};

const PHASE_STYLE: Record<TimelinePhase['id'], { box: string; icon: string; Icon: LucideIcon }> = {
  pre: { box: 'border-info/25 bg-info/5', icon: 'text-info', Icon: CalendarClock },
  during: { box: 'border-primary/30 bg-primary/10', icon: 'text-primary', Icon: Gavel },
  post: { box: 'border-success/25 bg-success/5', icon: 'text-success', Icon: Flag },
};

/** Proportional strip showing how the price windows divide the auction time. */
function WindowTrack({
  windows,
  symbol,
  start,
  closing,
  latestClose,
  softClose,
}: {
  windows: PriceWindow[];
  symbol: string;
  start: string;
  closing: string;
  latestClose: string;
  softClose: boolean;
}) {
  if (windows.length === 0) return null;
  const startMs = Date.parse(start);
  const closeMs = Date.parse(closing);
  const latestMs = Date.parse(latestClose);
  const timed = Number.isFinite(startMs) && Number.isFinite(closeMs) && closeMs > startMs;
  const total = timed ? (closeMs - startMs) / 60_000 : 120;

  const minutesOf = (window: PriceWindow) => {
    const { hours, minutes } = parseDuration(window.duration);
    return hours * 60 + minutes;
  };
  // Each window starts where the ones before it end; the last runs to the close.
  const starts = windows.map((_, index) =>
    windows.slice(0, index).reduce((acc, window) => acc + minutesOf(window), 0),
  );
  const segments = windows.map((window, index) => {
    const isLast = index === windows.length - 1;
    const from = starts[index]!;
    const length = isLast ? Math.max(total - from, total * 0.06) : Math.max(minutesOf(window), 1);
    return {
      key: window.id || `w-${index}`,
      label: `${index + 1} · ${windowSummary(window, symbol)}`,
      from,
      length,
    };
  });
  const extension =
    softClose && timed && Number.isFinite(latestMs) && latestMs > closeMs
      ? Math.max((latestMs - closeMs) / 60_000, total * 0.12)
      : softClose
        ? total * 0.25
        : 0;
  const sum = segments.reduce((acc, segment) => acc + segment.length, 0) + extension;
  const at = (minutes: number) =>
    timed ? formatTime(new Date(startMs + minutes * 60_000).toISOString()) : `+${minutes} min`;
  const tones = ['bg-primary/45', 'bg-primary/70', 'bg-primary'];
  const label = segments.map((segment) => `Window ${segment.label}`).join(', ');

  return (
    <div className="mt-3">
      <div
        role="img"
        aria-label={label + (extension ? ', continuing through any extension' : '')}
        className="flex h-[34px] overflow-hidden rounded-md border border-input"
      >
        {segments.map((segment, index) => (
          <div
            key={segment.key}
            style={{ flexGrow: segment.length }}
            className={cn(
              'flex min-w-0 basis-0 items-center overflow-hidden whitespace-nowrap border-r border-card px-2 text-[11px] font-bold tabular-nums text-primary-foreground',
              tones[index % tones.length],
            )}
          >
            <span className="truncate">{segment.label}</span>
          </div>
        ))}
        {extension > 0 && (
          <div
            style={{ flexGrow: extension }}
            className="flex min-w-0 basis-0 items-center overflow-hidden whitespace-nowrap bg-primary/20 px-2 text-[11px] font-bold text-foreground"
          >
            <span className="truncate">{windows.length} continues</span>
          </div>
        )}
      </div>
      <div className="relative mt-1 h-4 text-[10px] tabular-nums opacity-75">
        <span className="absolute left-0">{at(0)}</span>
        {segments.slice(1).map((segment) => (
          <span
            key={segment.key}
            className="absolute -translate-x-1/2"
            style={{ left: `${(segment.from / sum) * 100}%` }}
          >
            {at(segment.from)}
          </span>
        ))}
        <span className="absolute right-0">
          {timed ? formatTime(new Date(closeMs).toISOString()) : 'Close'}
          {extension > 0 && Number.isFinite(latestMs) && latestMs > closeMs
            ? ` → ${formatTime(new Date(latestMs).toISOString())}`
            : ''}
        </span>
      </div>
    </div>
  );
}

/** The time tag at the top of each card. Its left end tapers into a curve that
 *  cups the item's dot on the rail. */
function TimeTag({ item }: { item: TimelineItem }) {
  return (
    <div
      className={cn(
        'relative -ml-[19px] flex h-[54px] max-w-full shrink-0 flex-col justify-center whitespace-nowrap border-2 border-l-0 pl-2 pr-4',
        item.policy ? 'border-policy bg-policy-raise' : 'border-foreground bg-secondary',
      )}
    >
      <svg
        className="absolute -left-[28px] -top-[2px] h-[54px] w-[28px] overflow-visible"
        viewBox="0 0 28 54"
        aria-hidden
      >
        <path
          className={item.policy ? 'fill-policy-raise' : 'fill-secondary'}
          d="M28 0L1.87 9A24 24 0 0 1 1.87 45L28 54Z"
        />
        <path
          className={cn('fill-none', item.policy ? 'stroke-policy' : 'stroke-foreground')}
          strokeWidth={2}
          strokeLinejoin="round"
          d="M28 1L1.87 9A24 24 0 0 1 1.87 45L28 53"
        />
      </svg>
      <b
        className={cn(
          'text-[13px] font-semibold tabular-nums',
          item.policy ? 'text-policy-foreground' : 'text-foreground/85',
        )}
      >
        {item.timeMain}
      </b>
      <span
        className={cn(
          'text-[11px]',
          item.policy ? 'text-policy-foreground/70' : 'text-muted-foreground',
        )}
      >
        {item.timeSub}
      </span>
    </div>
  );
}

function Tag({
  children,
  tone,
  onPolicy,
}: {
  children: string;
  tone: 'step' | 'policy' | 'default' | 'optional' | 'dark' | 'ok';
  onPolicy: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center whitespace-nowrap rounded-full border px-2 text-[10px] font-semibold',
        tone === 'policy' &&
          'border-transparent bg-[image:var(--gradient-gold)] text-primary-foreground',
        tone !== 'policy' &&
          onPolicy &&
          'border-transparent bg-policy-foreground/10 text-policy-foreground/90',
        !onPolicy && tone === 'step' && 'border-foreground bg-card text-foreground',
        !onPolicy &&
          tone === 'default' &&
          'border-transparent bg-secondary text-secondary-foreground',
        !onPolicy && tone === 'optional' && 'border-input bg-card text-muted-foreground',
        !onPolicy && tone === 'dark' && 'border-transparent bg-foreground text-background',
        !onPolicy && tone === 'ok' && 'border-success/30 bg-success/10 text-success',
      )}
    >
      {children}
    </span>
  );
}

function ItemCard({ item, track }: { item: TimelineItem; track: ReactNode }) {
  const muted = item.policy ? 'text-policy-foreground/75' : 'text-muted-foreground';
  return (
    <article
      className={cn(
        'relative rounded-md border px-[18px] pb-4 pt-3.5',
        item.policy
          ? 'border-policy bg-policy text-policy-foreground'
          : 'border-border bg-card text-card-foreground shadow-sm',
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <TimeTag item={item} />
        <div className="flex min-w-0 flex-[1_1_240px] flex-wrap items-center gap-x-2.5 gap-y-1.5">
          {item.n !== undefined && (
            <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background">
              {item.n}
            </span>
          )}
          <h4 className="text-sm font-semibold">{item.name}</h4>
          <Tag tone={item.policy ? 'policy' : 'step'} onPolicy={item.policy}>
            {item.tag}
          </Tag>
          {item.req && (
            <Tag tone={item.req.tone} onPolicy={item.policy}>
              {item.req.label}
            </Tag>
          )}
        </div>
      </div>

      <p
        className={cn(
          'mt-2 text-xs leading-relaxed',
          item.policy ? 'text-policy-foreground/80' : 'text-foreground/80',
        )}
      >
        {item.desc}
      </p>

      {item.chips && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {item.chips.map((chip) => (
            <span
              key={chip}
              className="inline-flex h-6 items-center rounded-full border border-dashed border-muted-foreground/50 bg-muted/35 px-2.5 text-[11px]"
            >
              {chip}
            </span>
          ))}
        </div>
      )}

      {item.heads && (
        <div className="mt-2.5 divide-y divide-border overflow-hidden rounded-md border border-border">
          {item.heads.map((head, index) => (
            <div
              key={`${head.name}-${index}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 bg-muted/35 px-3 py-2 text-xs sm:grid-cols-[minmax(0,1fr)_auto_auto]"
            >
              <span className="min-w-0">
                <b className="font-semibold">{head.name}</b>
                <span className={muted}> · {head.sub}</span>
              </span>
              <Tag tone={head.refundable ? 'ok' : 'default'} onPolicy={item.policy}>
                {head.refundable ? 'Refundable' : 'Not refundable'}
              </Tag>
              <span className="tabular-nums sm:text-right">{head.amount}</span>
            </div>
          ))}
        </div>
      )}

      {item.track && track}

      {item.terms && (
        <details className="mt-2.5">
          <summary className="flex min-h-8 w-fit cursor-pointer items-center rounded-sm text-xs font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Read the terms
          </summary>
          <ol className="mt-2 list-decimal space-y-1 rounded-md bg-muted/45 py-2.5 pl-8 pr-3 text-xs leading-relaxed">
            {item.terms.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ol>
        </details>
      )}

      {item.details && (
        <details className="mt-2.5">
          <summary className="flex min-h-8 w-fit cursor-pointer items-center rounded-sm text-xs font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {item.details.title}
          </summary>
          <dl
            className={cn(
              'mt-1.5 grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] gap-x-4 gap-y-1.5 rounded-md border border-dashed px-3 py-2.5 text-xs',
              item.policy ? 'border-policy-foreground/25' : 'border-input',
            )}
          >
            {item.details.rows.map((row) => (
              <div key={row.k} className="contents">
                <dt className={muted}>{row.k}</dt>
                <dd className="break-words font-mono text-[11px]">{row.v}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      {item.note && (
        <div
          className={cn(
            'mt-3 flex items-start gap-2 rounded-md px-3 py-2.5 text-xs leading-snug',
            item.policy
              ? 'bg-policy-foreground/10 text-policy-foreground/90'
              : item.note.tone === 'success'
                ? 'bg-success/10 text-success'
                : 'bg-muted/60 text-foreground/80',
          )}
        >
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{item.note.text}</span>
        </div>
      )}
    </article>
  );
}

function PhaseBlock({ phase, track }: { phase: TimelinePhase; track: ReactNode }) {
  const style = PHASE_STYLE[phase.id];
  const items = phase.groups.flatMap((group) => group.items);
  const position = (item: TimelineItem) => items.indexOf(item);

  return (
    <section
      aria-label={phase.title}
      className={cn('rounded-lg border px-3 pb-1.5 pt-4 sm:px-5', style.box)}
    >
      <div className="mb-4 flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-card/85',
            style.icon,
          )}
        >
          <style.Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <div className="min-w-0">
          <h4 className="text-[15px] font-semibold text-foreground">{phase.title}</h4>
          <p className="mt-px text-xs text-muted-foreground">{phase.sub}</p>
        </div>
        <span className="ml-auto inline-flex min-h-[30px] items-center rounded-full bg-card/85 px-3 text-xs font-medium tabular-nums text-foreground">
          {phase.range}
        </span>
      </div>

      <div className="pb-3.5">
        {phase.groups.map((group) => (
          <div key={group.key} role="group" aria-label={group.label} className="relative">
            {group.same && (
              <span
                aria-hidden
                className="absolute -left-2.5 bottom-5 top-4 w-14 rounded-[28px] border-[1.5px] border-dashed border-foreground/45 bg-card/50"
              />
            )}
            {group.items.map((item) => {
              const index = position(item);
              const Icon = ITEM_ICON[item.icon];
              return (
                <div key={item.key} className="grid grid-cols-[36px_minmax(0,1fr)] gap-x-6">
                  <div className="relative" aria-hidden>
                    {items.length > 1 && (
                      <span
                        className={cn(
                          'absolute left-1/2 -ml-px w-0.5 bg-foreground/15',
                          index === 0
                            ? 'bottom-0 top-[42px]'
                            : index === items.length - 1
                              ? 'top-0 h-[42px]'
                              : 'inset-y-0',
                        )}
                      />
                    )}
                    {item.span && (
                      <span
                        className={cn(
                          'absolute left-1/2 top-[42px] -ml-1 w-2 rounded bg-foreground/30',
                          item.span === 'long' ? '-bottom-[60px]' : 'bottom-3',
                        )}
                      />
                    )}
                    <span
                      className={cn(
                        'absolute left-1/2 top-6 z-[1] -ml-[18px] flex h-9 w-9 items-center justify-center border-2',
                        item.policy
                          ? 'rounded-md border-policy bg-policy text-primary'
                          : 'rounded-full border-foreground bg-card text-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="min-w-0 pb-4">
                    <ItemCard item={item} track={track} />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function milestone(input: string, minutes = 0): string {
  if (!input) return 'Not set';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return 'Not set';
  date.setMinutes(date.getMinutes() + minutes);
  return `${formatShortDate(date.toISOString())} · ${formatTime(date.toISOString())}`;
}

function opensIn(start: string): string {
  if (!start) return 'No start time yet';
  const date = new Date(start);
  if (Number.isNaN(date.getTime())) return 'No start time yet';
  const diff = date.getTime() - Date.now();
  if (diff <= 0) return 'Started';
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  if (days > 0) return `Opens in ${days} d ${hours} h`;
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return `Opens in ${hours} h ${minutes} min`;
}

/** Three-phase rules timeline (pre, during, post) on a vertical rail, plus the
 *  key moments and legend. */
export function RulesTimeline({
  state,
  preSteps,
  postSteps,
  loadingSteps,
  stepsError,
  workflowCount,
  postWorkflowCount,
  published,
}: {
  state: WizardState;
  preSteps: AuctionWorkflowStep[];
  postSteps: AuctionWorkflowStep[];
  loadingSteps: boolean;
  stepsError: string | null;
  workflowCount: number;
  postWorkflowCount: number;
  published: boolean;
}) {
  const { basics, offer, schedule, participation } = state;
  const symbol = basics.currencyUnit === 'INR' ? '₹' : basics.currencyUnit;
  const start = schedule.startTime;
  const closing = endTimeFor(schedule);
  const latestClose = latestCloseFor(schedule);
  const sealed = offer.mechanism === 'SEALED';
  const softClose = schedule.softCloseEnabled && offer.mechanism === 'OPEN';
  const phases = buildTimeline(state, preSteps, postSteps);

  const paymentStep = postSteps.find((step) => resolveStr(step.type) === 'PAYMENT_STEP');
  const paymentOffset = paymentStep ? paymentStepData(paymentStep).offset : undefined;

  const policyCount = (participation.minimumEnabled ? 1 : 0) + (sealed ? 0 : softClose ? 2 : 1) + 3;
  const stepCount = workflowCount + postWorkflowCount;

  const track = (
    <WindowTrack
      windows={offer.windows}
      symbol={symbol}
      start={start}
      closing={closing}
      latestClose={latestClose}
      softClose={softClose}
    />
  );

  return (
    <>
      <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-border bg-muted/20 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-foreground">Auction rules timeline</h3>
        <p className="ml-auto text-[11px] text-muted-foreground">
          {policyCount} {policyCount === 1 ? 'policy' : 'policies'} · {stepCount} workflow step
          {stepCount === 1 ? '' : 's'} · across 3 phases
        </p>
      </header>

      <div className="grid gap-4 p-3 sm:p-4 xl:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0 space-y-3">
          {loadingSteps ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading timeline…
            </div>
          ) : (
            phases.map((phase) => <PhaseBlock key={phase.id} phase={phase} track={track} />)
          )}

          {stepsError && (
            <p className="rounded bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
              {stepsError}
            </p>
          )}
        </div>

        <aside aria-label="Key moments and legend" className="space-y-3">
          <div className="rounded-md bg-policy p-4 text-policy-foreground">
            <span className="inline-flex rounded-full bg-[image:var(--gradient-gold)] px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
              {published ? 'Published' : 'Upcoming'}
            </span>
            <p className="mt-2 font-display text-base font-semibold">{opensIn(start)}</p>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-policy-foreground/15 pt-3 text-xs">
              {participation.minimumEnabled && (
                <>
                  <dt className="text-policy-foreground/70">Minimum check</dt>
                  <dd className="text-right tabular-nums">
                    {start
                      ? milestone(
                          start,
                          -(
                            (parseInt(participation.checkDays, 10) || 0) * 1440 +
                            (parseInt(participation.checkHours, 10) || 0) * 60 +
                            (parseInt(participation.checkMinutes, 10) || 0)
                          ),
                        )
                      : 'Set the start'}
                  </dd>
                </>
              )}
              <dt className="text-policy-foreground/70">Bidding</dt>
              <dd className="text-right tabular-nums">
                {start ? milestone(start) : 'Set the start'} →{' '}
                {closing ? formatTime(closing) : 'close'}
              </dd>
              <dt className="text-policy-foreground/70">Latest close</dt>
              <dd className="text-right tabular-nums">
                {latestClose ? milestone(latestClose) : 'Set the start'}
              </dd>
              <dt className="text-policy-foreground/70">Winner pays by</dt>
              <dd className="text-right tabular-nums">
                {closing
                  ? paymentOffset
                    ? milestone(new Date(closing).toISOString(), offsetMinutes(paymentOffset))
                    : `${formatShortDate(closing)} + payment window`
                  : 'Set the start'}
              </dd>
            </dl>
          </div>

          <div className="rounded-md border border-border bg-card p-4 text-xs text-muted-foreground">
            <h4 className="text-[13px] font-semibold text-foreground">Reading the timeline</h4>
            <ul className="mt-2.5 space-y-2.5">
              <li className="flex items-center gap-3">
                <span
                  className="h-5 w-7 shrink-0 rounded-sm border-2 border-foreground bg-card"
                  aria-hidden
                />
                White card · workflow step (a participant does it)
              </li>
              <li className="flex items-center gap-3">
                <span className="h-5 w-7 shrink-0 rounded-sm bg-policy" aria-hidden />
                Dark card · policy (applied automatically)
              </li>
              <li className="flex items-center gap-3">
                <span
                  className="h-5 w-7 shrink-0 rounded-full border-[1.5px] border-dashed border-foreground/45"
                  aria-hidden
                />
                Rows inside a dashed capsule happen at the same moment
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-5 w-7 shrink-0 justify-center" aria-hidden>
                  <span className="w-2 rounded bg-foreground/30" />
                </span>
                Runs over a span of time
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
