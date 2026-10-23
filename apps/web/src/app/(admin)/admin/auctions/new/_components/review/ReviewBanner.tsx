'use client';

import { Check } from 'lucide-react';
import { Button } from '@repo/ui';
import type { ReviewIssue } from '../shared/validation';
import { formatDateTime } from '../shared/summary';

/** One status banner for the review screen: published, blocked, unopened or ready. */
export function ReviewBanner({
  published,
  publishedAt,
  mustFix,
  checks,
  unopened,
  onInvite,
}: {
  published: boolean;
  publishedAt: string | null;
  mustFix: ReviewIssue[];
  checks: ReviewIssue[];
  unopened: number[];
  onInvite: () => void;
}) {
  if (published) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5">
        <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />
        <p className="min-w-0 flex-1 text-[11px] leading-snug text-foreground">
          Published {publishedAt ? formatDateTime(publishedAt) : ''}. The rules are locked as
          version 1. Next, invite the people who can take part.
        </p>
        <Button type="button" size="sm" className="h-7 px-2.5 text-xs" onClick={onInvite}>
          Invite participants
        </Button>
      </div>
    );
  }

  if (mustFix.length > 0) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5">
        <p className="text-xs font-semibold text-destructive">
          {mustFix.length} issue{mustFix.length === 1 ? '' : 's'} to fix before you can publish
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

  if (unopened.length > 0) {
    return (
      <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5">
        <p className="text-xs font-semibold text-foreground">
          {unopened.length} step{unopened.length === 1 ? '' : 's'} not opened yet before you can
          publish
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Use the checklist below to finish {unopened.length === 1 ? 'it' : 'them'}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2.5">
      <p className="text-xs font-semibold text-success">Ready to publish</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        Every step is complete. No warnings.
      </p>
    </div>
  );
}
