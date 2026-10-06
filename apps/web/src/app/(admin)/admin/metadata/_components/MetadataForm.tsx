'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { metadataApi, PropertyDef } from '@repo/api';
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button, Input, Label } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import { parseApiError } from '@/lib/api-errors';
import { PropertyBuilder } from './PropertyBuilder';
import { PropertyFormPreview, ListingViewPreview } from './PropertyFormPreview';
import { TagInput } from '@/components/common/admin/TagInput';
import { MetadataStepIndicator } from '@/components/common/wizard/MetadataStepIndicator';
import type { KV } from './types';

export interface MetadataFormValues {
  name: string;
  description: string;
  type: string;
  properties: PropertyDef[];
  tags: string[];
}

const EMPTY: MetadataFormValues = {
  name: '',
  description: '',
  type: '',
  properties: [],
  tags: [],
};

interface MetadataFormProps {
  initialValues?: Partial<MetadataFormValues>;
  original?: MetadataFormValues;
  title: string;
  description: string;
  submitLabel: string;
  onSubmit: (values: MetadataFormValues, original?: MetadataFormValues) => Promise<void>;
  /** Where Back/Cancel/Skip and post-submit navigation should return to. */
  backHref: string;
  /** When set, the Type field is locked to this value and rendered read-only. */
  fixedType?: string;
}

// ── Validation ────────────────────────────────────────────────────────────────
const NEEDS_MIN = new Set(['MIN', 'SIZE']);
const NEEDS_MAX = new Set(['MAX', 'SIZE']);
const NEEDS_REGEX = new Set(['REGEX_PATTERN']);

