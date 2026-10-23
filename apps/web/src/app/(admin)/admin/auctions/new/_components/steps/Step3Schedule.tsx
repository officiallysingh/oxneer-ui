'use client';

import { useMemo } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Plus, Trash2, Zap } from 'lucide-react';
import { Button, DateTimePicker } from '@repo/ui';
import type { ScheduleState } from '../shared/types';
import {
  ChoiceCard,
  Field,
  InfoNote,
  PolicyBadge,
  WizardRow,
  WizardSection,
  inputClass,
} from '../shared/wizard-ui';
import { endTimeFor, formatDateTime, formatTime } from '../shared/summary';

function relative(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diff = date.getTime() - Date.now();
  if (diff <= 0) return 'in the past';
  const minutes = Math.floor(diff / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `in ${days} d ${hours} h`;
  if (hours > 0) return `in ${hours} h ${minutes % 60} min`;
  return `in ${minutes} min`;
}

export function Step3Schedule({
  form,
  onChange,
  clockMechanism,
  errors,
  saving,
  onBack,
  onNext,
}: {
  form: ScheduleState;
  onChange: (patch: Partial<ScheduleState>) => void;
  clockMechanism: boolean;
  errors: Record<string, string>;
  saving: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const computedEnd = useMemo(() => endTimeFor(form), [form]);

  const endTime = form.endMode === 'FIXED' ? form.endTime : computedEnd;
  const closeTime = endTime ? formatTime(endTime) : '—';
  const startTime = form.startTime ? formatTime(form.startTime) : '—';
  const totalMinutes =
    (parseInt(form.durationHours, 10) || 0) * 60 + (parseInt(form.durationMinutes, 10) || 0);

  return (
    <div className="space-y-4">
      <WizardSection>
        <WizardRow label="Start" description={`All times are in the auction time zone.`}>
          <div className="max-w-md space-y-1.5">
            <Field label="Bidding opens" htmlFor="startTime" error={errors.startTime}>
              <DateTimePicker
                id="startTime"
                value={form.startTime}
                onChange={(value) => onChange({ startTime: value })}
                placeholder="Pick opening date & time"
                min={new Date().toISOString().slice(0, 16)}
              />
            </Field>
            {form.startTime && (
              <p className="rounded bg-muted/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                <span className="font-semibold uppercase tracking-wider text-foreground">
                  Opens
                </span>{' '}
                {formatDateTime(form.startTime)} <span>({relative(form.startTime)})</span>
              </p>
            )}
          </div>
        </WizardRow>

        <WizardRow label="How bidding ends" description="A fixed length, or a fixed time.">
          {clockMechanism ? (
            <InfoNote>
              A clock auction ends when only one bidder is left or the price reaches where the clock
              stops, so there is no end time to set.
            </InfoNote>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <ChoiceCard
                  title="Runs for a set time"
                  description="Bidding lasts a fixed length from the start."
                  selected={form.endMode === 'DURATION'}
                  onClick={() => onChange({ endMode: 'DURATION' })}
                />
                <ChoiceCard
                  title="Ends at a set time"
                  description="Pick the exact closing date and time."
                  selected={form.endMode === 'FIXED'}
                  onClick={() => onChange({ endMode: 'FIXED' })}
                />
              </div>

              {form.endMode === 'DURATION' ? (
                <div className="space-y-2">
                  <Field label="Bidding runs for">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={720}
                        value={form.durationHours}
                        onChange={(e) => onChange({ durationHours: e.target.value })}
                        className="h-9 w-16 rounded-md border border-input bg-background px-2 text-sm tabular-nums outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                        aria-label="Duration hours"
                      />
                      <span className="text-xs text-muted-foreground">h</span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={form.durationMinutes}
                        onChange={(e) => onChange({ durationMinutes: e.target.value })}
                        className="h-9 w-16 rounded-md border border-input bg-background px-2 text-sm tabular-nums outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                        aria-label="Duration minutes"
                      />
                      <span className="text-xs text-muted-foreground">min</span>
                    </div>
                  </Field>
                  <p className="rounded bg-muted/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                    <span className="font-semibold uppercase tracking-wider text-foreground">
                      Closes
                    </span>{' '}
                    {formatDateTime(computedEnd)}{' '}
                    <span>
                      {totalMinutes > 0
                        ? `${Math.floor(totalMinutes / 60)} h${
                            totalMinutes % 60 ? ` ${totalMinutes % 60} min` : ''
                          } of bidding`
                        : ''}
                      {form.softCloseEnabled ? ', plus any extensions' : ''}
                    </span>
                  </p>
                  {errors.endTime && (
                    <p className="text-[11px] text-destructive">{errors.endTime}</p>
                  )}
                </div>
              ) : (
                <div className="max-w-md space-y-1.5">
                  <Field label="Bidding closes" htmlFor="endTime" error={errors.endTime}>
                    <DateTimePicker
                      id="endTime"
                      value={form.endTime}
                      onChange={(value) => onChange({ endTime: value })}
                      placeholder="Pick closing date & time"
                      min={form.startTime || new Date().toISOString().slice(0, 16)}
                    />
                  </Field>
                  <p className="rounded bg-muted/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                    <span className="font-semibold uppercase tracking-wider text-foreground">
                      Closes
                    </span>{' '}
                    {formatDateTime(form.endTime)}
                  </p>
                </div>
              )}
            </div>
          )}
        </WizardRow>
      </WizardSection>

      {!clockMechanism && (
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Zap className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span className="text-sm font-semibold text-foreground">Soft close</span>
            <PolicyBadge tone="warning" className="px-2 text-[10px]" />
            <span className="text-[10px] text-muted-foreground">During auction</span>
            <span className="text-[10px] text-muted-foreground">Applied automatically</span>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                aria-label="Remove soft close"
                onClick={() => onChange({ softCloseEnabled: false })}
                className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {!form.softCloseEnabled ? (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-xs font-semibold text-foreground">Soft close is off</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Bidding stops exactly at the close, even if a bid arrives in the last second.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onChange({ softCloseEnabled: true })}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add soft close
              </Button>
            </div>
          ) : (
            <>
              <WizardRow label="Extend by" description="How much time a late bid adds.">
                <div className="max-w-[130px]">
                  <Field label="Minutes">
                    <input
                      type="number"
                      min={1}
                      value={form.extendMinutes}
                      onChange={(e) => onChange({ extendMinutes: e.target.value })}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <ChoiceCard
                    title="From the scheduled close"
                    description={`Each extension adds to ${form.endMode === 'FIXED' ? formatTime(form.endTime) : closeTime}`}
                    selected={form.extensionReference === 'FROM_AUCTION_END_TIME'}
                    onClick={() => onChange({ extensionReference: 'FROM_AUCTION_END_TIME' })}
                  />
                  <ChoiceCard
                    title="From the latest bid"
                    description={`The close is always ${form.extendMinutes || 0} min after the last bid`}
                    selected={form.extensionReference === 'FROM_LATEST_OFFER_TIME'}
                    onClick={() => onChange({ extensionReference: 'FROM_LATEST_OFFER_TIME' })}
                  />
                </div>
              </WizardRow>

              <WizardRow
                label="How many times"
                description="Put a cap on how long the auction can run."
              >
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <ChoiceCard
                      title="Up to a number"
                      description="There is a known latest close time."
                      selected={form.limitEnabled}
                      onClick={() => onChange({ limitEnabled: true })}
                    />
                    <ChoiceCard
                      title="No limit"
                      description="Runs until bids stop."
                      selected={!form.limitEnabled}
                      onClick={() => onChange({ limitEnabled: false })}
                    />
                  </div>
                  {form.limitEnabled && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={form.extensionLimit}
                        onChange={(e) => onChange({ extensionLimit: e.target.value })}
                        className={`${inputClass} h-9 w-20`}
                        aria-label="Number of extensions"
                      />
                      <span className="text-xs text-muted-foreground">times</span>
                    </div>
                  )}
                </div>
              </WizardRow>

              <WizardRow label="Result" description="What participants experience.">
                <div className="space-y-2">
                  <div className="rounded-md bg-foreground px-3 py-2 text-[11px] leading-snug text-background">
                    {form.limitEnabled
                      ? `A bid in the last ${form.extendMinutes || 0} min adds ${
                          form.extendMinutes || 0
                        } min to the close, up to ${form.extensionLimit || 0} times.`
                      : `The close is always ${form.extendMinutes || 0} min after the latest bid, with no limit.`}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 flex-1 overflow-hidden rounded bg-muted text-[10px] text-muted-foreground">
                      <span className="bg-primary/25 px-1.5 py-0.5">
                        {startTime} — {closeTime} bidding
                      </span>
                      {form.softCloseEnabled && (
                        <span className="bg-muted px-1.5 py-0.5">
                          +{' '}
                          {form.limitEnabled
                            ? `${(parseInt(form.extensionLimit, 10) || 0) * (parseInt(form.extendMinutes, 10) || 0)} min`
                            : 'no limit'}
                        </span>
                      )}
                    </div>
                  </div>
                  <InfoNote>
                    During extensions, the final price progression window stays in force.
                  </InfoNote>
                </div>
              </WizardRow>
            </>
          )}
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={saving}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back: Offer rules
        </Button>
        <div className="flex flex-col items-end gap-1">
          {errors.general && <span className="text-[11px] text-destructive">{errors.general}</span>}
          <Button type="button" onClick={onNext} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Next: Participation
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
