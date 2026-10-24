'use client';

import { Check } from 'lucide-react';
import { Button, cn } from '@repo/ui';
import type { WizardProgress } from '../../../_hooks/useAuctionWizardController';
import { formatDateTime } from '../../../_lib/wizard/summary';

/** One status banner for the review screen: published, blocked or ready. */
export function ReviewBanner({
  published,
  publishedAt,
  isPrivate,
  progress,
  onInvite,
}: {
  published: boolean;
  publishedAt: string | null;
  isPrivate: boolean;
  progress: WizardProgress;
  onInvite: () => void;
}) {
  if (published) {
    return (
      <div
        role="status"
        className="flex flex-wrap items-center gap-3 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5"
      >
        <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />
        <p className="min-w-0 flex-1 text-[11px] leading-snug text-foreground">
          Published{publishedAt ? ` ${formatDateTime(publishedAt)}` : ''}. The rules are locked as
          version 1.{isPrivate ? ' Next, invite the people who can take part.' : ''}
        </p>
        {isPrivate && (
          <Button type="button" size="sm" className="h-7 px-2.5 text-xs" onClick={onInvite}>
            Invite participants
          </Button>
        )}
      </div>
    );
  }

  const { blockerText, mustFix, checks } = progress;

  if (blockerText) {
    return (
      <div
        className={cn(
          'rounded-lg border px-3 py-2.5',
          mustFix.length
            ? 'border-destructive/30 bg-destructive/10'
            : 'border-warning/30 bg-warning/10',
        )}
      >
        <p
          className={cn(
            'text-xs font-semibold',
            mustFix.length ? 'text-destructive' : 'text-foreground',
          )}
        >
          {blockerText} before you can publish
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {checks.length
            ? `${checks.length} warning${checks.length === 1 ? '' : 's'} to check as well. `
            : ''}
          Use the checklist below.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2.5">
      <p className="text-xs font-semibold text-success">Ready to publish</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        {checks.length
          ? `Every step is complete. ${checks.length} warning${checks.length === 1 ? '' : 's'} to check.`
          : 'Every step is complete. No warnings.'}
      </p>
    </div>
  );
}
