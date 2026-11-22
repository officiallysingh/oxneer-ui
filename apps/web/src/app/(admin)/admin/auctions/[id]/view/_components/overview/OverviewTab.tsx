'use client';

import Link from 'next/link';
import { ClipboardCheck, Loader2, Send } from 'lucide-react';
import { Button } from '@oxneer/ui';
import type { ParticipantView } from '../../../../_components/wizard/invite/invite';
import { formatDateTime } from '../../../../_lib/wizard/summary';
import type { WizardState } from '../../../../_lib/wizard/types';
import type { AuctionViewModel } from '../../_hooks/useAuctionViewModel';
import type { ViewTab } from '../../_hooks/useViewTab';
import { filterPeople } from '../../_lib/people';
import { NowCard } from './NowCard';
import { KeyAmounts, PlainWordsCard } from './PlainWordsCard';
import { AttentionCard, ComingUpCard, GlossaryCard, ReadinessCard } from './StatusAside';

interface OverviewTabProps {
  auctionId: string;
  createdAt?: string;
  updatedAt?: string;
  state: WizardState;
  model: AuctionViewModel;
  views: ParticipantView[];
  peopleLoading: boolean;
  resendingIds: Set<string>;
  onResend: (views: ParticipantView[]) => void;
  onShowTab: (tab: ViewTab) => void;
}

/** The single main action for right now: chase people who haven't replied,
 *  or review the ones who sent their details. */
function NowAction({
  auctionId,
  model,
  views,
  resendingIds,
  onResend,
}: Pick<OverviewTabProps, 'auctionId' | 'model' | 'views' | 'resendingIds' | 'onResend'>) {
  const { counts } = model.people;
  if (model.stage !== 'registration') return null;

  if (counts.review > 0) {
    return (
      <Button asChild>
        <Link href={`/admin/auctions/${auctionId}/edit?step=7`}>
          <ClipboardCheck />
          Review {counts.review === 1 ? '1 person' : `${counts.review} people`}
        </Link>
      </Button>
    );
  }

  const noReply = filterPeople(views, 'no-reply');
  if (noReply.length === 0) return null;
  const busy = noReply.some((view) => resendingIds.has(view.participant.id));
  return (
    <Button onClick={() => onResend(noReply)} disabled={busy}>
      {busy ? <Loader2 className="animate-spin" /> : <Send />}
      Resend invitation to {noReply.length === 1 ? '1 person' : `${noReply.length} people`}
    </Button>
  );
}

export function OverviewTab(props: OverviewTabProps) {
  const { model, state, peopleLoading, onShowTab, createdAt, updatedAt } = props;
  const minimum = state.participation.minimumEnabled
    ? parseInt(state.participation.minimumCount, 10) || 0
    : null;
  const showPeople = model.stage !== 'draft' && model.stage !== 'cancelled';
  const attention =
    showPeople && !peopleLoading && model.people.attention.length > 0 ? (
      <AttentionCard items={model.people.attention} onSeeWho={() => onShowTab('people')} />
    ) : null;

  return (
    <div className="space-y-4">
      <NowCard
        sentence={model.overview.sentence}
        steps={model.progress}
        showProgress={model.stage !== 'cancelled'}
        action={<NowAction {...props} />}
      />

      {/* On a phone the attention items come straight after "now", not below the fold. */}
      {attention && <div className="lg:hidden">{attention}</div>}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <PlainWordsCard lines={model.facts.summary} onShowRules={() => onShowTab('rules')} />
          <KeyAmounts amounts={model.facts.amounts} />
        </div>

        <aside aria-label="Status" className="min-w-0 space-y-4">
          {attention && <div className="hidden lg:block">{attention}</div>}
          {showPeople && (
            <ReadinessCard counts={model.people.counts} minimum={minimum} loading={peopleLoading} />
          )}
          <ComingUpCard events={model.overview.comingUp} onSeeAll={() => onShowTab('steps')} />
          <GlossaryCard terms={model.facts.glossary} />
        </aside>
      </div>

      <p className="text-xs text-muted-foreground">
        Created {createdAt ? formatDateTime(createdAt) : '—'}
        {updatedAt ? ` · Last updated ${formatDateTime(updatedAt)}` : ''}
      </p>
    </div>
  );
}
