'use client';

import { useState } from 'react';
import { type AuctionWorkflowStep, type PropertyDef } from '@repo/api';
import { Button, Label } from '@repo/ui';
import { Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { resolveStr, formatLabel } from '@/components/common/admin/format';
import { buildPathWiseState } from '@/lib/pathWiseState';
import { useManagedType } from '@/hooks/useManagedType';

function resolveStepType(step: AuctionWorkflowStep): string {
  return resolveStr(step.type);
}

interface ParticipantCustomFormProps {
  step: AuctionWorkflowStep;
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
  error: string | null;
}

export function ParticipantCustomForm({
  step,
  onSubmit,
  submitting,
  error,
}: ParticipantCustomFormProps) {
  const embeddedProps: PropertyDef[] = step.embedded?.properties ?? [];
  const { managedType, loading: loadingProps } = useManagedType(
    embeddedProps.length === 0 ? step.typeId : null,
  );
  const resolvedProps = managedType?.properties ?? embeddedProps;
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const setField = (name: string, value: unknown) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = () => {
    const missing = resolvedProps.filter((p) => {
      const req =
        p.required ||
        (p.validators ?? []).some((v) => {
          const t = resolveStr(v.type as unknown);
          return t === 'NOT_NULL';
        });
      const val = values[p.name];
      return req && (val === undefined || val === '' || val === null);
    });
    if (missing.length > 0) {
      setValidationError(`Please fill in: ${missing.map((p) => p.label).join(', ')}`);
      return;
    }
    setValidationError(null);
    onSubmit({ data: buildPathWiseState(values, managedType) });
  };

  const displayError = validationError ?? error;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="font-semibold text-foreground text-sm">
          {step.name || formatLabel(resolveStepType(step))}
        </h3>
        {step.description && <p className="text-xs text-muted-foreground">{step.description}</p>}
        {resolveStepType(step) === 'PARTICIPATION_FORM_STEP' && step.manualApproval && (
          <p className="text-xs text-amber-600 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
            Your registration will be reviewed and approved manually before you can participate.
          </p>
        )}
      </div>

      {loadingProps ? (
        <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Loading form fields…
        </div>
      ) : resolvedProps.length > 0 ? (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-5 shadow-xs">
          {resolvedProps.map((prop) => (
            <SingleField
              key={prop.name}
              prop={prop}
              value={values[prop.name]}
              onChange={(v) => setField(prop.name, v)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic py-4">No form fields for this step.</p>
      )}

      {displayError && (
        <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 border border-destructive/20 p-3.5 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{displayError}</span>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="gap-2 min-w-[150px] rounded-xl text-xs font-semibold py-5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Submit &amp; Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Single field renderer ─────────────────────────────────────────────────────

interface SingleFieldProps {
  prop: PropertyDef;
  value: unknown;
  onChange: (v: unknown) => void;
}

export function SingleField({ prop, value, onChange }: SingleFieldProps) {
  const dt = resolveStr(prop.dataType as unknown);
  const isReq =
    prop.required ||
    (prop.validators ?? []).some((v) => {
      const t = resolveStr(v.type as unknown);
      return t === 'NOT_NULL';
    });
  const strVal = value !== undefined && value !== null ? String(value) : '';
  const attrs = prop.attributes ?? {};
  const options = attrs['style:options']
    ? attrs['style:options'].split(',').map((o) => {
        const [label, val] = o.trim().split(':');
        return { label: label?.trim() ?? '', value: val?.trim() ?? label?.trim() ?? '' };
      })
    : null;

  const inputBase =
    'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 transition-colors';

  let input: React.ReactNode;

  if (options) {
    input = (
      <select value={strVal} onChange={(e) => onChange(e.target.value)} className={inputBase}>
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  } else if (dt === 'BOOLEAN') {
    input = (
      <div className="flex gap-4">
        {[
          { label: 'Yes', val: 'true' },
          { label: 'No', val: 'false' },
        ].map(({ label: l, val }) => (
          <label key={val} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name={`wf-${prop.name}`}
              value={val}
              checked={strVal === val}
              onChange={() => onChange(val)}
              className="accent-primary"
            />
            {l}
          </label>
        ))}
      </div>
    );
  } else if (dt === 'LOCAL_DATE') {
    input = (
      <input
        type="date"
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        className={inputBase}
      />
    );
  } else if (dt === 'LOCAL_DATE_TIME') {
    input = (
      <input
        type="datetime-local"
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        className={inputBase}
      />
    );
  } else if (
    ['INTEGER', 'LONG', 'FLOAT', 'DOUBLE', 'BIG_DECIMAL', 'SHORT', 'BYTE', 'BIG_INTEGER'].includes(
      dt,
    )
  ) {
    input = (
      <input
        type="number"
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        placeholder={attrs['html:placeholder'] ?? `Enter ${prop.label.toLowerCase()}…`}
        min={attrs['html:min']}
        max={attrs['html:max']}
        step={
          attrs['html:step'] ??
          (dt.includes('DECIMAL') || dt === 'FLOAT' || dt === 'DOUBLE' ? 'any' : '1')
        }
        className={`${inputBase} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
      />
    );
  } else if (dt === 'FILE') {
    input = (
      <input
        type="file"
        accept={attrs['html:accept']}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => onChange(reader.result as string);
          reader.readAsDataURL(file);
        }}
        className="w-full text-sm text-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20 transition-colors"
      />
    );
  } else if (
    attrs['ui:component'] === 'textarea' ||
    (dt === 'STRING' && attrs['ui:multiline'] === 'true')
  ) {
    input = (
      <textarea
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        placeholder={attrs['html:placeholder'] ?? `Enter ${prop.label.toLowerCase()}…`}
        rows={Number(attrs['ui:rows'] ?? 3)}
        className={`${inputBase} resize-none`}
      />
    );
  } else {
    input = (
      <input
        type="text"
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        placeholder={attrs['html:placeholder'] ?? `Enter ${prop.label.toLowerCase()}…`}
        maxLength={attrs['html:maxlength'] ? Number(attrs['html:maxlength']) : undefined}
        pattern={attrs['html:pattern']}
        className={inputBase}
      />
    );
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">
        {prop.label}
        {isReq && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {input}
      {attrs['form:helper-text'] && (
        <p className="text-xs text-muted-foreground/70">{attrs['form:helper-text']}</p>
      )}
    </div>
  );
}
