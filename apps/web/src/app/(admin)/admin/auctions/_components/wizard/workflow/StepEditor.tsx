'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Info, Loader2, Upload, X } from 'lucide-react';
import { Button, RichTextEditor, Switch, cn } from '@repo/ui';
import { auctionsApi, type AuctionWorkflowStep } from '@repo/api';
import { parseApiError } from '@/lib/api-errors';
import { formatDateTime } from '../../../_lib/wizard/summary';
import { WORKFLOW_TYPE_LABEL } from '../../../_lib/wizard/workflow';
import { dhm } from '../../../_lib/wizard/deadlines';
import {
  draftMinutes,
  setDraftMinutes,
  validateDraft,
  type DraftContext,
  type StepDraft,
} from '../../../_lib/wizard/stepDraft';
import { ChoiceCard, Field, WizardRow, inputClass } from '../ui/wizard-ui';
import { ChargesEditor } from './ChargesEditor';
import { TemplatePicker } from './TemplatePicker';
import { STEP_ICON } from './stepIcons';

let paymentModesRequest: Promise<{ value: string; label: string }[]> | null = null;
function loadPaymentModes() {
  paymentModesRequest ??= auctionsApi.getPaymentModes().catch(() => {
    paymentModesRequest = null;
    return [];
  });
  return paymentModesRequest;
}

const BANK_FIELDS: [string, string][] = [
  ['Bank name', 'e.g. State Bank of India'],
  ['IFSC code', 'SBIN0001234'],
  ['Account number', '00000000000'],
];

