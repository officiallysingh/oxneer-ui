'use client';

/**
 * WorkflowWizard — guides a logged-in participant through their pre-auction
 * workflow steps one at a time.
 *
 * Step forms are composed from sub-components in ./wizard/:
 *   TnCFormStep              — T&C acceptance
 *   BankDetailFormStep       — bank account selection / creation
 *   PaymentStepDetails       — payment acknowledgement
 *   ParticipantCustomForm    — dynamic form (FORM_STEP / PARTICIPATION_FORM_STEP)
 *   StepSidebar              — left-hand step progress nav
 */

import { useCallback, useEffect, useState } from 'react';
import {
  auctionsApi,
  participantsApi,
  type AuctionWorkflowStep,
  type ParticipantVM,
} from '@repo/api';
import { Button } from '@repo/ui';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { resolveStr, formatLabel } from '@/components/common/admin/format';
import { parseApiError } from '@/lib/api-errors';
import { TnCFormStep } from './wizard/TnCFormStep';
import { BankDetailFormStep } from './wizard/BankDetailFormStep';
import { PaymentStepDetails } from './wizard/PaymentStepDetails';
import { ParticipantCustomForm } from './wizard/ParticipantCustomForm';
import { StepSidebar } from './wizard/StepSidebar';

// ── Icon map for step types ──────────────────────────────────────────────────

import { CreditCard, Landmark, ShieldCheck, UserCheck, FileText } from 'lucide-react';

const STEP_ICON_MAP: Record<string, React.ElementType> = {
  TNC_FORM_STEP: ShieldCheck,
  BANK_DETAIL_FORM_STEP: Landmark,
  PARTICIPATION_FORM_STEP: UserCheck,
  FORM_STEP: FileText,
  PAYMENT_STEP: CreditCard,
};

function resolveStepType(step: AuctionWorkflowStep): string {
  return resolveStr(step.type);
}

function stepIsCompleted(step: AuctionWorkflowStep, participant: ParticipantVM | null): boolean {
  if (!participant?.workflowStatus) return false;
  const entry = participant.workflowStatus[step.id];
  if (!entry) return false;
  const t = resolveStr(entry.type);
  return t === 'COMPLETED' || t === 'DONE' || t === 'APPROVED';
}

function StepIcon({ type, className }: { type: string; className?: string }) {
  const Icon = STEP_ICON_MAP[type] ?? FileText;
  return <Icon className={className} />;
}

const generateMongoId = (): string => {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 24);
};

// ── Main Wizard Component ─────────────────────────────────────────────────────

export interface WorkflowWizardProps {
  auctionId: string;
  /** Called when all steps are done or user dismisses. */
  onClose: () => void;
}

