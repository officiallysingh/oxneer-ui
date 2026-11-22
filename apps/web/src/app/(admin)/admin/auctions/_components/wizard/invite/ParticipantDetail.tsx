'use client';

import { useState, type ReactNode } from 'react';
import { Check, FileText, X } from 'lucide-react';
import { Button } from '@repo/ui';
import { UserAvatar } from '@/components/common/admin/UserAvatar';
import { formatDateTime } from '../../../_lib/wizard/summary';
import type { InviteDecision, ParticipantView } from './invite';
import { ParticipantStatusBadge } from './ParticipantStatusBadge';

function DetailRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2 px-4 py-3 md:grid-cols-[148px_minmax(0,1fr)] md:gap-6">
      <div className="space-y-0.5">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        {description && (
          <p className="text-[11px] leading-snug text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function ContactItem({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
      <p className="truncate text-[11px] font-medium text-foreground">{value || '—'}</p>
    </div>
  );
}

function StepDots({ view }: { view: ParticipantView }) {
  if (view.steps.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground">
        No pre-auction workflow steps were set up for this auction.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border/60 rounded-md border border-border">
      {view.steps.map((step) => (
        <li key={step.id} className="flex items-center gap-2 px-3 py-2">
          <span
            aria-hidden
            className={
              step.state === 'done'
                ? 'h-2.5 w-2.5 shrink-0 rounded-full bg-success'
                : step.state === 'review'
                  ? 'h-2.5 w-2.5 shrink-0 rounded-full bg-warning'
                  : 'h-2.5 w-2.5 shrink-0 rounded-full border border-muted-foreground/50'
            }
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-foreground">{step.title}</span>
            <span
              className={
                step.state === 'review'
                  ? 'block text-[10px] text-warning'
                  : 'block text-[10px] text-muted-foreground'
              }
            >
              {step.status}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function SubmittedDetails({ view }: { view: ParticipantView }) {
  const withDetails = view.steps.filter((step) => step.fields.length > 0);
  if (withDetails.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border px-3 py-3 text-[11px] text-muted-foreground">
        No form answers have been submitted yet.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {withDetails.map((step) => (
        <div key={step.id} className="overflow-hidden rounded-md border border-border">
          <div className="flex items-center gap-1.5 bg-muted/30 px-3 py-1.5">
            <FileText className="h-3 w-3 text-muted-foreground" aria-hidden />
            <p className="text-[11px] font-semibold text-foreground">{step.title}</p>
            <span className="ml-auto text-[10px] text-muted-foreground">{step.status}</span>
          </div>
          <dl className="divide-y divide-border/60">
            {step.fields.map((field) => (
              <div
                key={`${step.id}-${field.label}`}
                className="grid gap-1 px-3 py-1.5 text-[11px] sm:grid-cols-[148px_minmax(0,1fr)]"
              >
                <dt className="text-muted-foreground">{field.label}</dt>
                <dd className="break-words font-medium text-foreground">{field.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

function DecisionArea({
  view,
  decision,
  local,
  onDecision,
}: {
  view: ParticipantView;
  decision?: InviteDecision;
  local?: boolean;
  onDecision: (decision: 'APPROVED' | 'REJECTED', reason?: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [changing, setChanging] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  if (view.bucket === 'cancelled') {
    return (
      <p className="text-[11px] text-muted-foreground">
        This invitation was cancelled, so there is nothing to decide.
      </p>
    );
  }

  if (decision && !changing) {
    return (
      <div className="space-y-2">
        <p className="text-[11px] text-foreground">
          {decision.decision === 'APPROVED' ? (
            <>
              Approved {decision.at ? formatDateTime(decision.at) : 'just now'}. They’re ready to
              bid.
            </>
          ) : (
            <>
              Rejected {decision.at ? formatDateTime(decision.at) : 'just now'}
              {decision.reason ? `. Reason: ${decision.reason}` : '.'}
            </>
          )}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-3 text-xs"
          onClick={() => setChanging(true)}
        >
          Change decision
        </Button>
        {local && (
          <p className="text-[10px] text-muted-foreground">
            Held on this screen only until participant review syncing is connected.
          </p>
        )}
      </div>
    );
  }

  if (rejecting) {
    return (
      <div className="space-y-2">
        <label
          htmlFor={`reject-reason-${view.participant.id}`}
          className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Reason · sent to them
        </label>
        <textarea
          id={`reject-reason-${view.participant.id}`}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setReasonError(null);
          }}
          rows={3}
          placeholder="Say what needs fixing before they can take part."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
        {reasonError && <p className="text-[11px] text-destructive">{reasonError}</p>}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              if (!reason.trim()) {
                setReasonError('Add a reason so they know what to fix.');
                return;
              }
              setChanging(false);
              onDecision('REJECTED', reason.trim());
            }}
            className="h-7 px-3 text-xs"
          >
            Confirm rejection
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRejecting(false)}
            className="h-7 px-3 text-xs"
          >
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        onClick={() => {
          setChanging(false);
          onDecision('APPROVED');
        }}
        className="h-7 gap-1.5 px-3 text-xs"
      >
        <Check className="h-3.5 w-3.5" />
        Approve
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setRejecting(true)}
        className="h-7 px-3 text-xs"
      >
        Reject
      </Button>
      {changing && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setChanging(false)}
          className="h-7 px-3 text-xs"
        >
          Cancel
        </Button>
      )}
    </div>
  );
}

export function ParticipantDetail({
  view,
  decision,
  localDecision,
  onDecision,
  onClose,
}: {
  view: ParticipantView;
  decision?: InviteDecision;
  localDecision?: boolean;
  onDecision: (decision: 'APPROVED' | 'REJECTED', reason?: string) => void;
  onClose: () => void;
}) {
  const effectiveDecision = decision ?? view.decision;
  const effectiveBucket =
    effectiveDecision?.decision === 'APPROVED'
      ? 'approved'
      : effectiveDecision?.decision === 'REJECTED'
        ? 'rejected'
        : view.bucket;
  const effectiveLabel =
    effectiveDecision?.decision === 'APPROVED'
      ? 'Approved'
      : effectiveDecision?.decision === 'REJECTED'
        ? 'Rejected'
        : view.label;

  // A review decision applies to the participation form, so its step copy should
  // follow the decision immediately instead of still saying "waiting for review".
  const displayView: ParticipantView = effectiveDecision
    ? {
        ...view,
        steps: view.steps.map((step) => {
          if (step.state !== 'review') return step;
          if (effectiveDecision.decision === 'APPROVED') {
            return { ...step, state: 'done' as const, status: 'Sent · approved by you' };
          }
          return { ...step, status: 'Sent · rejected by you' };
        }),
      }
    : view;

  return (
    <div className="overflow-hidden rounded-md border border-warning/50 bg-card">
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-warning/5 px-4 py-2.5">
        <UserAvatar
          firstName={view.name.split(' ')[0]}
          lastName={view.name.split(' ').slice(1).join(' ')}
          username={view.participant.username || view.email}
          src={view.participant.profilePicture || view.participant.avatar}
          size={26}
          className="h-6 w-6 shrink-0"
        />
        <span className="text-xs font-semibold text-foreground">{view.name}</span>
        <ParticipantStatusBadge bucket={effectiveBucket}>{effectiveLabel}</ParticipantStatusBadge>
        <span className="text-[11px] text-muted-foreground">
          {view.kind === 'existing' ? 'Existing user' : 'New person, invited by email'}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close participant details"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="divide-y divide-border/60">
        <DetailRow
          label="Contact"
          description={
            view.kind === 'existing'
              ? 'Already has an account.'
              : view.company
                ? 'Signed up from the invitation.'
                : 'Not on the platform yet.'
          }
        >
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <ContactItem label="Email" value={view.email} />
            <ContactItem label="Mobile" value={view.mobile} />
            <ContactItem label="Company" value={view.company} />
            <ContactItem label="Invitation" value={view.invitationLine} />
          </div>
        </DetailRow>

        <DetailRow label="Steps" description="What they’ve done so far.">
          <StepDots view={displayView} />
        </DetailRow>

        <DetailRow
          label="Details submitted"
          description="Their answers to the forms in the invitation."
        >
          <SubmittedDetails view={displayView} />
        </DetailRow>

        <DetailRow label="Decision" description="Based on the details they sent.">
          <DecisionArea
            view={view}
            decision={effectiveDecision}
            local={localDecision}
            onDecision={onDecision}
          />
        </DetailRow>
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/30 px-4 py-2.5">
        <p className="text-[11px] text-muted-foreground">
          Approving lets them bid once every required step is done.
        </p>
        <Button type="button" size="sm" onClick={onClose} className="ml-auto h-7 px-3 text-xs">
          Close
        </Button>
      </footer>
    </div>
  );
}
