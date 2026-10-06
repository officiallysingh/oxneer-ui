'use client';

import { StepIndicator } from '@/components/common/admin/StepIndicator';

const LISTING_STEPS = ['Details', 'Media', 'Custom Properties'];

/** Listing-wizard step indicator — flex connectors for wider layouts. */
export function ListingStepIndicator({
  current,
  onStepClick,
  editMode,
}: {
  current: 1 | 2 | 3;
  onStepClick?: (step: 1 | 2 | 3) => void;
  editMode?: boolean;
}) {
  return (
    <StepIndicator
      steps={LISTING_STEPS}
      current={current}
      onStepClick={(s) => onStepClick?.(s as 1 | 2 | 3)}
      editMode={editMode}
      connector="flex"
    />
  );
}
