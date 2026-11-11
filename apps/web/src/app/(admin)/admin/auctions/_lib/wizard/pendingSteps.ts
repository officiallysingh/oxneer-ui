import type { AddWorkflowStepRQ, AuctionWorkflowStep, WorkflowStepPhase } from '@repo/api';

/** A workflow step the admin has added but that isn't saved yet. Participation
 *  and Award are each saved whole, policies and steps together, by
 *  `POST /{id}/pre-auction-rules` and `POST /{id}/post-auction-rules`. Until
 *  that call is made, a phase's steps live here and the step editor works on
 *  them as if they were saved. */
export interface PendingStep extends AuctionWorkflowStep {
  /** "pending-…", never a server id. */
  id: string;
  /** The request the setup call sends; its `order` is the step's place in its phase. */
  request: AddWorkflowStepRQ;
}

export type PendingSteps = Record<WorkflowStepPhase, PendingStep[]>;

export const EMPTY_PENDING_STEPS: PendingSteps = { PRE_AUCTION: [], POST_AUCTION: [] };

export function isPendingStep(step: AuctionWorkflowStep): step is PendingStep {
  return step.id.startsWith('pending-') && 'request' in step;
}

let sequence = 0;

/** The step as the editor and lists see it. Terms and the participation form
 *  carry no phase in their request (the API puts them before the auction), so
 *  the phase is shown here only. */
export function pendingStep(
  request: AddWorkflowStepRQ,
  phase: WorkflowStepPhase,
  id = `pending-${++sequence}`,
): PendingStep {
  return {
    ...request,
    id,
    phase,
    implicit: 'implicit' in request ? request.implicit : false,
    request,
  };
}

/** Numbers a phase's steps 1..n in list order, on the step and its request. */
export function renumber(steps: PendingStep[]): PendingStep[] {
  return steps.map((step, index) => ({
    ...step,
    order: index + 1,
    request: { ...step.request, order: index + 1 },
  }));
}

/** The requests a setup call sends, ordered 1..n. */
export function pendingRequests(steps: PendingStep[]): AddWorkflowStepRQ[] {
  return renumber(steps).map((step) => step.request);
}
