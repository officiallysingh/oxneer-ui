'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, Info, Users } from 'lucide-react';
import { useWorkflow } from '../../../_hooks/useWorkflow';
import type { ParticipationState } from '../../../_lib/wizard/types';
import { dhm, effectiveDeadlines } from '../../../_lib/wizard/deadlines';
import { formatDateTime, minimumCheckAt } from '../../../_lib/wizard/summary';
import { stepTitle } from '../../../_lib/wizard/workflow';
import { Field, InfoNote, MutedNote, WizardRow, inputClass } from '../ui/wizard-ui';
import { PolicyOffRow, PolicyRow } from '../ui/PolicyRow';
import { StepList } from '../workflow/StepList';

export function Step4Participation({
  auctionId,
  form,
  onChange,
  isPrivate,
  startTime,
  direction,
  currencyUnit,
  openingPrice,
  onWorkflowCountChange,
}: {
  auctionId: string;
  form: ParticipationState;
  onChange: (patch: Partial<ParticipationState>) => void;
  isPrivate: boolean;
  startTime: string;
  direction: 'FORWARD' | 'REVERSE';
  currencyUnit: string;
  openingPrice: string;
  onWorkflowCountChange: (count: number) => void;
}) {
  const workflow = useWorkflow(auctionId);
  const [minimumOpen, setMinimumOpen] = useState(false);

  useEffect(() => {
    if (!workflow.loading) onWorkflowCountChange(workflow.pre.length);
  }, [workflow.loading, workflow.pre.length, onWorkflowCountChange]);

  const count = parseInt(form.minimumCount, 10) || 0;
  const tooLow = count < 2;
  const checkMinutes =
    (parseInt(form.checkDays, 10) || 0) * 1440 +
    (parseInt(form.checkHours, 10) || 0) * 60 +
    (parseInt(form.checkMinutes, 10) || 0);
  const checkAt = minimumCheckAt(startTime, form);
  const relative = checkMinutes ? `${dhm(checkMinutes)} before start` : 'at the start';
  const input =
    'h-9 w-14 rounded-md border border-input bg-background px-2 text-sm tabular-nums outline-none focus:border-ring focus:ring-2 focus:ring-ring/30';

  // Steps due after the check: anyone still working on them won't count yet.
  const deadlines = effectiveDeadlines(workflow.pre);
  const late = workflow.pre.filter(
    (step, index) => step.mandatory !== false && (deadlines[index]?.offset ?? 0) < checkMinutes,
  );

  return (
    <div className="space-y-4">
      {!form.minimumEnabled ? (
        <PolicyOffRow
          title="No minimum participants"
          text="The auction goes live however many people are ready."
          actionLabel="Add minimum participants"
          onAdd={() => {
            onChange({ minimumEnabled: true });
            setMinimumOpen(true);
          }}
        />
      ) : (
        <PolicyRow
          title="Minimum participants"
          icon={Users}
          phase="Pre auction"
          warn={tooLow ? 'Fix' : undefined}
          summary={[
            { text: `At least ${count} participants`, bad: tooLow },
            { text: `checked ${relative}` },
          ]}
          due={{ main: checkAt || relative, sub: 'go-live check' }}
          open={minimumOpen}
          onToggle={() => setMinimumOpen((value) => !value)}
          onRemove={() => {
            onChange({ minimumEnabled: false });
            setMinimumOpen(false);
          }}
        >
          <WizardRow
            label="Rule"
            description="The auction only goes live if enough people are ready."
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
                <Field label="At least" htmlFor="minimum-count">
                  <div className="flex items-center gap-1.5">
                    <input
                      id="minimum-count"
                      type="number"
                      min={2}
                      value={form.minimumCount}
                      onChange={(e) => onChange({ minimumCount: e.target.value })}
                      className={`${inputClass} h-9 w-20`}
                    />
                    <span className="text-xs text-muted-foreground">participants</span>
                  </div>
                </Field>
                <Field label="Checked">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      value={form.checkDays}
                      onChange={(e) => onChange({ checkDays: e.target.value })}
                      className={input}
                      aria-label="Days before start"
                    />
                    <span className="text-xs text-muted-foreground">d</span>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={form.checkHours}
                      onChange={(e) => onChange({ checkHours: e.target.value })}
                      className={input}
                      aria-label="Hours before start"
                    />
                    <span className="text-xs text-muted-foreground">h</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      step={5}
                      value={form.checkMinutes}
                      onChange={(e) => onChange({ checkMinutes: e.target.value })}
                      className={input}
                      aria-label="Minutes before start"
                    />
                    <span className="text-xs text-muted-foreground">min before start</span>
                  </div>
                </Field>
              </div>
              {checkAt && (
                <p className="rounded bg-muted/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                  <span className="font-semibold uppercase tracking-wider text-foreground">
                    Checked at
                  </span>{' '}
                  {checkAt} <span>({relative})</span>
                </p>
              )}
              {tooLow && (
                <p role="alert" className="flex items-center gap-1.5 text-[11px] text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                  An auction needs at least 2 participants.
                </p>
              )}
            </div>
          </WizardRow>

          <WizardRow label="Who counts" description="Only people who are ready to bid.">
            <div className="space-y-2">
              <InfoNote>
                Counts participants who have finished every required step due by then. People who
                are still in the middle of a step don’t count.
              </InfoNote>
              {late.map((step) => (
                <p
                  key={step.id}
                  className="flex items-start gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-[11px] leading-snug text-foreground"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
                  “{stepTitle(step)}” is due after the check, so anyone still on it at{' '}
                  {checkAt || 'the check'} won’t count.
                </p>
              ))}
            </div>
          </WizardRow>

          <WizardRow label="If it isn’t met" description="Fixed outcome.">
            <div className="space-y-2">
              <div className="rounded-md bg-policy px-3 py-2 text-[11px] leading-snug text-policy-foreground">
                If fewer than {count} participants are ready at {checkAt || 'the check time'}, the
                auction is cancelled automatically.
              </div>
              <p className="text-[11px] text-muted-foreground">
                Everyone who signed up is told, and refundable payments are returned.
              </p>
            </div>
          </WizardRow>
        </PolicyRow>
      )}

      <p className="flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2.5 text-[11px] leading-snug text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        {isPrivate
          ? 'This auction is private. You invite people after you publish it, in step 7. Everyone you invite completes the steps below before they can bid.'
          : 'This auction is public. Once it’s published, anyone registered can join by completing the steps below.'}
      </p>

      <StepList
        phase="PRE_AUCTION"
        workflow={workflow}
        title="Before the auction"
        subtitle={`${workflow.pre.length} workflow step${workflow.pre.length === 1 ? '' : 's'} for every participant`}
        range={startTime ? `until ${formatDateTime(startTime)}` : undefined}
        icon={CalendarClock}
        start={startTime}
        closing=""
        currencyUnit={currencyUnit}
        openingPrice={openingPrice}
        forward={direction === 'FORWARD'}
      />

      <MutedNote>
        Only participants who finish every required step by its deadline can bid. Steps set by the
        platform are locked.
      </MutedNote>
    </div>
  );
}
