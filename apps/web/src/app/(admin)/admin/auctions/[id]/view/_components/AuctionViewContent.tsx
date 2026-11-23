'use client';

import { Tabs, TabsContent } from '@oxneer/ui';
import type { AuctionViewController, AuctionViewData } from '../_hooks/useAuctionView';
import { useAuctionViewActions } from '../_hooks/useAuctionViewActions';
import { useAuctionViewModel } from '../_hooks/useAuctionViewModel';
import { useNow } from '../../../_hooks/useNow';
import { useViewTab } from '../_hooks/useViewTab';
import { formatDateTime } from '../../../_lib/wizard/summary';
import { AuctionViewDialogs } from './AuctionViewDialogs';
import { AuctionViewHeader } from './AuctionViewHeader';
import { AuctionViewTabs } from './AuctionViewTabs';
import { ItemTab } from './ItemTab';
import { OverviewTab } from './overview/OverviewTab';
import { PeopleTab } from './people/PeopleTab';
import { RulesTab } from './RulesTab';
import { StepsTab } from './StepsTab';

interface AuctionViewContentProps {
  data: AuctionViewData;
  participants: AuctionViewController['participants'];
  reload: () => void;
}

/** The loaded view: header, tabs and the confirm dialogs. */
export function AuctionViewContent({ data, participants, reload }: AuctionViewContentProps) {
  const { auction, state, preSteps } = data;
  const now = useNow();
  const model = useAuctionViewModel(data, participants, now);
  const actions = useAuctionViewActions(auction.id, reload);
  const { tab, setTab } = useViewTab();

  const peopleLoading = participants.loading && participants.views.length === 0;
  const deadline = model.registrationEnds ?? model.times.start;
  const canChase = model.stage === 'registration' || model.stage === 'draft';

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4 pb-12">
      <AuctionViewHeader
        auction={auction}
        stage={model.stage}
        chips={model.facts.chips}
        countdown={model.countdown}
        onCopyId={actions.copyId}
        onCancel={actions.requestCancel}
        onDelete={actions.requestDelete}
        tabs={
          <AuctionViewTabs
            active={tab}
            ruleCount={model.rules.length}
            stepCount={model.steps.count}
            peopleCount={participants.counts.all}
          />
        }
      />

      <TabsContent value="overview" className="mt-0">
        <OverviewTab
          auctionId={auction.id}
          createdAt={auction.createdAt}
          updatedAt={auction.updatedAt}
          state={state}
          model={model}
          views={participants.views}
          peopleLoading={peopleLoading}
          resendingIds={actions.resendingIds}
          onResend={actions.resendInvitations}
          onShowTab={setTab}
        />
      </TabsContent>

      <TabsContent value="item" className="mt-0">
        <ItemTab state={state} amounts={model.facts.amounts} />
      </TabsContent>

      <TabsContent value="rules" className="mt-0">
        <RulesTab cards={model.rules} locked={model.stage !== 'draft'} />
      </TabsContent>

      <TabsContent value="steps" className="mt-0">
        <StepsTab published={model.steps.published} sections={model.steps.sections} />
      </TabsContent>

      <TabsContent value="people" className="mt-0">
        <PeopleTab
          auctionId={auction.id}
          isPrivate={state.basics.accessibility === 'PRIVATE'}
          showAlias={state.offer.participantVisibility === 'ALIAS'}
          canChase={canChase}
          deadlineText={preSteps.length && deadline ? formatDateTime(deadline.toISOString()) : null}
          preSteps={preSteps}
          views={participants.views}
          counts={model.people.counts}
          funnel={model.people.funnel}
          loading={peopleLoading}
          error={participants.error}
          onRetry={participants.refresh}
          resendingIds={actions.resendingIds}
          onResend={actions.resendInvitations}
        />
      </TabsContent>

      <AuctionViewDialogs title={auction.title} actions={actions} />
    </Tabs>
  );
}
