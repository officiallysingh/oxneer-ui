'use client';

import { type AuctionWorkflowStep, type ParticipantVM } from '@repo/api';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { resolveStr, formatLabel } from '@/components/common/admin/format';

function resolveStepType(step: AuctionWorkflowStep): string {
  return resolveStr(step.type);
}

function stepIsCompleted(step: AuctionWorkflowStep, participant: ParticipantVM | null): boolean {
  if (!participant?.workflowStatus) return false;
  const entry = participant.workflowStatus[step.id];
  if (!entry) return false;
  const t = resolveStr(entry.type);
  return t === 'COMPLETED' || t === 'DONE' || t === 'APPROVED';
}

interface StepSidebarProps {
  steps: AuctionWorkflowStep[];
  currentIndex: number;
  participant: ParticipantVM | null;
}

export function StepSidebar({ steps, currentIndex, participant }: StepSidebarProps) {
  return (
    <ol className="space-y-1">
      {steps.map((step, i) => {
        const done = stepIsCompleted(step, participant);
        const active = i === currentIndex;
        const type = resolveStepType(step);

        return (
          <li
            key={step.id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
              active
                ? 'bg-primary/10 text-primary font-semibold shadow-xs'
                : done
                  ? 'text-emerald-600 bg-emerald-500/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
            }`}
          >
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : done
                    ? 'bg-emerald-500/20 text-emerald-600'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate leading-tight text-xs font-medium">
                {step.name || formatLabel(type)}
              </p>
            </div>
            {active && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
          </li>
        );
      })}
    </ol>
  );
}
