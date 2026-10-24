'use client';

import Link from 'next/link';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@repo/ui';
import { Pill } from '@/components/common/admin/Pill';
import { useAuctionWizard } from '../../../_context';
import { formatTime } from '../../../_lib/wizard/summary';

/** Breadcrumb, auction title, draft/published pill and the save action. */
export function WizardHeader() {
  const { mode, state, published, savedAt, busy, saveDraft } = useAuctionWizard();
  const crumb = mode === 'edit' ? 'Edit auction' : 'New auction';
  const title = state.basics.title.trim() || crumb;

  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
      <div className="min-w-0">
        <nav aria-label="Breadcrumb" className="text-[11px] text-muted-foreground">
          <Link
            href="/admin/auctions"
            className="rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Auctions
          </Link>
          <span className="px-1.5" aria-hidden>
            /
          </span>
          <span aria-current="page">{crumb}</span>
        </nav>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="truncate font-display text-lg font-semibold text-foreground" title={title}>
            {title}
          </h1>
          <Pill tone={published ? 'success' : 'muted'} className="h-5 px-2 text-[10px]">
            {published ? 'Published · v1' : 'Draft'}
          </Pill>
        </div>
      </div>

      {!published && (
        <div className="flex items-center gap-3">
          <span role="status" className="text-[11px] text-muted-foreground tabular-nums">
            {savedAt ? `Saved ${formatTime(savedAt.toISOString())}` : ''}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void saveDraft()}
            disabled={busy !== null}
            className="gap-2"
          >
            {busy === 'save' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Save className="h-3.5 w-3.5" aria-hidden />
            )}
            {mode === 'edit' ? 'Save changes' : 'Save draft'}
          </Button>
        </div>
      )}
    </header>
  );
}
