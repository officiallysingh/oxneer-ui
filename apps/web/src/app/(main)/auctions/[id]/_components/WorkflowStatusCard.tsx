'use client';

import { type AuctionWorkflowStep, type ParticipantWorkflowStepStatus } from '@oxneer/api';
import { Button, cn } from '@oxneer/ui';
import { CheckCircle2, Circle, ClipboardList } from 'lucide-react';
import { formatDateTime } from '@/components/common/admin/format';
import { isStatusDone, statusLabel, stepTitle } from '@/components/common/workflow-steps';

interface WorkflowStatusCardProps {
  workflow: AuctionWorkflowStep[];
  workflowStatus: Record<string, ParticipantWorkflowStepStatus>;
  onOpenWizard: () => void;
  allDone: boolean;
}

interface StatusRow {
  id: string;
  title: string;
  order: number;
  status: ParticipantWorkflowStepStatus;
}

function statusRows(
  workflow: AuctionWorkflowStep[],
  workflowStatus: Record<string, ParticipantWorkflowStepStatus>,
): StatusRow[] {
  const stepById = new Map(workflow.filter((s) => s.id).map((s) => [s.id, s]));
  return Object.entries(workflowStatus)
    .map(([id, status]) => {
      const step = stepById.get(id);
      return {
        id,
        title: step ? stepTitle(step) : 'Step',
        order: step?.order ?? Infinity,
        status,
      };
    })
    .sort((a, b) => a.order - b.order);
}

export function WorkflowStatusCard({
  workflow,
  workflowStatus,
  onOpenWizard,
  allDone,
}: WorkflowStatusCardProps) {
  const rows = statusRows(workflow, workflowStatus);
  const completedCount = rows.filter((row) => isStatusDone(row.status)).length;
  const progressPct = rows.length > 0 ? (completedCount / rows.length) * 100 : 0;

  return (
    <section
      aria-labelledby="registration-steps"
      className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-xs"
    >
      <div className="flex items-center justify-between gap-4">
        <h2
          id="registration-steps"
          className="flex items-center gap-2 text-base font-semibold text-foreground"
        >
          <ClipboardList className="h-5 w-5 text-primary" aria-hidden />
          Registration steps
        </h2>
        {!allDone && (
          <Button size="sm" variant="outline" onClick={onOpenWizard}>
            Continue
          </Button>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
          <span>
            {completedCount} of {rows.length} done
          </span>
          <span>{Math.round(progressPct)}%</span>
        </div>
        <div
          role="progressbar"
          aria-label="Registration progress"
          aria-valuenow={Math.round(progressPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-500',
              allDone ? 'bg-success' : 'bg-primary',
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <ul className="space-y-1.5">
        {rows.map((row) => (
          <StatusRowItem key={row.id} row={row} />
        ))}
      </ul>

      {allDone && (
        <p className="flex items-center gap-2 rounded-lg bg-success/10 px-4 py-2.5 text-sm text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          All registration steps are done. You can take part in this auction.
        </p>
      )}
    </section>
  );
}

function StatusRowItem({ row }: { row: StatusRow }) {
  const done = isStatusDone(row.status);
  const Icon = done ? CheckCircle2 : Circle;

  return (
    <li
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm',
        done ? 'bg-success/5 text-success' : 'bg-muted/30 text-foreground',
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', !done && 'text-muted-foreground')} aria-hidden />
      <span className="flex-1 truncate font-medium">{row.title}</span>
      <span className={cn('shrink-0 text-xs font-medium', !done && 'text-muted-foreground')}>
        {statusLabel(row.status)}
      </span>
      {row.status.updatedAt && (
        <span className="hidden shrink-0 text-xs text-muted-foreground tabular-nums sm:inline">
          {formatDateTime(row.status.updatedAt)}
        </span>
      )}
    </li>
  );
}