function validateProperties(properties: PropertyDef[], path = 'Property'): string | null {
  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i]!;
    const label = `${path} ${i + 1}`;
    if (!prop.name?.trim()) return `${label}: name is required.`;
    if (!prop.label?.trim()) return `${label} ("${prop.name}"): label is required.`;

    // Validate extra fields on validators
    for (const v of prop.validators ?? []) {
      const t = typeof v.type === 'string' ? v.type : String(v.type ?? '');
      if (NEEDS_MIN.has(t) && (v.min === undefined || v.min === ''))
        return `${label} ("${prop.name}"): validator ${t} requires a Min value.`;
      if (NEEDS_MAX.has(t) && (v.max === undefined || v.max === ''))
        return `${label} ("${prop.name}"): validator ${t} requires a Max value.`;
      if (NEEDS_REGEX.has(t) && !v.regex?.trim())
        return `${label} ("${prop.name}"): validator REGEX_PATTERN requires a Pattern.`;
    }

    if (prop.value?.length) {
      const childError = validateProperties(prop.value, `${label} > child`);
      if (childError) return childError;
    }
    if (prop.subProperties) {
      if (!prop.subProperties.name?.trim())
        return `${label} ("${prop.name}") sub-property: name is required.`;
      if (!prop.subProperties.label?.trim())
        return `${label} ("${prop.name}") sub-property: label is required.`;
    }
  }
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function MetadataForm({
  initialValues,
  original,
  title,
  description,
  submitLabel,
  onSubmit,
  backHref,
  fixedType,
}: MetadataFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [previewTab, setPreviewTab] = useState<'build' | 'form' | 'preview'>('build');
  const [form, setForm] = useState<MetadataFormValues>({ ...EMPTY, ...initialValues });
  const [typeOptions, setTypeOptions] = useState<KV[]>([]);
  const [dataTypeOptions, setDataTypeOptions] = useState<KV[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const appliedRef = useRef(false);

  useEffect(() => {
    metadataApi
      .getManagedTypeTypes()
      .then((types) => {
        setTypeOptions(types);
        if (!fixedType) {
          setForm((prev) => ({ ...prev, type: prev.type || types[0]?.key || '' }));
        }
      })
      .catch(() => {});

    metadataApi
      .getDataTypes()
      .then(setDataTypeOptions)
      .catch(() => {})
      .finally(() => setLoadingOptions(false));
  }, [fixedType]);

  useEffect(() => {
    if (initialValues && !appliedRef.current) {
      appliedRef.current = true;
      setForm((prev) => ({ ...prev, ...initialValues }));
    }
  }, [initialValues]);

  // Keep the type locked when this form is scoped to a single managed-type type.
  useEffect(() => {
    if (fixedType)
      setForm((prev) => (prev.type === fixedType ? prev : { ...prev, type: fixedType }));
  }, [fixedType]);

  const set = <K extends keyof MetadataFormValues>(key: K, value: MetadataFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const clearErr = (f: string) =>
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[f];
      return n;
    });

  // Step 1 validation before proceeding
  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required.';
    if (!form.description.trim()) errs.description = 'Description is required.';
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (form.properties.length === 0) {
      setError('At least one property is required.');
      return;
    }
    const propError = validateProperties(form.properties);
    if (propError) {
      setError(propError);
      return;
    }
    setSaving(true);
    try {
      await onSubmit(form, original);
      router.push(backHref);
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) {
        setFieldErrors(parsed.fieldErrors);
        // If any field errors belong to step 1 fields, flag it so we can show a banner
        const step1Fields = ['name', 'description', 'type'];
        const hasStep1Errors = Object.keys(parsed.fieldErrors).some((k) => step1Fields.includes(k));
        if (hasStep1Errors) {
          setError(
            'Some errors are in the Details step. Please go back and fix them before saving.',
          );
        }
      } else {
        setError(parsed.general ?? 'Failed to save.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loadingOptions) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push(backHref)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        }
      />

      <MetadataStepIndicator current={step} onStepClick={setStep} editMode={!!original} />

      {/* ── Step 1: Details ── */}
      {step === 1 && (
        <form onSubmit={handleNext} className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Type details</h3>

            <div className="space-y-1.5">
              <Label htmlFor="mt-name" className={fieldErrors.name ? 'text-destructive' : ''}>
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="mt-name"
                value={form.name}
                onChange={(e) => {
                  set('name', e.target.value);
                  clearErr('name');
                }}
                placeholder="Mobile Phones"
                autoComplete="off"
                className={
                  fieldErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''
                }
              />
              {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="mt-desc"
                className={fieldErrors.description ? 'text-destructive' : ''}
              >
                Description <span className="text-destructive">*</span>
              </Label>
              <Input
                id="mt-desc"
                value={form.description}
                onChange={(e) => {
                  set('description', e.target.value);
                  clearErr('description');
                }}
                placeholder="Managed type for mobile phone listings"
                className={
                  fieldErrors.description ? 'border-destructive focus-visible:ring-destructive' : ''
                }
              />
              {fieldErrors.description && (
                <p className="text-xs text-destructive">{fieldErrors.description}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Type</Label>
              {fixedType ? (
                <div className="w-full rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  {typeOptions.find((t) => t.key === fixedType)?.value ?? fixedType}
                </div>
              ) : (
                <select
                  value={form.type}
                  onChange={(e) => set('type', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {typeOptions.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.value}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>
                Tags <span className="text-muted-foreground font-normal">(optional, max 5)</span>
              </Label>
              <TagInput value={form.tags} onChange={(tags) => set('tags', tags)} max={5} />
            </div>
          </div>

          {(() => {
            const hasStep1Changes =
              !original ||
              form.name !== original.name ||
              form.description !== original.description ||
              form.type !== original.type ||
              JSON.stringify(form.tags) !== JSON.stringify(original.tags);
            return (
              <div className="flex justify-between gap-3">
                <Button type="button" variant="outline" onClick={() => router.push(backHref)}>
                  Cancel
                </Button>
                {original && !hasStep1Changes ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep(2)}
                    className="gap-2"
                  >
                    Skip <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" className="gap-2">
                    Continue <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })()}
        </form>
      )}

      {/* ── Step 2: Properties ── */}
      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Top error banner — always visible, especially for step-1 field errors */}
          {(error || Object.keys(fieldErrors).length > 0) && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 space-y-2">
              {error && <p className="text-sm font-medium text-destructive">{error}</p>}
              {Object.entries(fieldErrors).map(([field, msg]) => (
                <p key={field} className="text-sm text-destructive">
                  <span className="font-medium capitalize">{field}</span>: {msg}
                </p>
              ))}
              {/* If any errors are from step 1 fields, offer a quick way back */}
              {Object.keys(fieldErrors).some((k) =>
                ['name', 'description', 'type'].includes(k),
              ) && (
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError(null);
                  }}
                  className="text-sm text-destructive underline underline-offset-2 hover:text-destructive/80 font-medium"
                >
                  ← Go back to Details to fix
                </button>
              )}
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Properties</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {form.name} · {form.type}
                </span>
                <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
                  {(
                    [
                      { key: 'build', label: 'Build' },
                      { key: 'form', label: 'Form preview' },
                      { key: 'preview', label: 'Listing preview' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setPreviewTab(tab.key)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        previewTab === tab.key
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {previewTab === 'build' ? (
              <PropertyBuilder
                properties={form.properties}
                onChange={(properties) => set('properties', properties)}
                dataTypes={dataTypeOptions}
              />
            ) : previewTab === 'form' ? (
              <PropertyFormPreview key="form" properties={form.properties} />
            ) : (
              <ListingViewPreview
                key="preview"
                properties={form.properties}
                title={form.name || undefined}
              />
            )}
          </div>

          {(() => {
            const hasStep2Changes =
              !original || JSON.stringify(form.properties) !== JSON.stringify(original.properties);
            return (
              <div className="flex justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={saving}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                {original && !hasStep2Changes ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.push(backHref)}
                    disabled={saving}
                    className="gap-2"
                  >
                    Skip <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={saving} className="gap-2">
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      submitLabel
                    )}
                  </Button>
                )}
              </div>
            );
          })()}
        </form>
      )}
    </div>
  );
}
