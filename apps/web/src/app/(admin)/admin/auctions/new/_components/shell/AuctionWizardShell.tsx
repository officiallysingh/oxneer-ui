'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@repo/ui';
import { Pill } from '@/components/common/admin/Pill';
import type { InviteStats, WizardState } from '../shared/types';
import type { ReviewIssue } from '../shared/validation';
import { formatDateTime } from '../shared/summary';
import { WizardStepRail } from './WizardStepRail';
import { WizardSummary } from './WizardSummary';

const STEP_COPY: Record<number, { title: string; description: string }> = {
  1: {
    title: 'Basics and unit',
    description:
      "Pick the auction type and direction first. They decide what the next steps show. Then describe what you're selling.",
  },
  2: {
    title: 'Offer rules',
    description:
      'How prices move during the auction, and how much participants can see while it runs.',
  },
  3: {
    title: 'Schedule and closing',
    description:
      'When bidding opens and closes, and what happens when an offer lands near the close.',
  },
  4: {
    title: 'Participation',
    description:
      'How many people must be ready for the auction to go live, and what each of them must do first.',
  },
  5: {
    title: 'Award',
    description:
      'Three policies run at the close: who wins, how ties break, and the winning price. Then the winner completes the steps after the auction.',
  },
  6: {
    title: 'Review and publish',
    description:
      'Check that every step is complete and the rules read right, then publish. Publishing locks the rules. After that, you invite people.',
  },
  7: {
    title: 'Invite participants',
    description:
      'Invite the people who can take part, then check the details they send and approve or reject them.',
  },
};

/** Page frame for the simple-auction wizard: header, step rail, summary and the
 *  current step body. The step body owns its own sections and footer actions. */
export function AuctionWizardShell({
  state,
  current,
  reached,
  workflowCount,
  postWorkflowCount,
  issues,
  savingDraft,
  published,
  publishedAt,
  inviteStats,
  onStepClick,
  onSaveDraft,
  onBackToAuctions,
  onInvite,
  children,
}: {
  state: WizardState;
  current: number;
  reached: number;
  workflowCount: number;
  postWorkflowCount: number;
  issues: ReviewIssue[];
  savingDraft: boolean;
  published: boolean;
  publishedAt: string | null;
  inviteStats?: InviteStats | null;
  onStepClick: (step: number) => void;
  onSaveDraft: () => void;
  onBackToAuctions: () => void;
  onInvite: () => void;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const isPublic = state.basics.accessibility === 'PUBLIC';
  const copy = STEP_COPY[current] ?? STEP_COPY[1]!;
  const title = state.basics.title.trim() || 'New auction';

  const mustFix = issues.filter((issue) => issue.severity === 'must-fix');
  const checks = issues.filter((issue) => issue.severity === 'check');
  const unopened = [1, 2, 3, 4, 5].filter((step) => step > reached);

  // The wizard lives inside the admin content scroller, so reset that (not the
  // window) whenever the visible step changes.
  useEffect(() => {
    rootRef.current?.closest('.overflow-y-auto')?.scrollTo({ top: 0 });
  }, [current]);

  const beforePublishText = published
    ? isPublic
      ? 'Public auction. Anyone registered can join.'
      : inviteStats
        ? `${inviteStats.invited} ${inviteStats.invited === 1 ? 'person' : 'people'} invited · ${inviteStats.ready} ready`
        : 'Invite the people who can take part, then finish.'
    : mustFix.length > 0
      ? `${mustFix.length} issue${mustFix.length === 1 ? '' : 's'} to fix`
      : unopened.length > 0
        ? `${unopened.length} step${unopened.length === 1 ? '' : 's'} not opened yet`
        : 'Ready to publish';

  return (
    <div ref={rootRef} className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          <nav className="text-[11px] text-muted-foreground" aria-label="Breadcrumb">
            <button
              type="button"
              onClick={onBackToAuctions}
              className="transition-colors hover:text-foreground"
            >
              Auctions
            </button>
            <span className="px-1.5">/</span>
            <span>New auction</span>
          </nav>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="truncate font-display text-lg font-semibold text-foreground">{title}</h1>
            {published ? (
              <Pill tone="success" className="h-5 px-2 text-[10px]">
                Published · v1
              </Pill>
            ) : (
              <Pill tone="muted" className="h-5 px-2 text-[10px]">
                Draft
              </Pill>
            )}
          </div>
        </div>
        {!published && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSaveDraft}
            disabled={savingDraft}
            className="gap-2"
          >
            {savingDraft ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save draft
          </Button>
        )}
      </header>

      <div className="grid gap-5 lg:grid-cols-[248px_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-3 lg:sticky lg:top-4">
          <WizardStepRail
            current={current}
            reached={reached}
            issues={issues}
            published={published}
            isPublic={isPublic}
            inviteStats={inviteStats}
            onStepClick={onStepClick}
          />

          <div className="rounded-lg border border-border bg-card px-3 py-3">
            <p className="text-xs font-semibold text-foreground">
              {published ? 'Published' : 'Before you publish'}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {published
                ? `${publishedAt ? `Published ${formatDateTime(publishedAt)}. ` : ''}${beforePublishText}`
                : beforePublishText === 'Ready to publish'
                  ? 'Every step is complete. No warnings.'
                  : beforePublishText}
            </p>
            <Button
              type="button"
              variant={published ? 'default' : 'outline'}
              size="sm"
              className="mt-2 h-7 w-full text-xs"
              onClick={() => (published ? onInvite() : onStepClick(6))}
            >
              {published ? 'Invite participants' : 'Open review'}
            </Button>
            {checks.length > 0 && !published && (
              <p className="mt-1.5 text-[10px] text-warning">
                {checks.length} warning{checks.length === 1 ? '' : 's'} to check
              </p>
            )}
          </div>

          <WizardSummary
            state={state}
            workflowCount={workflowCount}
            postWorkflowCount={postWorkflowCount}
            published={published}
            inviteStats={inviteStats}
          />
        </aside>

        <section aria-label={copy.title} className="min-w-0 space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Step {current} of 7
            </p>
            <h2 className="mt-0.5 font-display text-xl font-semibold text-foreground">
              {copy.title}
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              {copy.description}
            </p>
          </div>
          {children}
        </section>
      </div>
    </div>
  );
}
