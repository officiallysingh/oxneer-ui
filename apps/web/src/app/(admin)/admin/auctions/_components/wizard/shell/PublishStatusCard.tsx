'use client';

import { Button, cn } from '@repo/ui';
import { useAuctionWizard } from '../../../_context';
import { formatDateTime } from '../../../_lib/wizard/summary';

/** "Before you publish" in the sidebar: what still blocks publishing, or, once
 *  published, where invitations stand. */
export function PublishStatusCard() {
  const { published, publishedAt, isPrivate, inviteStats, progress, goToStep } = useAuctionWizard();

  const goInvite = published && isPrivate;
  const { blockerText, checks } = progress;

  const [tone, text] = published
    ? [
        'text-success',
        isPrivate
          ? `${inviteStats?.invited ?? 0} invited · ${inviteStats?.ready ?? 0} ready`
          : 'Rules locked as version 1',
      ]
    : blockerText
      ? ['text-destructive', blockerText]
      : checks.length
        ? ['text-warning', `Ready to publish · ${checks.length} to check`]
        : ['text-success', 'Ready to publish'];

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-3">
      <p className="text-xs font-semibold text-foreground">
        {published ? 'Published' : 'Before you publish'}
      </p>
      <p className={cn('mt-0.5 text-[11px] font-semibold leading-snug', tone)}>{text}</p>
      {published && publishedAt && (
        <p className="text-[10px] text-muted-foreground">{formatDateTime(publishedAt)}</p>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2 h-7 w-full text-xs"
        onClick={() => goToStep(goInvite ? 7 : 6)}
      >
        {goInvite ? 'Invite participants' : 'Open review'}
      </Button>
    </div>
  );
}
