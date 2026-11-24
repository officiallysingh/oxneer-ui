'use client';

import { type AuctionWorkflowStep, type ParticipantVM } from '@oxneer/api';
import { cn } from '@oxneer/ui';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { isStepCompleted, stepTitle } from '@/components/common/workflow-steps';

interface StepSidebarProps {
  steps: AuctionWorkflowStep[];
  currentIndex: number;
  participant: ParticipantVM | null;
}

export function StepSidebar({ steps, currentIndex, participant }: StepSidebarProps) {
  return (
    <ol className="space-y-1">
      {steps.map((step, i) => {
        const done = isStepCompleted(step, participant);
        const active = i === currentIndex;

        return (
          <li
            key={step.id}
            aria-current={active ? 'step' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
              active && 'bg-primary/10 font-semibold text-primary',
              !active && done && 'text-success',
              !active && !done && 'text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                active && 'bg-primary text-primary-foreground',
                !active && done && 'bg-success/15 text-success',
                !active && !done && 'bg-muted text-muted-foreground',
              )}
            >
              {done ? <CheckCircle2 className="h-3.5 w-3.5" aria-label="Done" /> : i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-medium leading-tight">
              {stepTitle(step)}
            </span>
            {active && <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
