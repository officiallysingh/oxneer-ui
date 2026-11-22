import { Check, Clock, Loader2, Send } from 'lucide-react';
import { Button, cn } from '@oxneer/ui';
import { Pill } from '@/components/common/admin/Pill';
import type {
  ParticipantStepView,
  ParticipantView,
} from '../../../../_components/wizard/invite/invite';
import { PERSON_STATUS_META, personStatus } from '../../_lib/people';

interface PeopleListProps {
  views: ParticipantView[];
  stepTitles: { id: string; title: string }[];
  showAlias: boolean;
  /** Resending only makes sense while people can still join. */
  canResend: boolean;
  resendingIds: Set<string>;
  onResend: (view: ParticipantView) => void;
}

function StepCell({ step }: { step?: ParticipantStepView }) {
  const state = step?.state ?? 'pending';
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
          state === 'done' && 'bg-success text-background',
          state === 'review' && 'bg-warning/15 text-warning',
          state === 'pending' && 'border-2 border-input',
        )}
      >
        {state === 'done' && <Check className="h-3 w-3" strokeWidth={3} aria-hidden />}
        {state === 'review' && <Clock className="h-3 w-3" aria-hidden />}
      </span>
      <span className={cn(state === 'pending' && 'text-muted-foreground')}>
        {step?.status ?? 'Not done yet'}
      </span>
    </span>
  );
}

function StatusPill({ view }: { view: ParticipantView }) {
  const meta = PERSON_STATUS_META[personStatus(view)];
  return (
    <Pill tone={meta.tone} dot>
      {meta.label}
    </Pill>
  );
}

function PersonName({ view, showAlias }: { view: ParticipantView; showAlias: boolean }) {
  const alias = view.participant.alias;
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-foreground">{view.name}</p>
      <p className="break-words text-xs text-muted-foreground">
        {showAlias && alias
          ? `Shown to others as ${alias}`
          : view.email || view.mobile || view.platformLine}
      </p>
    </div>
  );
}

function ResendButton({
  view,
  busy,
  onResend,
}: {
  view: ParticipantView;
  busy: boolean;
  onResend: (view: ParticipantView) => void;
}) {
  if (personStatus(view) !== 'no-reply') return null;
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onResend(view)}
      disabled={busy}
      aria-label={`Resend invitation to ${view.name}`}
    >
      {busy ? <Loader2 className="animate-spin" /> : <Send />}
      Resend
    </Button>
  );
}

/** A table from md up; stacked cards on a phone. */
export function PeopleList({
  views,
  stepTitles,
  showAlias,
  canResend,
  resendingIds,
  onResend,
}: PeopleListProps) {
  const stepFor = (view: ParticipantView, id: string) => view.steps.find((step) => step.id === id);
  const resend = (view: ParticipantView) =>
    canResend ? (
      <ResendButton view={view} busy={resendingIds.has(view.participant.id)} onResend={onResend} />
    ) : null;

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50 text-left">
              <th
                scope="col"
                className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Person / company
              </th>
              {stepTitles.map((step, index) => (
                <th
                  key={step.id}
                  scope="col"
                  className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Step {index + 1} · {step.title}
                </th>
              ))}
              <th
                scope="col"
                className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Can they bid?
              </th>
              <th scope="col" className="px-4 py-2.5">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {views.map((view) => (
              <tr key={view.participant.id} className="transition-colors hover:bg-muted/30">
                <td className="max-w-64 px-4 py-3">
                  <PersonName view={view} showAlias={showAlias} />
                </td>
                {stepTitles.map((step) => (
                  <td key={step.id} className="px-4 py-3">
                    <StepCell step={stepFor(view, step.id)} />
                  </td>
                ))}
                <td className="px-4 py-3">
                  <StatusPill view={view} />
                </td>
                <td className="px-4 py-3 text-right">{resend(view)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border/60 md:hidden">
        {views.map((view) => (
          <li key={view.participant.id} className="space-y-3 px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <PersonName view={view} showAlias={showAlias} />
              <StatusPill view={view} />
            </div>
            {stepTitles.length > 0 && (
              <ul className="space-y-1.5">
                {stepTitles.map((step) => (
                  <li key={step.id} className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">{step.title}</span>
                    <StepCell step={stepFor(view, step.id)} />
                  </li>
                ))}
              </ul>
            )}
            {resend(view)}
          </li>
        ))}
      </ul>
    </>
  );
}
