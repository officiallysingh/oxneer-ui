'use client';

import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { DateTimePicker } from '@repo/ui';
import type { AuctionMechanism, ScheduleState } from '../../../_lib/wizard/types';
import { ChoiceCard, Field, InfoNote, WizardRow, WizardSection, inputClass } from '../ui/wizard-ui';
import { PolicyOffRow, PolicyRow } from '../ui/PolicyRow';
import {
  endTimeFor,
  formatDateTime,
  formatTime,
  latestCloseFor,
} from '../../../_lib/wizard/summary';

const TIME_ZONE_LABEL: Record<string, string> = {
  'Asia/Kolkata': 'IST (Asia/Kolkata)',
  'Asia/Dubai': 'GST (Asia/Dubai)',
  'Asia/Singapore': 'SGT (Asia/Singapore)',
  'Europe/London': 'GMT (Europe/London)',
  'America/New_York': 'EST (America/New_York)',
  UTC: 'UTC',
};

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

function minutesLabel(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

/** What a late bid does: measured from the scheduled close or from the latest
 *  bid, then capped or not. */
function softCloseSentence(form: ScheduleState, noun: string): string {
  const minutes = parseInt(form.extendMinutes, 10) || 0;
  if (!minutes) return `Set the minutes a late ${noun} adds.`;
  const article = noun === 'ask' ? 'An' : 'A';
  const rule =
    form.extensionReference === 'FROM_AUCTION_END_TIME'
      ? `${article} ${noun} in the last ${minutes} min adds ${minutes} min to the close`
      : `The close is always ${minutes} min after the latest ${noun}`;
  if (!form.limitEnabled) return `${rule}, with no limit.`;
  const latest = latestCloseFor(form);
  return `${rule}, up to ${form.extensionLimit || 0} times.${
    latest ? ` Latest possible close: ${formatTime(latest)}.` : ''
  }`;
}

export function Step3Schedule({
  form,
  onChange,
  mechanism,
  direction,
  timeZone,
  lastWindowLabel,
  errors,
}: {
  form: ScheduleState;
  onChange: (patch: Partial<ScheduleState>) => void;
  mechanism: AuctionMechanism;
  direction: 'FORWARD' | 'REVERSE';
  timeZone: string;
  /** "3 (₹500 steps)": the price window that stays in force during extensions. */
  lastWindowLabel?: string;
  errors: Record<string, string>;
}) {
  const [softCloseOpen, setSoftCloseOpen] = useState(false);
  const computedEnd = useMemo(() => endTimeFor(form), [form]);
  const clock = mechanism === 'CLOCK';
  const sealed = mechanism === 'SEALED';
  const noun = direction === 'FORWARD' ? 'bid' : 'ask';

  const endTime = form.endMode === 'FIXED' ? form.endTime : computedEnd;
  const closeTime = endTime ? formatTime(endTime) : 'Close';
  const startTime = form.startTime ? formatTime(form.startTime) : 'Start';
  const totalMinutes = (() => {
    const s = Date.parse(form.startTime);
    const e = Date.parse(endTime);
    return Number.isFinite(s) && Number.isFinite(e) ? Math.max(0, Math.round((e - s) / 60000)) : 0;
  })();
  const extendMinutes = parseInt(form.extendMinutes, 10) || 0;
  const extensions = form.limitEnabled ? parseInt(form.extensionLimit, 10) || 0 : 0;
  const latest = latestCloseFor(form);
  const latestLabel = form.limitEnabled ? (latest ? formatTime(latest) : 'close') : '…';

  return (
    <div className="space-y-4">
      <WizardSection>
        <WizardRow
          label="Start"
          description={`All times are in ${TIME_ZONE_LABEL[timeZone] ?? timeZone}.`}
        >
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

        <WizardRow
          label="How bidding ends"
          description={clock ? 'Set by the clock.' : 'A fixed length, or a fixed time.'}
        >
          {clock ? (
            <InfoNote>
              A clock auction ends when only one {direction === 'FORWARD' ? 'bidder' : 'supplier'}{' '}
              is left or the price reaches where the clock stops, so there is no end time to set.
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
                <Field label="Bidding runs for">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={720}
                      value={form.durationHours}
                      onChange={(e) => onChange({ durationHours: e.target.value })}
                      className="h-9 w-16 rounded-md border border-input bg-background px-2 text-sm tabular-nums outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                      aria-label="Hours of bidding"
                    />
                    <span className="text-xs text-muted-foreground">h</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      step={5}
                      value={form.durationMinutes}
                      onChange={(e) => onChange({ durationMinutes: e.target.value })}
                      className="h-9 w-16 rounded-md border border-input bg-background px-2 text-sm tabular-nums outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                      aria-label="Minutes of bidding"
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                </Field>
              ) : (
                <div className="max-w-md">
                  <Field label="Bidding closes" htmlFor="endTime" error={errors.endTime}>
                    <DateTimePicker
                      id="endTime"
                      value={form.endTime}
                      onChange={(value) => onChange({ endTime: value })}
                      placeholder="Pick closing date & time"
                      min={form.startTime || new Date().toISOString().slice(0, 16)}
                    />
                  </Field>
                </div>
              )}

              <p className="rounded bg-muted/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                <span className="font-semibold uppercase tracking-wider text-foreground">
                  Closes
                </span>{' '}
                {formatDateTime(endTime)}{' '}
                {totalMinutes > 0 && (
                  <span>
                    {minutesLabel(totalMinutes)} of bidding
                    {!sealed && form.softCloseEnabled
                      ? form.limitEnabled && latest
                        ? `, up to ${formatTime(latest)} with extensions`
                        : ', plus any extensions'
                      : ''}
                  </span>
                )}
              </p>
              {form.endMode === 'DURATION' && errors.endTime && (
                <p className="text-[11px] text-destructive">{errors.endTime}</p>
              )}
            </div>
          )}
        </WizardRow>
      </WizardSection>

      {clock || sealed ? (
        <p className="flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2.5 text-[11px] leading-snug text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {clock
            ? 'Soft close doesn’t apply to a clock auction. It ends when the last rival drops out.'
            : `Soft close doesn’t apply to sealed ${noun}s. Nobody sees a late ${noun}, so there’s nothing to react to.`}
        </p>
      ) : !form.softCloseEnabled ? (
        <PolicyOffRow
          title="Soft close is off"
          text={`Bidding stops exactly at the close, even if a${noun === 'ask' ? 'n' : ''} ${noun} arrives in the last second.`}
          actionLabel="Add soft close"
          onAdd={() => {
            onChange({ softCloseEnabled: true });
            setSoftCloseOpen(true);
          }}
        />
      ) : (
        <PolicyRow
          title="Soft close"
          phase="During auction"
          warn={errors.general ? 'Fix' : undefined}
          summary={[
            { text: `+${extendMinutes} min per late ${noun}`, bad: !extendMinutes },
            {
              text:
                form.extensionReference === 'FROM_AUCTION_END_TIME'
                  ? 'from the scheduled close'
                  : `from the latest ${noun}`,
            },
            { text: form.limitEnabled ? `up to ${form.extensionLimit || 0} times` : 'no limit' },
          ]}
          due={{ main: `${closeTime} → ${latestLabel}`, sub: `only if late ${noun}s come in` }}
          open={softCloseOpen}
          onToggle={() => setSoftCloseOpen((value) => !value)}
          onRemove={() => {
            onChange({ softCloseEnabled: false });
            setSoftCloseOpen(false);
          }}
          footer={extendMinutes ? undefined : 'Set the minutes to save.'}
        >
          <WizardRow label="Extend by" description={`How much time a late ${noun} adds.`}>
            <div className="max-w-[130px]">
              <Field label="Minutes" htmlFor="soft-close-minutes">
                <input
                  id="soft-close-minutes"
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
                description={`Each extension adds to ${closeTime}`}
                selected={form.extensionReference === 'FROM_AUCTION_END_TIME'}
                onClick={() => onChange({ extensionReference: 'FROM_AUCTION_END_TIME' })}
              />
              <ChoiceCard
                title={`From the latest ${noun}`}
                description={`The close is always ${extendMinutes || 'N'} min after the last ${noun}`}
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
                  description="There’s a known latest close."
                  selected={form.limitEnabled}
                  onClick={() => onChange({ limitEnabled: true })}
                />
                <ChoiceCard
                  title="No limit"
                  description={`Runs until ${noun}s stop.`}
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
                    aria-label="Most extensions"
                  />
                  <span className="text-xs text-muted-foreground">times</span>
                </div>
              )}
            </div>
          </WizardRow>

          <WizardRow label="Result" description="What participants experience.">
            <div className="space-y-2">
              <div className="rounded-md bg-policy px-3 py-2 text-[11px] leading-snug text-policy-foreground">
                {softCloseSentence(form, noun)}
              </div>
              <div>
                <div
                  role="img"
                  aria-label={`Bidding ${startTime} to ${closeTime}${
                    form.limitEnabled
                      ? `, extensions up to ${latestLabel}`
                      : ', then extensions with no limit'
                  }`}
                  className="flex h-[30px] overflow-hidden rounded-md border border-input text-[11px] font-semibold"
                >
                  <span
                    style={{ flexGrow: Math.max(totalMinutes, 60) }}
                    className="flex min-w-0 basis-0 items-center truncate bg-primary/45 px-2 text-primary-foreground"
                  >
                    {startTime} → {closeTime} bidding
                  </span>
                  <span
                    style={{
                      flexGrow: form.limitEnabled
                        ? Math.max(extendMinutes * extensions, Math.max(totalMinutes, 60) * 0.2)
                        : Math.max(totalMinutes, 60) * 0.4,
                    }}
                    className="flex min-w-0 basis-0 items-center truncate bg-primary/20 px-2 text-foreground"
                  >
                    {form.limitEnabled
                      ? `+ up to ${minutesLabel(extendMinutes * extensions)}`
                      : '+ no limit'}
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground">
                  <span>{startTime}</span>
                  <span>{closeTime}</span>
                  <span>{latestLabel}</span>
                </div>
              </div>
              {lastWindowLabel && (
                <InfoNote>
                  During extensions, Price progression window {lastWindowLabel} stays in force.
                </InfoNote>
              )}
            </div>
          </WizardRow>
        </PolicyRow>
      )}
    </div>
  );
}
