'use client';

import { type ReactNode } from 'react';
import { type AuctionVM, type AuctionWorkflowStep } from '@repo/api';
import { GitFork, DollarSign, Settings2 } from 'lucide-react';
import { resolveStr, formatLabel } from '@/components/common/admin/format';
import { WorkflowStagesTimeline } from '../../(admin)/admin/auctions/_components/timeline/WorkflowStagesTimeline';
import type { TimelineNode } from '../../(admin)/admin/auctions/_components/timeline/types';
import {
  stepTypeMeta,
  PaymentStepDetails,
  BankDetailStepDetails,
  ParticipationFormStepDetails,
  TnCStepDetails,
  FormStepDetails,
} from '../../(admin)/admin/auctions/_components/WorkflowStepDetails';

// ── Detail row primitive ──────────────────────────────────────────────────────

export function PublicDetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right">{children}</span>
    </div>
  );
}

// ── Monetary + Protocol settings cards ───────────────────────────────────────

export function PublicAuctionOverview({ auction }: { auction: AuctionVM }) {
  return (
    <>
      <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Monetary options</h2>
        </div>
        <div className="space-y-3 text-sm">
          <PublicDetailRow label="Currency unit">
            {resolveStr(auction.monetaryOptions?.currencyUnit) || '—'}
          </PublicDetailRow>
          <PublicDetailRow label="Precision">
            {auction.monetaryOptions?.precision != null
              ? `${auction.monetaryOptions.precision} decimal places`
              : '—'}
          </PublicDetailRow>
          <PublicDetailRow label="Rounding mode">
            {formatLabel(auction.monetaryOptions?.roundingMode) || '—'}
          </PublicDetailRow>
        </div>
      </div>

      <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Settings2 className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Auction settings</h2>
        </div>
        <div className="space-y-3 text-sm">
          <PublicDetailRow label="Accessibility">
            {formatLabel(auction.protocol?.accessibility) || '—'}
          </PublicDetailRow>
          <PublicDetailRow label="Dimension">
            {formatLabel(auction.protocol?.dimension) || '—'}
          </PublicDetailRow>
          <PublicDetailRow label="Participant visibility">
            {formatLabel(auction.protocol?.participantVisibility) || '—'}
          </PublicDetailRow>
          <PublicDetailRow label="Offer visibility">
            {formatLabel(auction.protocol?.offerVisibility) || '—'}
          </PublicDetailRow>
        </div>
      </div>
    </>
  );
}

// ── Workflow timeline section ─────────────────────────────────────────────────

function publicWorkflowPhase(step: AuctionWorkflowStep): 'PRE_AUCTION' | 'POST_AUCTION' {
  return resolveStr(step.phase) === 'POST_AUCTION' || step.postPayment === true
    ? 'POST_AUCTION'
    : 'PRE_AUCTION';
}

function publicStepDetails(step: AuctionWorkflowStep): ReactNode {
  switch (resolveStr(step.type)) {
    case 'PAYMENT_STEP':
      return <PaymentStepDetails step={step} />;
    case 'BANK_DETAIL_FORM_STEP':
      return <BankDetailStepDetails />;
    case 'PARTICIPATION_FORM_STEP':
      return <ParticipationFormStepDetails step={step} />;
    case 'TNC_FORM_STEP':
      return <TnCStepDetails step={step} />;
    case 'FORM_STEP':
      return <FormStepDetails step={step} />;
    default:
      return null;
  }
}

function buildPublicWorkflowNodes(workflow: AuctionWorkflowStep[]): TimelineNode[] {
  return [...workflow]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((step, index) => {
      const type = resolveStr(step.type);
      const meta = stepTypeMeta(type);
      const details = publicStepDetails(step);

      return {
        id: step.id ?? `public-workflow-step-${index}`,
        label: formatLabel(type) || 'Workflow step',
        Icon: meta.Icon,
        dotClass: meta.dot,
        labelClass: meta.text,
        borderClass: meta.border,
        title: step.name || formatLabel(type) || `Step ${index + 1}`,
        subs: step.description ? [step.description] : [],
        details,
      };
    });
}

export function PublicWorkflow({
  workflow,
  auction,
}: {
  workflow: AuctionWorkflowStep[];
  auction: AuctionVM;
}) {
  const preAuctionNodes = buildPublicWorkflowNodes(
    workflow.filter((step) => publicWorkflowPhase(step) === 'PRE_AUCTION'),
  );
  const postAuctionNodes = buildPublicWorkflowNodes(
    workflow.filter((step) => publicWorkflowPhase(step) === 'POST_AUCTION'),
  );

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
          <GitFork className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Participation workflow</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Follow these steps to complete your registration for the auction.
          </p>
        </div>
      </div>

      <WorkflowStagesTimeline
        preAuctionNodes={preAuctionNodes}
        postAuctionNodes={postAuctionNodes}
        auction={auction}
      />
    </section>
  );
}
