'use client';

import { useState } from 'react';
import { AuctionWizardProvider, type AuctionWizardConfig } from '../_context';
import { AuctionWizard } from '../_components/wizard/AuctionWizard';
import { AUCTION_TYPE } from '../_lib/wizard/payload';
import { createInitialWizardState } from '../_lib/wizard/types';

export default function NewAuctionPage() {
  // Built once per visit so the default start time is relative to now.
  const [config] = useState<AuctionWizardConfig>(() => ({
    mode: 'create',
    auctionId: null,
    auctionType: AUCTION_TYPE,
    initialState: createInitialWizardState(),
  }));

  return (
    <AuctionWizardProvider config={config}>
      <AuctionWizard />
    </AuctionWizardProvider>
  );
}
