'use client';

import Link from 'next/link';
import { Pill } from '@/components/common/admin/Pill';
import { useAuctionWizard } from '../../../_context';

/** Breadcrumb, auction title and the draft/published pill. Saving lives in the
 *  step footer's action bar. */
export function WizardHeader() {
  const { mode, state, published } = useAuctionWizard();
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
    </header>
  );
}
