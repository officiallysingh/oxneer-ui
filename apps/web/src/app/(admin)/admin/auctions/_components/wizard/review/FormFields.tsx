'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { PropertyDef } from '@repo/api';
import { cn } from '@repo/ui';
import { resolveStr } from '@/components/common/admin/format';
import { useManagedType } from '@/hooks/useManagedType';
import { SingleField } from '@/app/(main)/auctions/_components/wizard/ParticipantCustomForm';

/** A workflow step that asks participants to fill something in. */
export interface TimelineForm {
  kind: 'bank' | 'form';
  title: string;
  /** Managed form template, loaded when the step has no embedded fields yet. */
  typeId?: string;
  /** Fields embedded in a saved step. */
  properties?: PropertyDef[];
}

const field = (
  name: string,
  label: string,
  required: boolean,
  extra: Partial<PropertyDef> = {},
): PropertyDef => ({
  type: 'SIMPLE_PROPERTY',
  name,
  label,
  dataType: 'STRING',
  required,
  ...extra,
});

/** What the participants' bank details form asks for (BankAccountDialog):
 *  the bank is filled in from the IFSC, and the cheque is optional. */
const BANK_FIELDS: PropertyDef[] = [
  field('ifscCode', 'IFSC code', true, {
    attributes: { 'html:placeholder': 'e.g. HDFC0001234', 'html:maxlength': '11' },
  }),
  field('bank', 'Bank', true, {
    attributes: {
      'form:readonly': 'true',
      'html:placeholder': 'Filled in from the IFSC',
    },
  }),
  field('accountNo', 'Account number', true, {
    attributes: { 'html:type': 'password', 'html:placeholder': '9–18 digits' },
  }),
  field('confirmAccountNo', 'Re-enter account number', true, {
    attributes: { 'html:placeholder': 'Type it again to confirm' },
  }),
  field('cancelCheck', 'Cancelled cheque', false, {
    dataType: 'FILE',
    attributes: { 'html:accept': 'image/*,application/pdf' },
  }),
];

/** Same rule the participant form uses to mark a field required. */
export function isRequiredProperty(property: PropertyDef): boolean {
  return (
    Boolean(property.required) ||
    (property.validators ?? []).some((validator) => resolveStr(validator.type) === 'NOT_NULL')
  );
}

/** The fields of a form step as chips (required ones solid and starred), with
 *  a preview of the form as participants see it. */
export function FormFields({ form, onPolicy = false }: { form: TimelineForm; onPolicy?: boolean }) {
  const embedded = form.kind === 'bank' ? BANK_FIELDS : (form.properties ?? []);
  const { managedType, loading } = useManagedType(
    form.kind === 'form' && !embedded.length ? form.typeId : null,
  );
  const fields = embedded.length ? embedded : (managedType?.properties ?? []);
  const required = fields.filter(isRequiredProperty).length;

  if (loading) {
    return (
      <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        Loading the form’s fields…
      </p>
    );
  }
  if (!fields.length) {
    return (
      <p className="mt-2.5 text-[11px] text-muted-foreground">
        {form.typeId ? 'This form has no fields yet.' : 'No form template picked yet.'}
      </p>
    );
  }

  return (
    <div className="mt-2.5 space-y-2">
      <ul className="flex flex-wrap gap-1.5" aria-label={`${form.title} fields`}>
        {fields.map((property) => {
          const isRequired = isRequiredProperty(property);
          return (
            <li
              key={property.name}
              className={cn(
                'inline-flex h-6 items-center gap-0.5 rounded-full border px-2.5 text-[11px]',
                isRequired
                  ? 'border-primary/40 bg-primary/10 font-medium text-primary'
                  : 'border-dashed border-muted-foreground/50 bg-muted/35 text-muted-foreground',
              )}
            >
              {property.label || property.name}
              {isRequired && (
                <>
                  <span aria-hidden>*</span>
                  <span className="sr-only"> (required)</span>
                </>
              )}
            </li>
          );
        })}
      </ul>
      <p
        className={cn(
          'text-[11px]',
          onPolicy ? 'text-policy-foreground/75' : 'text-muted-foreground',
        )}
      >
        {required === fields.length
          ? `All ${fields.length} fields are required.`
          : `${required} of ${fields.length} fields required (marked *).`}
      </p>
      <FormPreview fields={fields} />
    </div>
  );
}

/** The form as participants fill it in, opened in place like "Read the terms".
 *  Nothing typed here is saved. */
function FormPreview({ fields }: { fields: PropertyDef[] }) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  return (
    <details onToggle={(event) => !event.currentTarget.open && setValues({})}>
      <summary className="flex min-h-8 w-fit cursor-pointer items-center rounded-sm text-xs font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Preview the form
      </summary>
      <div className="mt-2 space-y-4 rounded-md bg-muted/45 px-3 py-3">
        <p className="text-[11px] text-muted-foreground">
          How participants see it. Nothing you type here is saved.
        </p>
        {fields.map((property) => (
          <SingleField
            key={property.name}
            prop={property}
            value={values[property.name]}
            onChange={(value) => setValues((prev) => ({ ...prev, [property.name]: value }))}
          />
        ))}
      </div>
    </details>
  );
}
