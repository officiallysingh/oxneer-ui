'use client';

import { type AuctionWorkflowStep, type ParticipantWorkflowStepStatus } from '@repo/api';
import { Button } from '@repo/ui';
import { CheckCircle2, Loader2, ClipboardList } from 'lucide-react';
import { resolveStr, formatLabel, formatDateTime } from '@/components/common/admin/format';

interface WorkflowStatusCardProps {
  workflow: AuctionWorkflowStep[];
  workflowStatus: Record<string, ParticipantWorkflowStepStatus>;
  onOpenWizard: () => void;
  allDone: boolean;
}

export function WorkflowStatusCard({
  workflow,
  workflowStatus,
  onOpenWizard,
  allDone,
}: WorkflowStatusCardProps) {
  const stepNameById = new Map<string, string>();
  const stepOrderById = new Map<string, number>();
  for (const step of workflow) {
    if (step.id) {
      const type = resolveStr(step.type);
      stepNameById.set(step.id, step.name || formatLabel(type) || 'Step');
      stepOrderById.set(step.id, step.order ?? Infinity);
    }
  }

  const entries = Object.entries(workflowStatus).sort(
    ([a], [b]) => (stepOrderById.get(a) ?? Infinity) - (stepOrderById.get(b) ?? Infinity),
  );

  const completedCount = entries.filter(([, s]) => {
    const t = resolveStr(s.type);
    return t === 'COMPLETED' || t === 'DONE' || t === 'APPROVED';
  }).length;

  const progressPct = entries.length > 0 ? (completedCount / entries.length) * 100 : 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Registration Steps
        </h2>
        {!allDone && (
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenWizard}
            className="gap-1.5 rounded-xl text-xs"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Continue
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {completedCount} of {entries.length} completed
          </span>
          <span>{Math.round(progressPct)}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-500' : 'bg-primary'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className="space-y-1.5">
        {entries.map(([stepId, s]) => {
          const t = resolveStr(s.type);
          const done = t === 'COMPLETED' || t === 'DONE' || t === 'APPROVED';
          const pending = t === 'PENDING' || t === 'IN_PROGRESS';
          return (
            <div
              key={stepId}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ${
                done
                  ? 'bg-emerald-500/5 text-emerald-700'
                  : pending
                    ? 'bg-amber-500/5 text-amber-700'
                    : 'bg-muted/30 text-muted-foreground'
              }`}
            >
              {done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              ) : pending ? (
                <Loader2 className="h-4 w-4 shrink-0 text-amber-500" />
              ) : (
                <div className="h-4 w-4 shrink-0 rounded-full border-2 border-current opacity-40" />
              )}
              <span className="flex-1 truncate font-medium">
                {stepNameById.get(stepId) || formatLabel(t) || 'Step'}
              </span>
              <span
                className={`text-[11px] font-medium shrink-0 ${done ? 'text-emerald-600' : pending ? 'text-amber-600' : 'text-muted-foreground'}`}
              >
                {formatLabel(t)}
              </span>
              {s.updatedAt && (
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatDateTime(s.updatedAt)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {allDone && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-500/10 px-4 py-2.5 rounded-lg">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          All registration steps completed. You are fully registered to participate.
        </div>
      )}
    </div>
  );
}
