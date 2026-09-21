'use client';

import { ArrowRight, CheckCircle2, GitFork } from 'lucide-react';
import { TimelineItem } from './TimelineItem';
import { TimelineNode } from './types';
import { humanizeIsoDuration } from '../../_components/PolicyShared';
import { formatDate, formatClock } from '@/components/common/admin/format';
import { cn } from '@/lib/utils';
import { AuctionVM } from '@repo/api';

interface WorkflowStage {
  id: string;
  label: string;
  phase: string;
  iso?: string;
  contextLabel?: string;
  subLine?: string;
  nodes: TimelineNode[];
  badgeClass: string;
  iconWrapClass: string;
  cardClassName?: string;
  isMarker?: boolean;
}

interface WorkflowStagesTimelineProps {
  preAuctionNodes: TimelineNode[];
  postAuctionNodes: TimelineNode[];
  auction: AuctionVM;
}

export function WorkflowStagesTimeline({
  preAuctionNodes,
  postAuctionNodes,
  auction,
}: WorkflowStagesTimelineProps) {
  const stages: WorkflowStage[] = [];

  // Pre-auction stage — tinted so it reads as its own phase at a glance.
  if (preAuctionNodes.length > 0) {
    const startIso = auction.schedule?.startTime ?? auction.startTime;
    stages.push({
      id: 'pre-auction',
      label: 'Pre Auction',
      phase: 'PRE_AUCTION',
      iso: startIso ?? undefined,
      contextLabel: 'Before',
      badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
      iconWrapClass: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300',
      cardClassName:
        'bg-rose-50/70 border border-rose-200/70 dark:bg-rose-950/20 dark:border-rose-900/40',
      subLine:
        'Steps that must be completed before the auction starts (registration, payment, verification).',
      nodes: preAuctionNodes,
    });
  }

  // Auction start — a point in time, not a phase, so it renders as a slim marker on the connector.
  if (auction.schedule?.startTime) {
    stages.push({
      id: 'auction-start-marker',
      label: 'Auction Start',
      phase: 'AUCTION',
      iso: auction.schedule.startTime,
      contextLabel: 'Auction opens',
      badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
      iconWrapClass: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
      nodes: [],
      isMarker: true,
    });
  }

  // Post-auction stage
  if (postAuctionNodes.length > 0) {
    const endIso = auction.schedule?.endTime ?? auction.endTime;
    stages.push({
      id: 'post-auction',
      label: 'Post Auction',
      phase: 'POST_AUCTION',
      iso: endIso ?? undefined,
      contextLabel: 'After',
      badgeClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
      iconWrapClass: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300',
      cardClassName:
        'bg-indigo-50/60 border border-indigo-200/70 dark:bg-indigo-950/20 dark:border-indigo-900/40',
      subLine:
        'Steps that occur after the auction closes (winner determination, payment settlement).',
      nodes: postAuctionNodes,
    });
  }

  if (stages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 gap-3">
        <div className="p-3 rounded-full bg-muted text-muted-foreground">
          <GitFork className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold">No workflow steps configured</p>
      </div>
    );
  }

  const iconMap: Record<string, React.ReactNode> = {
    'pre-auction': <GitFork className="h-5 w-5" />,
    'auction-start-marker': <CheckCircle2 className="h-5 w-5" />,
    'post-auction': <GitFork className="h-5 w-5" />,
  };

  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="flex items-start w-full min-w-[520px]">
        {stages.map((stage, idx) => {
          const isLast = idx === stages.length - 1;
          const nextStage = !isLast ? stages[idx + 1] : null;

          let durationToNext: string | null = null;
          if (stage.iso && nextStage?.iso) {
            const diffMs = new Date(nextStage.iso).getTime() - new Date(stage.iso).getTime();
            if (diffMs > 0) durationToNext = humanizeIsoDuration(diffMs);
          }

          const nestedNodes =
            stage.nodes.length > 0 ? (
              <div className="relative mt-4 space-y-2">
                {stage.nodes.length > 1 && (
                  <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-border z-0" />
                )}
                {stage.nodes.map((node, i) => {
                  const nodeIsLast = i === stage.nodes.length - 1;
                  const nextNode = !nodeIsLast ? stage.nodes[i + 1] : null;

                  let nodeDurationToNext: string | null = null;
                  if (node.time && nextNode?.time) {
                    try {
                      const from = new Date(node.time);
                      const to = new Date(nextNode.time);
                      const diffMs = to.getTime() - from.getTime();
                      if (diffMs > 0) nodeDurationToNext = humanizeIsoDuration(diffMs);
                    } catch {
                      // ignore
                    }
                  }

                  return (
                    <TimelineItem
                      key={node.id}
                      time={node.time}
                      timeSecondary={node.timeSecondary}
                      timeTo={node.timeTo}
                      icon={<node.Icon className={`h-5 w-5 ${node.labelClass}`} />}
                      title={node.title}
                      description={node.subs?.[0]}
                      badge={node.label}
                      badgeClass={node.labelClass}
                      subs={node.subs?.slice(1) ?? []}
                      details={node.details}
                      isLast={nodeIsLast}
                      durationToNext={nodeDurationToNext}
                      cardClassName="bg-card/80 border border-border"
                      compact
                    />
                  );
                })}
              </div>
            ) : null;

          return (
            <div key={stage.id} className="flex items-start flex-1 min-w-[160px]">
              <div
                className={cn(
                  'flex flex-col items-center mx-auto',
                  stage.isMarker ? 'w-[160px]' : 'w-full min-w-[320px] max-w-[420px]',
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-12 h-12 rounded-full border-4 border-background shadow-sm',
                    stage.iconWrapClass,
                  )}
                >
                  {iconMap[stage.id]}
                </div>

                <span
                  className={cn(
                    'mt-3 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full',
                    stage.badgeClass,
                  )}
                >
                  {stage.label}
                </span>

                {stage.iso && (
                  <div className="mt-2 text-center">
                    <p className="text-sm font-bold text-foreground leading-tight">
                      {formatDate(stage.iso)}
                    </p>
                    <p className="text-xs text-muted-foreground leading-tight">
                      {formatClock(stage.iso)}
                    </p>
                    {stage.contextLabel && (
                      <p className="text-[11px] text-muted-foreground mt-1">{stage.contextLabel}</p>
                    )}
                  </div>
                )}

                {!stage.isMarker && (
                  <div
                    className={cn(
                      'mt-4 w-full rounded-xl p-4',
                      stage.cardClassName ?? 'bg-card border border-border',
                    )}
                  >
                    {stage.subLine && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {stage.subLine}
                      </p>
                    )}
                    {nestedNodes}
                  </div>
                )}
              </div>

              {!isLast && (
                <div className="w-12 shrink-0 flex flex-col items-center justify-center pt-5">
                  <div className="relative w-8 h-0.5 bg-border">
                    <ArrowRight className="absolute -right-1.5 -top-[7px] h-4 w-4 text-border" />
                  </div>
                  {durationToNext && (
                    <span className="mt-2 text-[11px] font-semibold text-muted-foreground whitespace-nowrap bg-background border border-border rounded-full px-2.5 py-0.5 shadow-sm">
                      {durationToNext}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
