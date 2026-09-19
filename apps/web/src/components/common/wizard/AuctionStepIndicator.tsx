'use client';

import { StepIndicator } from '@/components/common/admin/StepIndicator';

const AUCTION_STEPS = ['Details', 'Units', 'Policies', 'Workflow', 'Schedule', 'Invitations'];
const OPTIONAL_STEPS = [6];

/** Auction-wizard step indicator. Invitations (step 6) is optional. */
export function AuctionStepIndicator({
  current,
  onStepClick,
  editMode,
}: {
  current: number;
  onStepClick?: (step: number) => void;
  editMode?: boolean;
}) {
  return (
    <StepIndicator
      steps={AUCTION_STEPS}
      current={current}
      onStepClick={onStepClick}
      editMode={editMode}
      optionalSteps={OPTIONAL_STEPS}
    />
  );
}
