'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useAuctionWizard } from '../../../_context';
import { WIZARD_STEPS } from '../../../_lib/wizard/steps';
import { PublishStatusCard } from './PublishStatusCard';
import { WizardHeader } from './WizardHeader';
import { WizardStepRail } from './WizardStepRail';
import { WizardSummary } from './WizardSummary';

/** Page frame for the simple-auction wizard: header, step rail, publish status,
 *  summary and the current step body. */
export function AuctionWizardShell({ children }: { children: ReactNode }) {
  const { step, state, isPrivate } = useAuctionWizard();
  const rootRef = useRef<HTMLDivElement>(null);
  const meta = WIZARD_STEPS.find((item) => item.id === step) ?? WIZARD_STEPS[0]!;
  const lead = meta.lead({ forward: state.basics.direction === 'FORWARD', isPrivate });

  // The wizard lives inside the admin content scroller, so reset that (not the
  // window) whenever the visible step changes.
  useEffect(() => {
    rootRef.current?.closest('.overflow-y-auto')?.scrollTo({ top: 0 });
  }, [step]);

  return (
    <div ref={rootRef} className="space-y-5">
      <WizardHeader />

      <div className="grid gap-5 lg:grid-cols-[248px_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-3 lg:sticky lg:top-4">
          <WizardStepRail />
          {/* On small screens the step body comes straight after the rail; the
              status and summary would push it out of view. */}
          <div className="hidden space-y-3 lg:block">
            <PublishStatusCard />
            <WizardSummary />
          </div>
        </aside>

        <section aria-labelledby="wizard-step-title" className="min-w-0 space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Step {meta.id} of {WIZARD_STEPS.length}
            </p>
            <h2
              id="wizard-step-title"
              className="mt-0.5 font-display text-xl font-semibold text-foreground"
            >
              {meta.label}
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">{lead}</p>
          </div>
          {children}
        </section>
      </div>
    </div>
  );
}
