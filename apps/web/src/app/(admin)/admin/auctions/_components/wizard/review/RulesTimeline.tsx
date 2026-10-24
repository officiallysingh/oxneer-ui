'use client';

import type { ReactNode } from 'react';
import { Check, Clock, Loader2 } from 'lucide-react';
import { cn } from '@repo/ui';
import type { AuctionWorkflowStep } from '@repo/api';
import { paymentStepData, resolveStr } from '../../../_components/PolicyShared';
import type { PriceWindow, WizardState } from '../../../_lib/wizard/types';
import { PolicyBadge } from '../ui/wizard-ui';
import {
  formatDateTime,
  formatDuration,
  formatShortDate,
  formatTime,
  latestCloseFor,
  endTimeFor,
  offsetLabelParts,
  parseDuration,
  softCloseLabel,
  tiesLabel,
  winnerBase,
  winnerLabel,
  windowSummary,
} from '../../../_lib/wizard/summary';
import {
  WORKFLOW_TYPE_DESCRIPTION,
  deadlineFor,
  headValue,
  offsetMinutes,
  postDeadlineFor,
  stepFields,
  stepTitle,
} from '../../../_lib/wizard/workflow';

function PhaseCard({
  phase,
  icon,
  meta,
  right,
  children,
}: {
  phase: string;
  icon: ReactNode;
  meta: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-border">
      <header className="flex flex-wrap items-center gap-2 bg-info/5 px-3 py-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-info/30 bg-info/10 text-info">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">{phase}</p>
          <p className="text-[10px] text-muted-foreground">{meta}</p>
        </div>
        {right && <div className="ml-auto text-[10px] text-muted-foreground">{right}</div>}
      </header>
      <div className="space-y-2 bg-background p-2.5">{children}</div>
    </section>
  );
}

