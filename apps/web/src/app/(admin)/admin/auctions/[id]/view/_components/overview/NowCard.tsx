import type { ReactNode } from 'react';
import { Check, Info } from 'lucide-react';
import { Card, cn } from '@repo/ui';
import { Pill } from '@/components/common/admin/Pill';
import type { Phrase } from '../../_lib/phrase';
import type { ProgressStep } from '../../_lib/stage';
import { PhraseText } from '../PhraseText';

function StepMarker({ step, index }: { step: ProgressStep; index: number }) {
  if (step.state === 'done') {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success text-background">
        <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
      </span>
    );
  }
  return (
    <span
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums',
        step.state === 'current'
          ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
          : 'border-2 border-input bg-card text-muted-foreground',
      )}
    >
      {index + 1}
    </span>
  );
}

function ProgressStepper({ steps }: { steps: ProgressStep[] }) {
  return (
    <ol aria-label="Auction progress" className="grid gap-x-0 gap-y-4 sm:grid-cols-3 lg:flex">
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        return (
          <li
            key={step.key}
            aria-current={step.state === 'current' ? 'step' : undefined}
            className="flex min-w-0 flex-1 gap-3 lg:flex-col lg:gap-2"
          >
            <div className="flex items-center">
              <StepMarker step={step} index={index} />
              {!last && (
                <span
                  aria-hidden
                  className={cn(
                    'mx-2 hidden h-0.5 flex-1 lg:block',
                    step.state === 'done' ? 'bg-success' : 'bg-border',
                  )}
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{step.label}</p>
              {step.when && (
                <p className="text-xs tabular-nums text-muted-foreground">{step.when}</p>
              )}
              {step.state === 'done' && <span className="sr-only">Done</span>}
              {step.state === 'current' && (
                <Pill tone="outline" className="mt-1 border-primary/40 text-foreground">
                  You are here
                </Pill>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

interface NowCardProps {
  sentence: Phrase;
  steps: ProgressStep[];
  /** The one main action for this moment, if there is one. */
  action?: ReactNode;
  showProgress: boolean;
}

export function NowCard({ sentence, steps, action, showProgress }: NowCardProps) {
  return (
    <Card
      aria-labelledby="now-heading"
      className="flex flex-col gap-5 rounded-none p-4 shadow-none sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-3xl gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">
            <Info className="h-4 w-4" aria-hidden />
          </span>
          <div className="space-y-1">
            <h2 id="now-heading" className="text-base font-semibold text-foreground">
              What is happening now
            </h2>
            <p className="text-sm text-muted-foreground">
              <PhraseText phrase={sentence} />
            </p>
          </div>
        </div>
        {action}
      </div>
      {showProgress && <ProgressStepper steps={steps} />}
    </Card>
  );
}
