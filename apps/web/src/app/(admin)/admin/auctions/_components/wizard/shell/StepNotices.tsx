'use client';

import { AlertTriangle, Lock } from 'lucide-react';
import { Button } from '@repo/ui';
import { useAuctionWizard } from '../../../_context';
import { REVIEW_REASON_TEXT, isSetupStep, type WizardStepId } from '../../../_lib/wizard/steps';
import { formatDateTime } from '../../../_lib/wizard/summary';

/** Banners above a setup step: the rules are locked after publishing, the step
 *  needs another look after an upstream change, or the unit is a legacy type. */
export function StepNotices() {
  const {
    step,
    published,
    publishedAt,
    isPrivate,
    reviewFlags,
    unitNotice,
    markReviewed,
    goToStep,
  } = useAuctionWizard();
  if (!isSetupStep(step)) return null;
  const reason = reviewFlags[step as WizardStepId];

  return (
    <>
      {published && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2.5"
        >
          <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="min-w-0 flex-1 text-[11px] leading-snug text-foreground">
            Published{publishedAt ? ` ${formatDateTime(publishedAt)}` : ''}. The rules are locked as
            version 1, so everyone takes part on the same terms. You can look, but not change
            anything.
          </p>
          {isPrivate && (
            <Button type="button" size="sm" className="h-7 text-xs" onClick={() => goToStep(7)}>
              Invite participants
            </Button>
          )}
        </div>
      )}

      {!published && reason && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden />
          <p className="min-w-0 flex-1 text-[11px] leading-snug text-foreground">
            {REVIEW_REASON_TEXT[reason]}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => markReviewed(step)}
          >
            Mark as reviewed
          </Button>
        </div>
      )}

      {step === 1 && unitNotice && (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-[11px] leading-relaxed text-foreground">
          This auction uses a <span className="font-semibold">{unitNotice}</span> unit. The simple
          editor keeps that unit type when saving; its listings still appear below.
        </div>
      )}
    </>
  );
}
