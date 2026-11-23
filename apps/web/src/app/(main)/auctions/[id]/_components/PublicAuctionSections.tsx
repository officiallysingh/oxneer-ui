'use client';

import type { ReactNode } from 'react';
import { type AuctionVM, type AuctionWorkflowStep } from '@oxneer/api';
import { resolveStr, formatLabel } from '@/components/common/admin/format';
import { WorkflowStagesTimeline } from '@/app/(admin)/admin/auctions/_components/timeline/WorkflowStagesTimeline';
import type { TimelineNode } from '@/app/(admin)/admin/auctions/_components/timeline/types';
import {
  stepTypeMeta,
  PaymentStepDetails,
  BankDetailStepDetails,
  ParticipationFormStepDetails,
  TnCStepDetails,
  FormStepDetails,
} from '@/app/(admin)/admin/auctions/_components/WorkflowStepDetails';

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
    <section aria-labelledby="participation-steps" className="space-y-5">
      <div>
        <h2 id="participation-steps" className="font-display text-xl font-semibold text-foreground">
          Participation steps
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          What you complete before the auction starts, and after it closes.
        </p>
      </div>

      <WorkflowStagesTimeline
        preAuctionNodes={preAuctionNodes}
        postAuctionNodes={postAuctionNodes}
        auction={auction}
      />
    </section>
  );
}