/** Quick picks plus days/hours/minutes, and the absolute time it works out to. */
function DeadlineField({
  draft,
  onChange,
  picks,
  suffix,
  dueAt,
}: {
  draft: StepDraft;
  onChange: (patch: Partial<StepDraft>) => void;
  picks: number[];
  suffix: string;
  dueAt: string;
}) {
  const total = draftMinutes(draft);
  const input =
    'h-9 w-14 rounded-md border border-input bg-background px-2 text-sm tabular-nums outline-none focus:border-ring focus:ring-2 focus:ring-ring/30';
  return (
    <div className="space-y-2">
      <div role="group" aria-label="Quick picks" className="flex flex-wrap gap-1.5">
        {picks.map((minutes) => (
          <button
            key={minutes}
            type="button"
            aria-pressed={total === minutes}
            onClick={() => onChange(setDraftMinutes(minutes))}
            className={cn(
              'h-7 rounded-full border px-3 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              total === minutes
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {dhm(minutes)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          type="number"
          min={0}
          aria-label="Days"
          value={draft.days}
          onChange={(event) => onChange({ days: event.target.value })}
          className={input}
        />
        <span className="text-xs text-muted-foreground">d</span>
        <input
          type="number"
          min={0}
          max={23}
          aria-label="Hours"
          value={draft.hours}
          onChange={(event) => onChange({ hours: event.target.value })}
          className={input}
        />
        <span className="text-xs text-muted-foreground">h</span>
        <input
          type="number"
          min={0}
          max={59}
          step={5}
          aria-label="Minutes"
          value={draft.minutes}
          onChange={(event) => onChange({ minutes: event.target.value })}
          className={input}
        />
        <span className="text-xs text-muted-foreground">{suffix}</span>
      </div>
      {dueAt && (
        <p className="rounded bg-muted/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
          <span className="font-semibold uppercase tracking-wider text-foreground">Due</span>{' '}
          {dueAt}
        </p>
      )}
    </div>
  );
}

function shifted(base: string, minutes: number): string {
  const date = new Date(base);
  if (!base || Number.isNaN(date.getTime())) return '';
  return formatDateTime(new Date(date.getTime() + minutes * 60_000).toISOString());
}

/** The expanded editor for one workflow step, saved or new. */
export function StepEditor({
  initial,
  step,
  n,
  context,
  start,
  closing,
  currencyUnit,
  openingPrice,
  forward,
  onSave,
  onCancel,
}: {
  initial: StepDraft;
  step?: AuctionWorkflowStep;
  n: number;
  context: DraftContext;
  start: string;
  closing: string;
  currencyUnit: string;
  openingPrice: string;
  forward: boolean;
  onSave: (draft: StepDraft) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<StepDraft>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentModes, setPaymentModes] = useState<{ value: string; label: string }[]>([]);
  const patch = (next: Partial<StepDraft>) => setDraft((current) => ({ ...current, ...next }));

  const pre = draft.phase === 'PRE_AUCTION';
  const implicit = Boolean(step?.implicit);
  const isNew = !step;
  const Icon = STEP_ICON[draft.type];
  const kind = WORKFLOW_TYPE_LABEL[draft.type] ?? 'Step';
  const who = pre ? 'participants' : 'the winner';
  const openWord = forward ? 'opening' : 'starting';

  useEffect(() => {
    if (draft.type !== 'PAYMENT_STEP') return;
    let active = true;
    void loadPaymentModes().then((modes) => {
      if (!active) return;
      setPaymentModes(modes);
      // New payments default to online, like the add dialog did.
      setDraft((current) =>
        current.mode
          ? current
          : {
              ...current,
              mode:
                modes.find((mode) => /online/i.test(mode.value) || /online/i.test(mode.label))
                  ?.value ??
                modes[0]?.value ??
                '',
            },
      );
    });
    return () => {
      active = false;
    };
  }, [draft.type]);

  const save = async () => {
    const problem = validateDraft(draft, context);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
    } catch (err) {
      setError(parseApiError(err).summary);
    } finally {
      setSaving(false);
    }
  };

  const deadlineMinutes = draftMinutes(draft);
  const dueAt = pre
    ? start
      ? `${shifted(start, -deadlineMinutes)} · ${deadlineMinutes ? `${dhm(deadlineMinutes)} before start` : 'by the start'}`
      : ''
    : closing
      ? `${shifted(closing, deadlineMinutes)} · ${dhm(deadlineMinutes)} after the close`
      : '';

  return (
    <article
      aria-label={isNew ? `New ${kind.toLowerCase()} step` : `Edit ${draft.name || kind}`}
      className="overflow-hidden rounded-lg border border-primary/40 bg-card shadow-sm"
    >
      <header className="flex flex-wrap items-center gap-2.5 border-b border-border bg-muted/30 px-4 py-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background">
          {n}
        </span>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span className="text-sm font-semibold text-foreground">
          {draft.name || (isNew ? `New ${kind.toLowerCase()}` : kind)}
        </span>
        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
          {kind}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={isNew ? 'Discard new step' : 'Close without saving'}
          onClick={onCancel}
          className="ml-auto h-8 w-8"
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </header>

      <div className="divide-y divide-border/60">
        <WizardRow
          label="About this step"
          description={
            implicit
              ? 'Added by the platform. Only the name and description can change.'
              : `What ${who} see.`
          }
        >
          <div className="space-y-3">
            {draft.type === 'PAYMENT_STEP' ? (
              <p className="text-xs text-muted-foreground">
                Payment steps are named by the platform:{' '}
                <span className="font-medium text-foreground">
                  {pre ? 'Pre Payment' : 'Post Payment'}
                </span>
                .
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name" htmlFor={`step-${n}-name`}>
                  <input
                    id={`step-${n}-name`}
                    value={draft.name}
                    onChange={(event) => patch({ name: event.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Description" htmlFor={`step-${n}-desc`} optional>
                  <input
                    id={`step-${n}-desc`}
                    value={draft.description}
                    onChange={(event) => patch({ description: event.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>
            )}
            <label className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-foreground">
              <Switch
                checked={draft.mandatory}
                onCheckedChange={(mandatory) => patch({ mandatory })}
              />
              {draft.mandatory
                ? `Required: ${who} must finish it${pre ? ' before they can bid' : ''}`
                : 'Optional'}
            </label>
          </div>
        </WizardRow>

        {!implicit && draft.type === 'TNC_FORM_STEP' && (
          <>
            <WizardRow label="Terms" description="Write them here, or upload a Word document.">
              <div className="space-y-3">
                <div role="radiogroup" aria-label="Source" className="grid gap-2 sm:grid-cols-2">
                  <ChoiceCard
                    title="Write them here"
                    description="Participants read them on the page."
                    selected={draft.tncSource === 'TEXT'}
                    onClick={() => patch({ tncSource: 'TEXT' })}
                  />
                  <ChoiceCard
                    title="Upload a document"
                    description="A .doc or .docx file participants open."
                    selected={draft.tncSource === 'DOCUMENT'}
                    onClick={() => patch({ tncSource: 'DOCUMENT' })}
                  />
                </div>
                {draft.tncSource === 'TEXT' ? (
                  <RichTextEditor
                    value={draft.tncText}
                    onChange={(tncText) => patch({ tncText })}
                    placeholder="Write the terms participants accept…"
                  />
                ) : (
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-3 text-xs transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-primary/40 hover:bg-muted/20">
                    <Upload className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 truncate">
                      {draft.tncFile ? (
                        <b className="font-semibold text-foreground">{draft.tncFile.name}</b>
                      ) : step && !step.tncText ? (
                        <>
                          <b className="font-semibold text-foreground">A document is attached.</b>{' '}
                          <span className="text-muted-foreground">
                            Choose a file to replace it.
                          </span>
                        </>
                      ) : (
                        <>
                          <b className="font-semibold text-foreground">
                            Choose a .doc or .docx file
                          </b>{' '}
                          <span className="text-muted-foreground">or drop it here</span>
                        </>
                      )}
                    </span>
                    <input
                      type="file"
                      accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="sr-only"
                      onChange={(event) => patch({ tncFile: event.target.files?.[0] ?? null })}
                    />
                  </label>
                )}
              </div>
            </WizardRow>
            <WizardRow
              label="What participants see"
              description="They must tick the box to continue."
            >
              <div className="space-y-2">
                <div className="rounded-md border border-dashed border-input bg-muted/20 p-3">
                  <div className="mb-2 flex flex-wrap justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span>Preview</span>
                    <span>Accepting can’t be undone</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {draft.name || 'Terms and conditions'}
                  </p>
                  <p className="mt-1 line-clamp-4 text-xs leading-relaxed text-muted-foreground">
                    {draft.tncSource === 'TEXT'
                      ? draft.tncText.replace(/<[^>]*>/g, ' ').trim() || 'No terms written yet.'
                      : `Opens ${draft.tncFile?.name ?? 'the attached document'}.`}
                  </p>
                  <label className="mt-2 flex items-center gap-2 text-xs text-foreground">
                    <input type="checkbox" disabled className="h-4 w-4" />I have read and accept
                    these terms
                  </label>
                </div>
                <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  No deadline of its own. It’s always the first step, so participants accept before
                  anything else. Once anyone accepts, the terms are locked.
                </p>
              </div>
            </WizardRow>
          </>
        )}

        {!implicit && (draft.type === 'FORM_STEP' || draft.type === 'PARTICIPATION_FORM_STEP') && (
          <WizardRow
            label="Form"
            description={
              draft.type === 'PARTICIPATION_FORM_STEP'
                ? 'What participants tell you before they can bid.'
                : `Extra details ${who} fill in.`
            }
          >
            <TemplatePicker
              typeId={draft.typeId}
              previewLabel={`Preview · what ${who} fill in`}
              onPick={(template) =>
                patch({
                  typeId: template.id,
                  typeName: template.name,
                  name:
                    draft.name.trim() && draft.name !== draft.typeName ? draft.name : template.name,
                })
              }
            />
          </WizardRow>
        )}

        {!implicit && draft.type === 'PARTICIPATION_FORM_STEP' && (
          <>
            <WizardRow label="Approval" description="Who decides whether a participant may bid.">
              <div className="space-y-2">
                <div role="radiogroup" aria-label="Approval" className="grid gap-2 sm:grid-cols-2">
                  <ChoiceCard
                    title="You approve each one"
                    description="Submissions wait in your review queue."
                    selected={draft.manualApproval}
                    onClick={() => patch({ manualApproval: true })}
                  />
                  <ChoiceCard
                    title="Automatic"
                    description="Anyone who submits can bid."
                    selected={!draft.manualApproval}
                    onClick={() => patch({ manualApproval: false })}
                  />
                </div>
                {draft.manualApproval && (
                  <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    Submissions wait in your review queue. Anyone you haven’t approved by the start
                    can’t bid.
                  </p>
                )}
              </div>
            </WizardRow>
            <WizardRow
              label="Submit by"
              description="How long before the start the form must be in."
            >
              <DeadlineField
                draft={draft}
                onChange={patch}
                picks={[60, 6 * 60, 1440, 2 * 1440, 3 * 1440]}
                suffix="before start"
                dueAt={dueAt}
              />
              {draft.manualApproval && deadlineMinutes > 0 && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  You’ll have <b className="text-foreground">{dhm(deadlineMinutes)}</b> to review
                  submissions before the auction starts.
                </p>
              )}
              {draft.manualApproval && deadlineMinutes > 0 && deadlineMinutes < 120 && (
                <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-warning">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  That’s a tight window to review every submission.
                </p>
              )}
            </WizardRow>
          </>
        )}

        {draft.type === 'BANK_DETAIL_FORM_STEP' && (
          <>
            <WizardRow
              label={pre ? 'What participants give' : 'What the winner gives'}
              description="These fields are fixed. There’s nothing to set up."
            >
              <div className="rounded-md border border-dashed border-input bg-muted/20 p-3">
                <div className="mb-2 flex flex-wrap justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Preview</span>
                  <span>All four are required</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {BANK_FIELDS.map(([label, placeholder]) => (
                    <label key={label} className="space-y-1 text-[11px] text-muted-foreground">
                      {label}
                      <input
                        disabled
                        aria-label={`${label} (preview)`}
                        placeholder={placeholder}
                        className={`${inputClass} h-8`}
                      />
                    </label>
                  ))}
                  <span className="space-y-1 text-[11px] text-muted-foreground">
                    Cancelled cheque
                    <span className="flex h-8 items-center gap-1.5 rounded-md border border-dashed border-input px-2.5">
                      <Upload className="h-3.5 w-3.5" aria-hidden />
                      Upload an image
                    </span>
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Participants who saved an account before can pick it instead of typing it again.
                </p>
              </div>
            </WizardRow>
            <WizardRow label="Why it’s here" description="Linked to the steps that use it.">
              <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {pre
                  ? 'Refunds of any refundable payment go to this account. Bank details always come before payments, so the account is known before any money is taken.'
                  : forward
                    ? 'Where refunds go after the auction.'
                    : 'Where the platform pays the winning supplier.'}
              </p>
            </WizardRow>
          </>
        )}

        {!implicit && draft.type === 'PAYMENT_STEP' && (
          <>
            <WizardRow
              label="How they pay"
              description="Online is collected by the platform. Offline you record yourself."
            >
              <div
                role="radiogroup"
                aria-label="Payment mode"
                className="grid gap-2 sm:grid-cols-2"
              >
                {paymentModes.length === 0 ? (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    Loading payment modes…
                  </p>
                ) : (
                  paymentModes.map((mode) => (
                    <ChoiceCard
                      key={mode.value}
                      title={mode.label}
                      description={
                        /online/i.test(mode.value)
                          ? 'Collected by the platform.'
                          : 'Cash, cheque or bank transfer, recorded by you.'
                      }
                      selected={draft.mode === mode.value}
                      onClick={() => patch({ mode: mode.value })}
                    />
                  ))
                )}
              </div>
            </WizardRow>
            <WizardRow
              label="Due by"
              description={
                pre
                  ? 'How long before the start it must be paid.'
                  : 'How long after the close the winner has to pay.'
              }
            >
              <DeadlineField
                draft={draft}
                onChange={patch}
                picks={
                  pre ? [1440, 2 * 1440, 3 * 1440, 7 * 1440] : [1440, 2 * 1440, 3 * 1440, 7 * 1440]
                }
                suffix={pre ? 'before start' : 'after the close'}
                dueAt={dueAt}
              />
              {deadlineMinutes === 0 && (
                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                  Must be more than zero. They need some time to pay.
                </p>
              )}
            </WizardRow>
            <WizardRow
              label="Charges"
              description={
                pre
                  ? 'For example a deposit (EMD) and a fee.'
                  : 'The winning amount and anything on top of it.'
              }
            >
              {!pre && (
                <p className="mb-2.5 flex items-start gap-1.5 rounded-md bg-success/10 px-3 py-2 text-[11px] leading-snug text-success">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  Percentages are taken of the winning price, which comes from the Winning price
                  policy above.
                </p>
              )}
              <ChargesEditor
                heads={draft.heads}
                onChange={(heads) => patch({ heads })}
                currencyUnit={currencyUnit}
                baseName={pre ? `${openWord} price` : 'winning price'}
                exampleBase={parseFloat(openingPrice) || 0}
                examplePrefix={pre ? `At an ${openWord} price of` : 'If the winning price is'}
                namePlaceholder={pre ? 'e.g. EMD' : 'e.g. Winning amount'}
                forWhom={who}
              />
            </WizardRow>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-2.5">
        {error ? (
          <p role="alert" className="flex items-start gap-1.5 text-[11px] text-destructive">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {error}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            {isNew ? 'Adds the step to the auction.' : 'Saves this step straight away.'}
          </p>
        )}
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void save()}
            disabled={saving}
            className="gap-1.5"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            {isNew ? 'Add step' : 'Done'}
          </Button>
        </div>
      </div>
    </article>
  );
}