export function WorkflowWizard({ auctionId, onClose }: WorkflowWizardProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [steps, setSteps] = useState<AuctionWorkflowStep[]>([]);
  const [participant, setParticipant] = useState<ParticipantVM | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [allDone, setAllDone] = useState(false);

  // Load workflow + participant on mount
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      auctionsApi.getAuctionWorkflow(auctionId),
      participantsApi.getSelfParticipant(auctionId).catch(() => null),
    ])
      .then(([wf, p]) => {
        if (cancelled) return;
        // Only PRE_AUCTION steps (TNC / BANK / PARTICIPATION are always pre)
        const preSteps = wf.filter((s) => {
          const phase = resolveStr(s.phase);
          const type = resolveStepType(s);
          const alwaysPre = [
            'TNC_FORM_STEP',
            'BANK_DETAIL_FORM_STEP',
            'PARTICIPATION_FORM_STEP',
          ].includes(type);
          return alwaysPre || phase === 'PRE_AUCTION' || !phase;
        });
        const sorted = [...preSteps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setSteps(sorted);
        setParticipant(p);

        const firstIncomplete = sorted.findIndex((s) => !stepIsCompleted(s, p));
        if (firstIncomplete === -1) {
          setAllDone(true);
        } else {
          setCurrentIndex(firstIncomplete);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError('Failed to load workflow. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [auctionId]);

  const currentStep = steps[currentIndex];

  const handleStepSubmit = useCallback(
    async (formData: Record<string, unknown>) => {
      if (!currentStep) return;
      setSubmitting(true);
      setStepError(null);

      const type = resolveStepType(currentStep);

      const rq: import('@repo/api').ParticipantWorkflowStepRQ = {
        id: currentStep.id,
        type,
      };

      if (type === 'BANK_DETAIL_FORM_STEP') {
        rq.bankDetailId = formData.bankDetailId as string;
      } else if (type === 'FORM_STEP' || type === 'PARTICIPATION_FORM_STEP') {
        const typeId =
          typeof currentStep.typeId === 'object'
            ? Object.keys(currentStep.typeId)[0]
            : (currentStep.typeId ?? '');
        rq.embedded = {
          typeId,
          pathWiseState: (formData.data as Record<string, unknown>) ?? formData,
        };
      } else {
        // rq.data = {
        //   ...((formData.data as Record<string, unknown>) ?? formData),
        //   paymentOrderId: generateMongoId(),
        // };
        rq.paymentOrderId = generateMongoId();
      }

      const isAlreadySubmitted = stepIsCompleted(currentStep, participant);

      try {
        if (isAlreadySubmitted) {
          await participantsApi.updateWorkflowStep(auctionId, rq);
        } else {
          await participantsApi.completeWorkflowStep(auctionId, rq);
        }

        const updated = await participantsApi
          .getSelfParticipant(auctionId)
          .catch(() => participant);
        setParticipant(updated);

        const nextIncomplete = steps.findIndex(
          (s, i) => i > currentIndex && !stepIsCompleted(s, updated),
        );
        if (nextIncomplete === -1) {
          setAllDone(true);
        } else {
          setCurrentIndex(nextIncomplete);
          setStepError(null);
        }
      } catch (err) {
        const parsed = parseApiError(err);
        setStepError(parsed.general ?? 'Failed to submit step. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [auctionId, currentIndex, currentStep, participant, steps],
  );

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Loading your workflow…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <AlertCircle className="h-10 w-10 text-destructive/60" />
        <p className="text-sm text-muted-foreground">{loadError}</p>
        <Button variant="outline" onClick={onClose} className="rounded-xl">
          Close
        </Button>
      </div>
    );
  }

  // ── All done ───────────────────────────────────────────────────────────────
  if (allDone || steps.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 py-12 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">All steps completed!</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {steps.length === 0
              ? 'No pre-auction steps are required for this auction.'
              : 'You have completed all required pre-auction steps. You are now eligible to participate.'}
          </p>
        </div>
        <Button onClick={onClose} className="mt-2 rounded-xl">
          Done
        </Button>
      </div>
    );
  }

  // ── Main wizard UI ─────────────────────────────────────────────────────────
  const type = currentStep ? resolveStepType(currentStep) : '';

  return (
    <div className="flex flex-col md:flex-row gap-0 min-h-0 overflow-hidden">
      {/* Sidebar — step progress list */}
      <div className="md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-border bg-muted/20 p-4">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">
          Steps
        </p>
        <StepSidebar steps={steps} currentIndex={currentIndex} participant={participant} />
      </div>

      {/* Main content area */}
      <div className="flex-1 min-w-0 p-6 overflow-y-auto">
        {/* Step progress bar */}
        <div className="flex items-center gap-2.5 mb-6">
          <StepIcon type={type} className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground font-medium">
            Step {currentIndex + 1} of {steps.length}
          </p>
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step form components */}
        {currentStep && type === 'TNC_FORM_STEP' && (
          <TnCFormStep
            step={currentStep}
            onSubmit={handleStepSubmit}
            submitting={submitting}
            error={stepError}
          />
        )}
        {currentStep && type === 'BANK_DETAIL_FORM_STEP' && (
          <BankDetailFormStep
            step={currentStep}
            onSubmit={handleStepSubmit}
            submitting={submitting}
            error={stepError}
          />
        )}
        {currentStep && (type === 'FORM_STEP' || type === 'PARTICIPATION_FORM_STEP') && (
          <ParticipantCustomForm
            step={currentStep}
            onSubmit={handleStepSubmit}
            submitting={submitting}
            error={stepError}
          />
        )}
        {currentStep && type === 'PAYMENT_STEP' && (
          <PaymentStepDetails
            step={currentStep}
            onSubmit={handleStepSubmit}
            submitting={submitting}
            error={stepError}
          />
        )}

        {/* Generic / unknown step type fallback */}
        {currentStep &&
          ![
            'TNC_FORM_STEP',
            'BANK_DETAIL_FORM_STEP',
            'FORM_STEP',
            'PARTICIPATION_FORM_STEP',
            'PAYMENT_STEP',
          ].includes(type) &&
          (currentStep.embedded?.properties?.length ?? 0) > 0 && (
            <ParticipantCustomForm
              step={currentStep}
              onSubmit={handleStepSubmit}
              submitting={submitting}
              error={stepError}
            />
          )}
        {currentStep &&
          ![
            'TNC_FORM_STEP',
            'BANK_DETAIL_FORM_STEP',
            'FORM_STEP',
            'PARTICIPATION_FORM_STEP',
            'PAYMENT_STEP',
          ].includes(type) &&
          (currentStep.embedded?.properties?.length ?? 0) === 0 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground text-sm">
                  {currentStep.name || formatLabel(type)}
                </h3>
              </div>
              {stepError && (
                <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 border border-destructive/20 p-3.5 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{stepError}</span>
                </div>
              )}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => handleStepSubmit({})}
                  disabled={submitting}
                  className="gap-2 min-w-[140px] rounded-xl text-xs font-semibold py-5"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
