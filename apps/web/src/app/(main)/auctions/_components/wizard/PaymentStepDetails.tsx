'use client';

import { AuctionWorkflowStep } from '@repo/api';
import { Button } from '@repo/ui';
import { CreditCard, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { resolveStr, formatLabel } from '@/components/common/admin/format';

interface PaymentStepDetailsProps {
  step: AuctionWorkflowStep;
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
  error: string | null;
}

export function PaymentStepDetails({ step, onSubmit, submitting, error }: PaymentStepDetailsProps) {
  const heads = step.heads ?? step.policy?.heads ?? [];
  const mode = resolveStr(step.mode);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 p-4 bg-muted/30 border border-border/60 rounded-2xl">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
          <CreditCard className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-sm">{step.name || 'Payment Details'}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {step.description ||
              'Complete the payment below. After payment is processed, this step will be marked as completed.'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-xs">
        {mode && (
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground font-medium">Payment Mode</span>
            <span className="font-bold text-foreground bg-muted/50 px-2.5 py-1 rounded-lg">
              {formatLabel(mode)}
            </span>
          </div>
        )}
        {heads.map((h, i) => (
          <div
            key={i}
            className="flex items-center justify-between text-xs sm:text-sm border-t border-border/50 pt-3"
          >
            <span className="text-muted-foreground flex items-center gap-2 font-medium">
              {h.name || `Head ${i + 1}`}
              {h.refundable && (
                <span className="text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 px-2 py-0.5 border border-emerald-500/30">
                  Refundable
                </span>
              )}
            </span>
            <span className="font-extrabold text-foreground tracking-tight">
              {h.basis === 'PERCENTAGE_BASED'
                ? `${h.value}%`
                : `₹${(h.value ?? 0).toLocaleString()}`}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed bg-muted/20 p-3.5 rounded-xl border border-border/40">
        Payment processing is handled securely. Once your payment is confirmed, click below to
        acknowledge and proceed to the next step.
      </p>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 border border-destructive/20 p-3.5 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button
          onClick={() => onSubmit({ acknowledged: true })}
          disabled={submitting}
          className="gap-2 min-w-[150px] rounded-xl text-xs font-semibold py-5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Acknowledge & Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
