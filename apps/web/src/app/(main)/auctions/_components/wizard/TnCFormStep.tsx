'use client';

import { useState } from 'react';
import { AuctionWorkflowStep } from '@repo/api';
import { Button } from '@repo/ui';
import { Loader2, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface TnCFormStepProps {
  step: AuctionWorkflowStep;
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
  error: string | null;
}

export function TnCFormStep({ step, onSubmit, submitting, error }: TnCFormStepProps) {
  const [accepted, setAccepted] = useState(false);
  const html = step.tncText ?? '';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 p-4 bg-muted/30 border border-border/60 rounded-2xl">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-sm">{step.name || 'Terms & Conditions'}</h3>
          {step.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
          )}
        </div>
      </div>

      {html ? (
        <div className="rounded-2xl border border-border bg-card max-h-72 overflow-y-auto shadow-xs">
          <div
            className="prose prose-sm dark:prose-invert max-w-none p-5
              [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 text-xs sm:text-sm text-foreground/90"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic p-4 bg-muted/20 rounded-xl">
          No terms text provided for this step.
        </p>
      )}

      <label className="flex items-start gap-3 cursor-pointer select-none group p-3 bg-muted/20 hover:bg-muted/40 rounded-xl border border-border/50 transition-colors">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded accent-primary cursor-pointer"
        />
        <span className="text-xs sm:text-sm font-medium text-foreground group-hover:text-foreground/90">
          I have read, understood, and agree to the terms and conditions above.
        </span>
      </label>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 border border-destructive/20 p-3.5 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button
          onClick={() => onSubmit({ accepted: true })}
          disabled={!accepted || submitting}
          className="gap-2 min-w-[150px] rounded-xl text-xs font-semibold py-5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Accept & Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
