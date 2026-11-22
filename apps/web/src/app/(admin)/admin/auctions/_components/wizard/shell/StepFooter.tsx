'use client';

import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
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
} from '@oxneer/ui';
import { useAuctionWizard } from '../../../_context';
import { STEP_LABELS, isSetupStep } from '../../../_lib/wizard/steps';
import { formatTime } from '../../../_lib/wizard/summary';
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

/** "Saved 10:32", "Unsaved changes", or nothing before the first edit. */
function SaveStatus() {
  const { savedAt, hasUnsavedChanges } = useAuctionWizard();
  const text = hasUnsavedChanges
    ? 'Unsaved changes'
    : savedAt
      ? `Saved ${formatTime(savedAt.toISOString())}`
      : '';
  return (
    <span role="status" className="text-xs text-muted-foreground tabular-nums">
      {text}
    </span>
  );
}

/** The one action bar for steps 1–5, stuck to the bottom of the screen:
 *  Cancel and Back on the left; Continue and Save & continue on the right.
 *  Save & continue validates and saves this step, then opens the next one.
 *  Continue opens the next one without saving: edits stay in the form (the
 *  rail marks the step "Not saved"). It needs the auction to exist, since
 *  nothing past Basics and unit opens until that step is saved. */
export function StepFooter() {
  const { auctionId, step, busy, errors, locked, published, goBack, goNext, goToStep } =
    useAuctionWizard();
  if (!isSetupStep(step)) return null;
  const advancing = busy === 'step';
  const working = busy !== null;
  const nextLabel = STEP_LABELS[step + 1];
  const canSkip = !locked && Boolean(auctionId);

  return (
    <>
      <SectionIssues />
      <div className="sticky bottom-0 z-10 -mx-1 border-t border-border bg-background/95 px-1 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-background/85">
        {errors.general && (
          <p role="alert" className="mb-2 text-xs text-destructive">
            {errors.general}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <CancelButton disabled={working} />
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={working}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Back: {STEP_LABELS[step - 1]}</span>
              <span className="sm:hidden">Back</span>
            </Button>
          )}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {!published && <SaveStatus />}
            {canSkip && (
              <Button
                type="button"
                variant="outline"
                onClick={() => goToStep(step + 1)}
                disabled={working}
                title={`Opens ${nextLabel} without saving this step`}
              >
                Continue
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
