'use client';

import { useRouter } from 'next/navigation';
import { AuctionVM, AuctionWorkflowStep } from '@repo/api';
import { Button } from '@repo/ui';
import { GitFork, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { WorkflowStagesTimeline } from '../../../_components/timeline/WorkflowStagesTimeline';
import { TimelineNode } from '../../../_components/timeline/types';
import {
  resolveStr,
  fmtLabel,
  parseIsoDurationMs,
  humanizeIsoDuration,
} from '../../../_components/PolicyShared';
import { stepTypeMeta } from '../../../_components/WorkflowStepDetails';
import { formatDate, formatClock } from '@/components/common/admin/format';

interface AuctionWorkflowTabProps {
  auctionId: string;
  auction: AuctionVM;
  workflow: AuctionWorkflowStep[];
  onDeleteWorkflow?: () => void;
  deletingWorkflow?: boolean;
}

function effectiveStepPhase(step: AuctionWorkflowStep): 'PRE_AUCTION' | 'POST_AUCTION' {
  const phaseStr = resolveStr(step.phase);
  if (phaseStr === 'PRE_AUCTION' || phaseStr === 'POST_AUCTION') {
    return phaseStr;
  }
  if (step.prePayment === true) return 'PRE_AUCTION';
  if (step.postPayment === true) return 'POST_AUCTION';
  return 'PRE_AUCTION';
}

function buildWorkflowTimeline(
  workflow: AuctionWorkflowStep[],
  startIso?: string,
  endIso?: string,
): TimelineNode[] {
  const startMs = startIso ? new Date(startIso).getTime() : null;
  const endMs = endIso ? new Date(endIso).getTime() : null;

  let prePaySeq = 0;
  let postPaySeq = 0;

  return [...workflow]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((step): TimelineNode => {
      const typeStr = resolveStr(step.type);
      const { Icon, dot, text, border } = stepTypeMeta(typeStr);
      const phase = effectiveStepPhase(step);
      const label = fmtLabel(typeStr) || 'Step';

      let title: string;
      if (typeStr === 'PAYMENT_STEP') {
        if (phase === 'PRE_AUCTION') {
          prePaySeq += 1;
          title = `Pre Payment ${prePaySeq}`;
        } else {
          postPaySeq += 1;
          title = `Post Payment ${postPaySeq}`;
        }
      } else {
        title = step.name || label;
      }

      const offsetMs = parseIsoDurationMs(step.offset);

      let time: string | undefined;
      let timeSecondary: string | undefined;
      let timeTo: string | undefined;
      let durationSub: string | undefined;

      if (phase === 'PRE_AUCTION') {
        if (startMs != null && offsetMs > 0) {
          const iso = new Date(startMs - offsetMs).toISOString();
          time = formatDate(iso);
          timeSecondary = formatClock(iso);
        }
        if (offsetMs > 0) {
          durationSub = `Due ${humanizeIsoDuration(offsetMs)} before start time.`;
        }
      } else {
        if (endMs != null && offsetMs > 0) {
          const iso = new Date(endMs + offsetMs).toISOString();
          time = formatDate(iso);
          timeSecondary = formatClock(iso);
        }
        if (offsetMs > 0) {
          durationSub = `Due ${humanizeIsoDuration(offsetMs)} after end time.`;
        }
      }

      const subs: string[] = [];
      if (durationSub) subs.push(durationSub);
      if (step.heads && step.heads.length > 0) {
        const headsStr = step.heads
          .map((h) => `${h.name}: ₹${h.value?.toLocaleString() ?? 0}`)
          .join(', ');
        subs.push(`Fee Heads: ${headsStr}`);
      }

      return {
        id: step.id ?? `step-${step.order}`,
        label,
        Icon,
        dotClass: dot,
        labelClass: text,
        borderClass: border,
        title,
        time,
        timeSecondary,
        timeTo,
        subs,
      };
    });
}

export function AuctionWorkflowTab({
  auctionId,
  auction,
  workflow,
  onDeleteWorkflow,
  deletingWorkflow = false,
}: AuctionWorkflowTabProps) {
  const router = useRouter();

  const workflowStartIso = auction.schedule?.startTime ?? auction.startTime;
  const workflowEndIso = auction.schedule?.endTime ?? auction.endTime;

  const preAuctionWorkflowNodes = buildWorkflowTimeline(
    workflow.filter((s) => effectiveStepPhase(s) === 'PRE_AUCTION'),
    workflowStartIso,
    workflowEndIso,
  );
  const postAuctionWorkflowNodes = buildWorkflowTimeline(
    workflow.filter((s) => effectiveStepPhase(s) === 'POST_AUCTION'),
    workflowStartIso,
    workflowEndIso,
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="flex flex-wrap items-center justify-between px-5 py-4 bg-muted/30 border-b border-border gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <GitFork className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Workflow Stages & Timeline</h3>
              <p className="text-xs text-muted-foreground">
                {workflow.length} step{workflow.length !== 1 ? 's' : ''} configured
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/admin/auctions/${auctionId}/edit`)}
              className="gap-1.5 text-xs rounded-xl"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Steps
            </Button>

            {workflow.length > 0 && onDeleteWorkflow && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDeleteWorkflow}
                disabled={deletingWorkflow}
                className="gap-1.5 text-xs rounded-xl text-destructive hover:bg-destructive/10 border-destructive/30"
              >
                {deletingWorkflow ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Delete all
              </Button>
            )}
          </div>
        </div>

        <div className="p-6">
          <WorkflowStagesTimeline
            preAuctionNodes={preAuctionWorkflowNodes}
            postAuctionNodes={postAuctionWorkflowNodes}
            auction={auction}
          />
        </div>
      </div>
    </div>
  );
}