function WorkflowCard({
  step,
  index,
  start,
  bidWord,
  post,
}: {
  step: AuctionWorkflowStep;
  index: number;
  start: string;
  bidWord: string;
  post?: boolean;
}) {
  const type = resolveStr(step.type);
  const fields = stepFields(step);
  const data = paymentStepData(step);
  return (
    <article className="rounded-md border border-border bg-card px-3 py-2.5">
      <div className="flex flex-wrap items-start gap-2">
        <div className="w-28 shrink-0 text-[10px] leading-snug text-muted-foreground">
          {post ? postDeadlineFor(step) : deadlineFor(step, start)}
        </div>
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground">
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground">{stepTitle(step)}</span>
            <span className="rounded-full border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground">
              Workflow step
            </span>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-foreground">
              Required
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            {step.description ||
              WORKFLOW_TYPE_DESCRIPTION[type] ||
              'Participants complete this step.'}
          </p>
          {type === 'TNC_FORM_STEP' &&
            (step.tncText ? (
              <div className="mt-1.5 space-y-0.5 rounded border border-border/60 bg-muted/20 px-2 py-1.5">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Terms
                </p>
                {step.tncText
                  .split(/\n+/)
                  .filter(Boolean)
                  .slice(0, 3)
                  .map((line, lineIndex) => (
                    <p key={lineIndex} className="text-[10px] leading-snug text-muted-foreground">
                      {line}
                    </p>
                  ))}
              </div>
            ) : (
              <p className="mt-1.5 text-[10px] text-info">Terms document attached.</p>
            ))}
          {type === 'PARTICIPATION_FORM_STEP' && step.manualApproval && (
            <p className="mt-1.5 text-[10px] text-warning">
              You approve each participant after they submit.
            </p>
          )}
          {fields.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {fields.map((field) => (
                <span
                  key={field}
                  className="rounded-full border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground"
                >
                  {field}
                </span>
              ))}
            </div>
          )}
          {type === 'PAYMENT_STEP' && data.heads.length > 0 && (
            <div className="mt-1.5 divide-y divide-border/60 rounded border border-border/60">
              {data.heads.map((head, headIndex) => (
                <div
                  key={`${head.name}-${headIndex}`}
                  className="flex flex-wrap items-center gap-2 px-2 py-1 text-[10px]"
                >
                  <span className="font-medium text-foreground">{head.name}</span>
                  <span className="text-muted-foreground">{head.description}</span>
                  <span className="ml-auto text-muted-foreground">
                    {head.refundable ? 'Refundable' : 'Not refundable'}
                  </span>
                  <span className="tabular-nums text-foreground">
                    {headValue(head, bidWord === 'ask' ? 'winning ask' : 'winning price')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function PolicySummaryCard({
  title,
  timing,
  children,
}: {
  title: string;
  timing: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-md border border-border bg-card px-3 py-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary">
          <Check className="h-3 w-3" aria-hidden />
        </span>
        <span className="text-xs font-semibold text-foreground">{title}</span>
        <PolicyBadge />
        <span className="ml-auto text-[10px] text-muted-foreground">{timing}</span>
      </div>
      <p className="mt-1 pl-7 text-[11px] leading-snug text-muted-foreground">{children}</p>
    </article>
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

interface TimelineSegment {
  key: string;
  label: string;
  start: number;
  end: number;
  extension: boolean;
}

/** Proportional bar showing how each price window divides the auction time. */
function WindowTimeline({
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

  const spans = windows.map((window) => {
    const duration = parseDuration(window.duration);
    return (duration.hours * 60 + duration.minutes) * 60_000;
  });
  const cumulative = spans.map((_, index) =>
    spans.slice(0, index).reduce((total, span) => total + span, 0),
  );

  const segments: TimelineSegment[] = windows.map((window, index) => {
    const isLast = index === windows.length - 1;
    const startAt = timed ? Math.min(startMs + (cumulative[index] ?? 0), closeMs) : index;
    const end = timed
      ? isLast
        ? closeMs
        : Math.min(startAt + Math.max(spans[index] ?? 1, 1), closeMs)
      : index + 1;
    return {
      key: window.id || `window-${index}`,
      label: `${index + 1} · ${windowSummary(window, symbol)}`,
      start: startAt,
      end,
      extension: false,
    };
  });

  if (softClose && timed && Number.isFinite(latestMs) && latestMs > closeMs) {
    segments.push({
      key: 'extensions',
      label: 'Extensions',
      start: closeMs,
      end: latestMs,
      extension: true,
    });
  }

  return (
    <div className="mt-1.5">
      <div className="flex overflow-hidden rounded-md border border-border">
        {segments.map((segment) => (
          <div
            key={segment.key}
            title={segment.label}
            style={{ flexGrow: Math.max(segment.end - segment.start, 1) }}
            className={cn(
              'flex min-w-0 items-center justify-center border-r border-background/25 px-1 py-1 text-[9px] font-medium last:border-r-0',
              segment.extension
                ? 'bg-warning/25 text-foreground'
                : 'bg-primary text-primary-foreground',
            )}
          >
            <span className="truncate">{segment.label}</span>
          </div>
        ))}
      </div>
      {timed && (
        <div className="mt-0.5 flex text-[9px] text-muted-foreground">
          <span className="shrink-0">{formatTime(new Date(startMs).toISOString())}</span>
          {segments.map((segment) => (
            <span
              key={segment.key}
              style={{ flexGrow: Math.max(segment.end - segment.start, 1) }}
              className="min-w-0 text-right"
            >
              {formatTime(new Date(segment.end).toISOString())}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Three-phase timeline (pre, during, post) plus the key dates sidebar. */
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
  const bidWord = basics.direction === 'FORWARD' ? 'bid' : 'ask';
  const bidderWord = basics.direction === 'FORWARD' ? 'bidder' : 'supplier';
  const lastWindow = offer.windows[offer.windows.length - 1];

  const paymentStep = postSteps.find((step) => resolveStr(step.type) === 'PAYMENT_STEP');
  const paymentOffset = paymentStep
    ? (paymentStep.offset ?? paymentStepData(paymentStep).offset)
    : undefined;

  const progressionText =
    offer.mechanism === 'SEALED'
      ? 'no price progression'
      : `${offer.windows.length} window${offer.windows.length === 1 ? '' : 's'}`;

  const policyCount =
    1 + (offer.mechanism !== 'SEALED' ? 1 : 0) + (schedule.softCloseEnabled ? 1 : 0) + 3;
  const phaseCount = 3;

  return (
    <>
      <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-border bg-muted/20 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-foreground">Auction rules timeline</h3>
        <p className="ml-auto text-[10px] text-muted-foreground">
          {policyCount} policies · {workflowCount + postWorkflowCount} workflow steps · across{' '}
          {phaseCount} phases
        </p>
      </header>

      <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_200px]">
        <div className="space-y-2">
          {loadingSteps ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading timeline…
            </div>
          ) : (
            <>
              <PhaseCard
                phase="Pre auction"
                icon={<Clock className="h-3 w-3" aria-hidden />}
                meta={`${preSteps.length} workflow step${preSteps.length === 1 ? '' : 's'} · ${
                  participation.minimumEnabled ? 1 : 0
                } policy`}
                right={start ? `until ${formatDateTime(start)}` : 'until the start'}
              >
                {preSteps.length === 0 ? (
                  <p className="px-1 py-2 text-[11px] text-muted-foreground">
                    No steps before the auction.
                  </p>
                ) : (
                  preSteps.map((step, index) => (
                    <WorkflowCard
                      key={step.id}
                      step={step}
                      index={index + 1}
                      start={start}
                      bidWord={bidWord}
                    />
                  ))
                )}
                {participation.minimumEnabled && (
                  <article className="rounded-md bg-foreground px-3 py-2 text-background">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" aria-hidden />
                      </span>
                      <span className="text-xs font-semibold">Minimum participants</span>
                      <PolicyBadge />
                      <span className="ml-auto text-[10px] text-background/60">
                        {offsetLabelParts(
                          `PT${(parseInt(participation.checkDays, 10) || 0) * 24 + (parseInt(participation.checkHours, 10) || 0)}H${
                            parseInt(participation.checkMinutes, 10) || 0
                          }M`,
                          'start',
                        ) || 'at the start'}
                      </span>
                    </div>
                    <p className="mt-1 pl-7 text-[10px] leading-snug text-background/70">
                      Fewer than {participation.minimumCount} ready and the auction is cancelled
                      automatically.
                    </p>
                  </article>
                )}
              </PhaseCard>

              <PhaseCard
                phase="During auction"
                icon={<Clock className="h-3 w-3" aria-hidden />}
                meta={
                  offer.mechanism === 'SEALED'
                    ? `No policies · sealed ${bidWord}s, no workflow steps`
                    : `${schedule.softCloseEnabled ? 2 : 1} policies · participants just place ${bidWord}s, no workflow steps`
                }
                right={
                  start && closing
                    ? `${formatDateTime(start)} → ${formatTime(closing)}`
                    : 'start → close'
                }
              >
                {offer.mechanism === 'SEALED' ? (
                  <article className="rounded-md border border-border bg-card px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground">Sealed bids</span>
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                        Opened at the close
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Each {bidderWord} submits a hidden {bidWord}. They can revise it until the
                      deadline. Nobody sees any {bidWord} until the opening.
                    </p>
                  </article>
                ) : (
                  <>
                    <article className="rounded-md border border-border bg-card px-3 py-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground">
                          Price progression
                        </span>
                        <PolicyBadge />
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {progressionText}
                        </span>
                      </div>
                      <WindowTimeline
                        windows={offer.windows}
                        symbol={symbol}
                        start={start}
                        closing={closing}
                        latestClose={latestClose}
                        softClose={schedule.softCloseEnabled}
                      />
                      <p className="mt-1.5 text-[10px] font-medium text-muted-foreground">
                        Window details
                      </p>
                      <ul className="mt-0.5 space-y-0.5 pl-1 text-[10px] text-muted-foreground">
                        {offer.windows.map((window, index) => (
                          <li key={window.id}>
                            <span className="font-medium text-foreground">Window {index + 1}</span>{' '}
                            · {windowSummary(window, symbol)} · {formatDuration(window.duration)}
                          </li>
                        ))}
                      </ul>
                    </article>
                    {schedule.softCloseEnabled && (
                      <article className="rounded-md border border-border bg-card px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-semibold text-foreground">Soft close</span>
                          <PolicyBadge />
                          <span className="ml-auto text-[10px] text-muted-foreground">
                            {softCloseLabel(schedule)}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                          A {bidWord} in the last {schedule.extendMinutes} min adds{' '}
                          {schedule.extendMinutes} min to the close
                          {schedule.limitEnabled ? `, up to ${schedule.extensionLimit} times` : ''}.
                          Latest possible close: {formatTime(latestClose)}.
                        </p>
                        {lastWindow && (
                          <p className="mt-1.5 rounded border border-info/20 bg-info/5 px-2 py-1 text-[10px] leading-snug text-muted-foreground">
                            Overlaps with Price progression. Window {offer.windows.length} (
                            {windowSummary(lastWindow, symbol)}) stays in force during every
                            extension.
                          </p>
                        )}
                      </article>
                    )}
                  </>
                )}
              </PhaseCard>

              <PhaseCard
                phase="Post auction"
                icon={<Clock className="h-3 w-3" aria-hidden />}
                meta={`3 policies · ${postSteps.length} workflow step${
                  postSteps.length === 1 ? '' : 's'
                }`}
                right={
                  closing
                    ? `from close · ${formatTime(closing)}${
                        latestClose !== closing ? ` (${formatTime(latestClose)} at latest)` : ''
                      }`
                    : 'from the close'
                }
              >
                <PolicySummaryCard
                  title="Who wins"
                  timing={offer.mechanism === 'CLOCK' ? 'When the clock stops' : 'At close'}
                >
                  {offer.mechanism === 'CLOCK'
                    ? 'The last bidder left in wins.'
                    : `${winnerBase(state)}.`}
                </PolicySummaryCard>
                <PolicySummaryCard title="Ties" timing="Right after Who wins">
                  If the winning {bidWord}s tie, {tiesLabel(state).toLowerCase()}.
                </PolicySummaryCard>
                <PolicySummaryCard title="Winning price" timing="Once the winner is known">
                  {offer.mechanism === 'CLOCK'
                    ? 'The winner owes the clock price when the last rival drops out.'
                    : `The winner owes ${
                        winnerLabel(state).split(' · ')[1] === 'own price'
                          ? `their own winning ${bidWord}`
                          : `the ${state.award.winnerPriceKth === '2' ? '2nd' : '3rd'}-${bidWord}`
                      }.`}
                </PolicySummaryCard>
                {postSteps.map((step, index) => (
                  <WorkflowCard
                    key={step.id}
                    step={step}
                    index={index + 1}
                    start={start}
                    bidWord={bidWord}
                    post
                  />
                ))}
                {postSteps.length === 0 && (
                  <p className="px-1 py-1 text-[11px] text-muted-foreground">
                    No steps after the auction yet.
                  </p>
                )}
              </PhaseCard>
            </>
          )}

          {stepsError && (
            <p className="rounded bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
              {stepsError}
            </p>
          )}
        </div>

        <aside className="space-y-2">
          <div className="rounded-md bg-foreground p-3 text-background">
            <span className="inline-flex rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground">
              {published ? 'Published' : 'Upcoming'}
            </span>
            <p className="mt-1.5 text-xs font-semibold">{opensIn(start)}</p>
            <dl className="mt-2 space-y-1.5 text-[10px]">
              {participation.minimumEnabled && (
                <div className="flex items-start justify-between gap-2">
                  <dt className="text-background/60">Minimum check</dt>
                  <dd className="text-right text-background/90">
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
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <dt className="text-background/60">Bidding</dt>
                <dd className="text-right text-background/90">
                  {start ? milestone(start) : 'Set the start'} →{' '}
                  {closing ? formatTime(closing) : 'close'}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-2">
                <dt className="text-background/60">Latest close</dt>
                <dd className="text-right text-background/90">
                  {latestClose ? milestone(latestClose) : 'Set the start'}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-2">
                <dt className="text-background/60">Winner pays by</dt>
                <dd className="text-right text-background/90">
                  {closing
                    ? paymentOffset
                      ? milestone(new Date(closing).toISOString(), offsetMinutes(paymentOffset))
                      : `${formatShortDate(closing)} + payment window`
                    : 'Set the start'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-md border border-border bg-card p-3 text-[10px] text-muted-foreground">
            <p className="text-[11px] font-semibold text-foreground">Reading the timeline</p>
            <ul className="mt-1.5 space-y-1">
              <li className="flex items-center gap-1.5">
                <span className="h-3 w-4 rounded-sm border border-border bg-card" aria-hidden />
                White card · workflow step
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-3 w-4 rounded-sm bg-foreground" aria-hidden />
                Dark card · policy
              </li>
              <li className="flex items-center gap-1.5">
                <span
                  className="h-3 w-4 rounded-sm border border-dashed border-border"
                  aria-hidden
                />
                Same moment
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-3 w-0.5 bg-muted-foreground/40" aria-hidden />
                Runs over a span of time
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
