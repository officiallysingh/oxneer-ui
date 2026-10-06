'use client';

import { StepIndicator } from '@/components/common/admin/StepIndicator';

type Step = 'details' | 'mobile' | 'mobile_otp' | 'password';

const VISUAL_STEPS = ['Details', 'Mobile', 'Password'];

interface OidcStepIndicatorProps {
  current: Step;
}

/** Compact step indicator for the OIDC new-user onboarding flow. */
export function OidcStepIndicator({ current }: OidcStepIndicatorProps) {
  const visualIdx =
    current === 'mobile_otp' ? 1 : (['details', 'mobile', 'password'] as Step[]).indexOf(current);

  return <StepIndicator steps={VISUAL_STEPS} current={visualIdx + 1} connector="fixed" />;
}
