'use client';

import { StepIndicator } from '@/components/common/admin/StepIndicator';

const METADATA_STEPS = ['Details', 'Properties'];

/** Two-step metadata/component form wizard indicator. */
export function MetadataStepIndicator({
  current,
  onStepClick,
  editMode,
}: {
  current: 1 | 2;
  onStepClick?: (step: 1 | 2) => void;
  editMode?: boolean;
}) {
  return (
    <StepIndicator
      steps={METADATA_STEPS}
      current={current}
      onStepClick={(s) => onStepClick?.(s as 1 | 2)}
      editMode={editMode}
      connector="flex"
    />
  );
}
