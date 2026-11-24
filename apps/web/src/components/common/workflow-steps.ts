import type {
  AuctionWorkflowStep,
  ParticipantVM,
  ParticipantWorkflowStepStatus,
} from '@oxneer/api';
import { formatLabel, resolveStr } from '@/components/common/admin/format';

/** Human labels for the workflow step types an auction can ask participants to complete. */
export const WORKFLOW_TYPE_LABEL: Record<string, string> = {
  TNC_FORM_STEP: 'Terms and conditions',
  PARTICIPATION_FORM_STEP: 'Participation form',
  BANK_DETAIL_FORM_STEP: 'Bank details',
  PAYMENT_STEP: 'Payment',
  FORM_STEP: 'Custom form',
};

/** The readable name of a step type, e.g. "Bank details" for BANK_DETAIL_FORM_STEP. */
export function stepTypeLabel(type: unknown): string {
  const key = resolveStr(type);
  if (!key) return 'Step';
  return WORKFLOW_TYPE_LABEL[key] ?? formatLabel(key);
}

/** The name the organiser gave a step, or its type's label when it has none. */
export function stepTitle(step: AuctionWorkflowStep): string {
  return step.name || stepTypeLabel(step.type);
}

/** A participant's step status as the backend sends it (`engagement.Status.Type`):
 *  NA, PENDING (not done yet), SKIPPED or COMPLETED. */
const STATUS_LABEL: Record<string, string> = {
  NA: 'Not needed',
  PENDING: 'To do',
  SKIPPED: 'Skipped',
  COMPLETED: 'Done',
};

export function isStatusDone(status: ParticipantWorkflowStepStatus | undefined): boolean {
  return resolveStr(status?.type) === 'COMPLETED';
}

export function statusLabel(status: ParticipantWorkflowStepStatus | undefined): string {
  const key = resolveStr(status?.type);
  return STATUS_LABEL[key] ?? (key ? formatLabel(key) : 'To do');
}

export function isStepCompleted(
  step: AuctionWorkflowStep,
  participant: ParticipantVM | null,
): boolean {
  if (!step.id) return false;
  return isStatusDone(participant?.workflowStatus?.[step.id]);
}
