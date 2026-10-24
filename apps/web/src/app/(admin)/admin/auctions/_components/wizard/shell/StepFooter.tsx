'use client';

import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@repo/ui';
import { useAuctionWizard } from '../../../_context';
import { STEP_LABELS, isSetupStep } from '../../../_lib/wizard/steps';
import { StatusPill } from '../review/StatusPill';

/** Issues raised in the current setup step ("In this section"). */
function SectionIssues() {
  const { step, issues, published } = useAuctionWizard();
  const own = issues.filter((issue) => issue.step === step);
  if (published || own.length === 0) return null;

  return (
    <section
      aria-label="Issues in this section"
      className="rounded-lg border border-border bg-card px-4 py-3"
    >
      <h3 className="text-xs font-semibold text-foreground">In this section</h3>
      <ul className="mt-2 space-y-1.5">
        {own.map((issue) => (
          <li key={issue.id} className="flex items-start gap-2">
            <span className="w-16 shrink-0">
              <StatusPill tone={issue.severity === 'must-fix' ? 'destructive' : 'warning'}>
                {issue.severity === 'must-fix' ? 'Must fix' : 'Check'}
              </StatusPill>
            </span>
            <span className="text-[11px] leading-snug text-foreground">{issue.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Back / Next for steps 1–5. Next validates and saves the step first. */
export function StepFooter() {
  const { step, busy, errors, goBack, goNext } = useAuctionWizard();
  if (!isSetupStep(step)) return null;
  const saving = busy === 'step';

  return (
    <>
      <SectionIssues />
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div>
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={saving}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back: {STEP_LABELS[step - 1]}
            </Button>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {errors.general && (
            <span role="alert" className="text-[11px] text-destructive">
              {errors.general}
            </span>
          )}
          <Button type="button" onClick={() => void goNext()} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Next: {STEP_LABELS[step + 1]}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </>
  );
}
