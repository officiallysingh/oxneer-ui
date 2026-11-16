'use client';

import { ArrowLeft, ArrowRight, Loader2, Save } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
} from '@repo/ui';
import { useAuctionWizard } from '../../../_context';
import { STEP_LABELS, isSetupStep } from '../../../_lib/wizard/steps';
import { StatusPill } from '../review/StatusPill';
import { revealIssue } from '../ui/revealIssue';

/** Issues raised in the current setup step ("In this section"). */
function SectionIssues() {
  const { step, issues, published } = useAuctionWizard();
  const own = issues.filter((issue) => issue.step === step);
  if (published || own.length === 0) return null;

  return (
    <section
      aria-label="Issues in this section"
      className="rounded-none border border-border bg-card px-4 py-3"
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
            <span className="min-w-0 flex-1 text-[11px] leading-snug text-foreground">
              {issue.message}
            </span>
            {issue.anchor && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 shrink-0 px-2.5 text-[11px]"
                onClick={() => revealIssue(issue.anchor!)}
              >
                Show
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Leaves the wizard, asking first when there are edits that haven't been saved. */
function CancelButton({ disabled }: { disabled: boolean }) {
  const { hasUnsavedChanges, exit } = useAuctionWizard();

  if (!hasUnsavedChanges) {
    return (
      <Button type="button" variant="ghost" onClick={exit} disabled={disabled}>
        Cancel
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" disabled={disabled}>
          Cancel
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>
            Changes you haven&apos;t saved will be lost. Anything already saved stays on the
            auction.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction onClick={exit}>Discard and leave</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Back, Cancel, Save and Save & continue for steps 1–5. Both saves validate the step first. */
export function StepFooter() {
  const { step, busy, errors, locked, goBack, goNext, saveCurrentStep } = useAuctionWizard();
  if (!isSetupStep(step)) return null;
  const advancing = busy === 'step';
  const saving = busy === 'stepSave';
  const working = busy !== null;
  const nextLabel = STEP_LABELS[step + 1];

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
              disabled={working}
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
          <div className="flex flex-wrap items-center justify-end gap-2">
            <CancelButton disabled={working} />
            {/* Published setup steps are read-only, so there's nothing to save. */}
            {!locked && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void saveCurrentStep()}
                disabled={working}
                className="gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="h-4 w-4" aria-hidden />
                )}
                Save
              </Button>
            )}
            <Button
              type="button"
              onClick={() => void goNext()}
              disabled={working}
              className="gap-2"
              title={`Opens ${nextLabel}`}
            >
              {advancing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {locked ? `Next: ${nextLabel}` : 'Save & continue'}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
