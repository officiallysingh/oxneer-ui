'use client';

import { useState } from 'react';
import { Plus, RotateCcw, Trash2, CheckCircle2, XCircle, Star, Upload } from 'lucide-react';
import { Button, Label, DatePicker, TimePicker, DateTimePicker, YearPicker } from '@repo/ui';
import type { PropertyDef } from '@repo/api';
import { resolveAttrs } from './attribute-protocol';
import { CoordinatesMapField } from '@/components/common/admin/CoordinatesMapField';
import { AddressField } from '@/components/common/admin/AddressField';

interface PropertyFormPreviewProps {
  properties: PropertyDef[];
  initialValues?: Record<string, unknown>;
  disabled?: boolean;
}

// ── Dummy value generation ────────────────────────────────────────────────────

function resolveMT(dataType: unknown): string {
  if (typeof dataType === 'string') return dataType;
  if (typeof dataType === 'object' && dataType !== null)
    return Object.keys(dataType as Record<string, unknown>)[0] ?? '';
  return '';
}

function dummyScalar(prop: PropertyDef): string {
  const attrs = prop.attributes ?? {};
  const optionsRaw = attrs['style:options'];
  if (optionsRaw) {
    const first = optionsRaw.split(',')[0]?.trim() ?? '';
    const parts = first.split(':');
    return parts[1]?.trim() ?? parts[0]?.trim() ?? '';
  }
  const colorRaw = attrs['style:color-options'];
  if (colorRaw) return colorRaw.split(',')[0]?.trim() ?? '';

  const mt = resolveMT(prop.dataType);
  switch (mt) {
    case 'BYTE':
    case 'SHORT':
    case 'INTEGER':
      return '42';
    case 'LONG':
    case 'BIG_INTEGER':
      return '1000';
    case 'FLOAT':
    case 'DOUBLE':
    case 'BIG_DECIMAL':
      return '3.14';
    case 'BOOLEAN':
      return 'true';
    case 'LOCAL_DATE':
      return '2024-06-15';
    case 'LOCAL_TIME':
      return '09:30';
    case 'LOCAL_DATE_TIME':
    case 'ZONED_DATE_TIME':
    case 'INSTANT':
      return '2024-06-15T09:30';
    case 'YEAR':
      return '2024';
    case 'YEAR_MONTH':
      return '2024-06';
    case 'MONTH':
      return 'JUNE';
    case 'DAY_OF_WEEK':
      return 'MONDAY';
    default:
      return prop.label ? `Sample ${prop.label.toLowerCase()}` : 'Sample text';
  }
}

function dummyValue(prop: PropertyDef): unknown {
  if (prop.type === 'COMPOSITE_PROPERTY') {
    const obj: Record<string, unknown> = {};
    for (const child of prop.value ?? []) obj[child.name] = dummyValue(child);
    return obj;
  }
  if (prop.type === 'LIST_PROPERTY' || prop.type === 'SET_PROPERTY') {
    const children = prop.value ?? [];
    if (children.length === 0) return [];
    const item: Record<string, unknown> = {};
    for (const child of children) item[child.name] = dummyValue(child);
    return [item];
  }
  // Spatial types are stored as structured objects, not strings
  const mt = resolveMT(prop.dataType);
  if (mt === 'COORDINATES') return { latitude: 28.6139, longitude: 77.209 };
  if (mt === 'ADDRESS') {
    return {
      country: 'India',
      pincode: '110001',
      area: 'Connaught Place',
      city: 'New Delhi',
      state: 'Delhi',
      addressLine1: 'Sample Building',
      addressLine2: 'Sample Street',
      landmark: 'Near Sample Mall',
      coordinates: { latitude: 28.6139, longitude: 77.209 },
    };
  }
  return dummyScalar(prop);
}

export function generateDummyValues(properties: PropertyDef[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const p of properties) out[p.name] = dummyValue(p);
  return out;
}

export function PropertyFormPreview({
  properties,
  initialValues,
  disabled,
}: PropertyFormPreviewProps) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues ?? {});

  if (properties.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Add properties in the Build tab to see the form preview here.
      </div>
    );
  }

  const setField = (name: string, value: unknown) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  return (
    <div className="space-y-4">
      {!disabled && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Interactive preview — fill in fields to test rendering
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setValues({})}
            className="h-7 gap-1.5 text-xs"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        </div>
      )}

      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-5">
        {properties.map((prop) => (
          <PreviewFieldGroup
            key={prop.name}
            prop={prop}
            value={values[prop.name]}
            onChange={(v) => setField(prop.name, v)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function resolveDataType(dataType: unknown): string {
  if (typeof dataType === 'string') return dataType;
  if (typeof dataType === 'object' && dataType !== null)
    return Object.keys(dataType as Record<string, unknown>)[0] ?? '';
  return '';
}

function isRequired(prop: PropertyDef): boolean {
  return (prop.validators ?? []).some((v) => {
    const t = v.type as unknown;
    if (typeof t === 'string') return t === 'NOT_NULL';
    if (typeof t === 'object' && t !== null) return 'NOT_NULL' in (t as object);
    return false;
  });
}

const FORM_SIZE_CLASSES: Record<string, string> = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-2.5 text-base',
  xl: 'px-5 py-3 text-lg',
};
const FORM_VARIANT_CLASSES: Record<string, string> = {
  default: 'border border-input bg-background',
  outline: 'border border-input bg-background',
  ghost: 'border-transparent bg-transparent',
  filled: 'border-transparent bg-muted',
  underline: 'border-0 border-b border-input rounded-none px-0',
};

function baseClass(formAttrs?: Record<string, string>): string {
  const size = formAttrs?.['form:size'] ?? 'md';
  const variant = formAttrs?.['form:variant'] ?? 'default';
  const width = formAttrs?.['form:width'] ?? 'full';
  const s = FORM_SIZE_CLASSES[size] ?? FORM_SIZE_CLASSES['md']!;
  const v = FORM_VARIANT_CLASSES[variant] ?? FORM_VARIANT_CLASSES['default']!;
  const w = width === 'auto' ? '' : width === 'fixed' ? 'w-48' : 'w-full';
  return `${w} rounded-md ${v} ${s} focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60`;
}

// ─── PreviewFieldGroup ────────────────────────────────────────────────────────

interface FieldGroupProps {
  prop: PropertyDef;
  value: unknown;
  onChange: (value: unknown) => void;
  depth?: number;
  disabled?: boolean;
}

function PreviewFieldGroup({ prop, value, onChange, depth = 0, disabled }: FieldGroupProps) {
  const indent = depth > 0 ? 'ml-4 pl-3 border-l border-border' : '';
  const required = isRequired(prop);

  if (prop.type === 'COMPOSITE_PROPERTY') {
    const children = prop.value ?? [];
    const obj =
      typeof value === 'object' && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
    return (
      <div className={`rounded-lg border border-border overflow-hidden ${indent}`}>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
          <span className="text-xs font-semibold text-foreground tracking-wide">{prop.label}</span>
          {required && <span className="text-destructive text-xs">*</span>}
        </div>
        {children.length === 0 ? (
          <p className="px-4 py-3 text-xs text-muted-foreground">No child properties defined.</p>
        ) : (
          <div className="px-4 py-4 space-y-4 bg-background/60">
            {children.map((child: PropertyDef) => (
              <PreviewFieldGroup
                key={child.name}
                prop={child}
                value={obj[child.name]}
                onChange={(v) => onChange({ ...obj, [child.name]: v })}
                depth={depth + 1}
                disabled={disabled}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (prop.type === 'LIST_PROPERTY' || prop.type === 'SET_PROPERTY') {
    return (
      <PreviewListField
        prop={prop}
        value={value}
        onChange={onChange}
        indent={indent}
        required={required}
        depth={depth}
        disabled={disabled}
      />
    );
  }

  const formAttrs = resolveAttrs(prop.attributes, 'form', prop.type as never);
  const layout = formAttrs['form:layout'] ?? 'vertical';
  const labelPos = formAttrs['form:label.position'] ?? 'top';
  const width = formAttrs['form:width'] ?? 'full';
  const helperText = formAttrs['form:helper-text'];
  const widthCls = width === 'auto' ? '' : width === 'fixed' ? 'w-48' : 'w-full';

  const labelEl = (
    <Label className="text-sm font-medium">
      {prop.label}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </Label>
  );

  const inputEl = (
    <>
      <PreviewScalarField
        prop={prop}
        value={value}
        onChange={onChange}
        formAttrs={formAttrs}
        disabled={disabled}
      />
      {helperText && <p className="text-xs text-muted-foreground/70 mt-0.5">{helperText}</p>}
    </>
  );

  if (labelPos === 'hidden') return <div className={widthCls}>{inputEl}</div>;

  if (layout === 'horizontal') {
    return (
      <div className={`flex items-start gap-3 ${widthCls}`}>
        <div className="shrink-0 pt-1">{labelEl}</div>
        <div className="flex-1 min-w-0">{inputEl}</div>
      </div>
    );
  }

  if (layout === 'inline') {
    return (
      <div className={`flex items-center gap-3 ${widthCls}`}>
        {labelEl}
        <div className="flex-1">{inputEl}</div>
      </div>
    );
  }

  return (
    <div className={`space-y-1.5 ${widthCls}`}>
      {labelEl}
      {inputEl}
    </div>
  );
}

// ─── PreviewListField ─────────────────────────────────────────────────────────

function PreviewListField({
  prop,
  value,
  onChange,
  indent,
  required,
  depth,
  disabled,
}: {
  prop: PropertyDef;
  value: unknown;
  onChange: (value: unknown) => void;
  indent: string;
  required: boolean;
  depth: number;
  disabled?: boolean;
}) {
  const children = prop.value ?? [];
  const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];

  const addItem = () => {
    const empty: Record<string, unknown> = {};
    children.forEach((c: PropertyDef) => {
      empty[c.name] = '';
    });
    onChange([...items, empty]);
  };

  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  const updateItem = (idx: number, key: string, v: unknown) =>
    onChange(items.map((item, i) => (i === idx ? { ...item, [key]: v } : item)));

  return (
    <div className={`space-y-2 ${indent}`}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {prop.label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {!disabled && (
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
          >
            <Plus className="h-3 w-3" />
            Add item
          </button>
        )}
      </div>

      {items.length === 0 && (
        <div className="rounded-md border border-dashed border-border bg-muted/10 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            No items yet —{' '}
            {!disabled && (
              <button
                type="button"
                onClick={addItem}
                className="text-primary hover:underline font-medium"
              >
                add the first one
              </button>
            )}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="rounded-md border border-border bg-background/60 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                {prop.label} #{idx + 1}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {children.map((child: PropertyDef) => (
              <PreviewFieldGroup
                key={child.name}
                prop={child}
                value={item[child.name]}
                onChange={(v) => updateItem(idx, child.name, v)}
                depth={depth + 1}
                disabled={disabled}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PreviewScalarField ───────────────────────────────────────────────────────

function PreviewScalarField({
  prop,
  value: rawValue,
  onChange,
  formAttrs,
  disabled,
}: {
  prop: PropertyDef;
  value: unknown;
  onChange: (value: unknown) => void;
  formAttrs?: Record<string, string>;
  disabled?: boolean;
}) {
  const [tagInputVal, setTagInputVal] = useState('');
  const base = disabled
    ? `${baseClass(formAttrs)} disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted/50`
    : baseClass(formAttrs);
  const numBase = `${base} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`;
  const dataType = resolveDataType(prop.dataType as unknown);

  // Spatial types are stored as structured objects — handle before string coercion
  if (dataType === 'COORDINATES') {
    return <CoordinatesMapField value={rawValue} onChange={onChange} disabled={disabled} />;
  }
  if (dataType === 'ADDRESS') {
    return <AddressField value={rawValue} onChange={onChange} disabled={disabled} />;
  }

  const value = typeof rawValue === 'string' ? rawValue : rawValue != null ? String(rawValue) : '';
  const attrs = prop.attributes ?? {};
  const uiComponent = attrs['ui:component'];
  const placeholder = attrs['html:placeholder'] ?? `Enter ${prop.label.toLowerCase()}…`;
  const multiline = attrs['ui:multiline'] === 'true' || uiComponent === 'textarea';
  const rows = attrs['ui:rows'] ? Number(attrs['ui:rows']) : 3;
  const step = attrs['html:step'];
  const attrMin = attrs['html:min'];
  const attrMax = attrs['html:max'];
  const pattern = attrs['html:pattern'];

  const optionsRaw = attrs['style:options'];
  const options: { label: string; value: string }[] | null = optionsRaw
    ? optionsRaw.split(',').map((o) => {
        const [label, val] = o.trim().split(':');
        return { label: label?.trim() ?? '', value: val?.trim() ?? label?.trim() ?? '' };
      })
    : null;

  const colorOptionsRaw = attrs['style:color-options'];
  const colorOptions: string[] | null = colorOptionsRaw
    ? colorOptionsRaw
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
    : null;

  // ── Numeric ──────────────────────────────────────────────────────────────────
  if (['BYTE', 'SHORT', 'INTEGER', 'LONG', 'BIG_INTEGER'].includes(dataType)) {
    if (uiComponent === 'slider') {
      const min = attrMin ? Number(attrMin) : 0;
      const max = attrMax ? Number(attrMax) : 100;
      const stepN = step ? Number(step) : 1;
      const numVal = value !== '' ? Number(value) : min;
      return (
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={min}
              max={max}
              step={stepN}
              value={numVal}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className={`flex-1 accent-primary ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            />
            <span className="text-sm font-mono w-10 text-right tabular-nums shrink-0">
              {numVal}
            </span>
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground/60 px-0.5">
            <span>{min}</span>
            <span>{max}</span>
          </div>
        </div>
      );
    }
    if (uiComponent === 'stepper') {
      const stepN = step ? Number(step) : 1;
      const numV = value !== '' ? Number(value) : 0;
      return (
        <div
          className={`flex items-center w-fit rounded-md border border-input overflow-hidden ${disabled ? 'opacity-50' : ''}`}
        >
          <button
            type="button"
            onClick={() => onChange(String(numV - stepN))}
            disabled={disabled}
            className="h-9 w-9 flex items-center justify-center bg-muted hover:bg-muted/80 text-lg font-medium border-r border-input disabled:cursor-not-allowed disabled:hover:bg-muted"
          >
            −
          </button>
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="h-9 w-16 text-center text-sm bg-background focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:cursor-not-allowed disabled:bg-muted/50"
          />
          <button
            type="button"
            onClick={() => onChange(String(numV + stepN))}
            disabled={disabled}
            className="h-9 w-9 flex items-center justify-center bg-muted hover:bg-muted/80 text-lg font-medium border-l border-input disabled:cursor-not-allowed disabled:hover:bg-muted"
          >
            +
          </button>
        </div>
      );
    }
    if (uiComponent === 'rating') {
      return (
        <div className={`flex gap-0.5 pt-0.5 ${disabled ? 'opacity-50' : ''}`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(String(value === String(star) ? 0 : star))}
              disabled={disabled}
              className={`text-2xl leading-none transition-colors disabled:cursor-not-allowed ${Number(value) >= star ? 'text-yellow-400' : 'text-muted-foreground/25 hover:text-yellow-300'}`}
            >
              ★
            </button>
          ))}
          {value && Number(value) > 0 && (
            <span className="text-xs text-muted-foreground self-center ml-1.5">{value}/5</span>
          )}
        </div>
      );
    }
    return (
      <input
        type="number"
        step={step ?? '1'}
        min={attrMin}
        max={attrMax}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={numBase}
      />
    );
  }

  if (['FLOAT', 'DOUBLE', 'BIG_DECIMAL'].includes(dataType)) {
    if (uiComponent === 'slider') {
      const min = attrMin ? Number(attrMin) : 0;
      const max = attrMax ? Number(attrMax) : 100;
      const stepN = step ? Number(step) : 0.1;
      const numVal = value !== '' ? Number(value) : min;
      return (
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={min}
              max={max}
              step={stepN}
              value={numVal}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className={`flex-1 accent-primary ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            />
            <span className="text-sm font-mono w-12 text-right tabular-nums shrink-0">
              {numVal}
            </span>
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground/60 px-0.5">
            <span>{min}</span>
            <span>{max}</span>
          </div>
        </div>
      );
    }
    return (
      <input
        type="number"
        step={step ?? 'any'}
        min={attrMin}
        max={attrMax}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={numBase}
      />
    );
  }

  // ── Boolean ───────────────────────────────────────────────────────────────────
  if (dataType === 'BOOLEAN') {
    if (uiComponent === 'toggle') {
      const on = value === 'true';
      return (
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => onChange(on ? 'false' : 'true')}
          disabled={disabled}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${on ? 'bg-primary' : 'bg-muted'}`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </button>
      );
    }
    if (uiComponent === 'checkbox') {
      return (
        <label
          className={`flex items-center gap-2 text-sm select-none w-fit ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        >
          <input
            type="checkbox"
            checked={value === 'true'}
            onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
            disabled={disabled}
            className="h-4 w-4 accent-primary"
          />
          <span className="text-muted-foreground">{value === 'true' ? 'Yes' : 'No'}</span>
        </label>
      );
    }
    return (
      <div className={`flex gap-4 pt-0.5 ${disabled ? 'opacity-50' : ''}`}>
        {[
          { label: 'Yes', val: 'true' },
          { label: 'No', val: 'false' },
        ].map(({ label, val }) => (
          <label
            key={val}
            className={`flex items-center gap-2 text-sm select-none ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input
              type="radio"
              name={`preview-${prop.name}`}
              value={val}
              checked={value === val}
              onChange={() => onChange(val)}
              disabled={disabled}
              className="accent-primary"
            />
            {label}
          </label>
        ))}
      </div>
    );
  }

  // ── Date / Time ───────────────────────────────────────────────────────────────
  if (dataType === 'LOCAL_DATE')
    return (
      <DatePicker
        value={value || undefined}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
      />
    );
  if (dataType === 'LOCAL_TIME')
    return (
      <TimePicker
        value={value || undefined}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
      />
    );
  if (['LOCAL_DATE_TIME', 'ZONED_DATE_TIME', 'INSTANT'].includes(dataType))
    return (
      <DateTimePicker
        value={value || undefined}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
      />
    );
  if (dataType === 'YEAR')
    return (
      <YearPicker
        value={value || undefined}
        onChange={onChange}
        placeholder={placeholder}
        minYear={attrMin ? Number(attrMin) : undefined}
        maxYear={attrMax ? Number(attrMax) : undefined}
        disabled={disabled}
      />
    );
  if (dataType === 'YEAR_MONTH')
    return (
      <input
        type="month"
        value={value}
        min={attrMin}
        max={attrMax}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={base}
      />
    );

  if (dataType === 'MONTH') {
    const MONTHS = [
      'JANUARY',
      'FEBRUARY',
      'MARCH',
      'APRIL',
      'MAY',
      'JUNE',
      'JULY',
      'AUGUST',
      'SEPTEMBER',
      'OCTOBER',
      'NOVEMBER',
      'DECEMBER',
    ];
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={base}
      >
        <option value="">Select month…</option>
        {MONTHS.map((m) => (
          <option key={m} value={m}>
            {m.charAt(0) + m.slice(1).toLowerCase()}
          </option>
        ))}
      </select>
    );
  }

  if (dataType === 'DAY_OF_WEEK') {
    const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={base}
      >
        <option value="">Select day…</option>
        {DAYS.map((d) => (
          <option key={d} value={d}>
            {d.charAt(0) + d.slice(1).toLowerCase()}
          </option>
        ))}
      </select>
    );
  }

  // ── String & default ──────────────────────────────────────────────────────────
  if (colorOptions) {
    return (
      <div className={`flex flex-wrap gap-2 pt-0.5 ${disabled ? 'opacity-50' : ''}`}>
        {colorOptions.map((color) => (
          <button
            key={color}
            type="button"
            title={color}
            onClick={() => onChange(value === color ? '' : color)}
            disabled={disabled}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border-2 transition-all disabled:cursor-not-allowed ${value === color ? 'border-primary scale-105' : 'border-transparent hover:border-border'}`}
          >
            <span
              className="w-6 h-6 rounded-full border border-border/40 block"
              style={{ backgroundColor: color }}
            />
            <span className="text-[10px] text-muted-foreground capitalize leading-none">
              {color}
            </span>
          </button>
        ))}
      </div>
    );
  }

  if (uiComponent === 'tag-input') {
    const tags = value
      ? value
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];
    const addTag = (raw: string) => {
      const tag = raw.trim();
      if (!tag || tags.includes(tag)) {
        setTagInputVal('');
        return;
      }
      onChange([...tags, tag].join(','));
      setTagInputVal('');
    };
    return (
      <div
        className={`min-h-[2.25rem] w-full rounded-md border border-input bg-background px-2 py-1.5 flex flex-wrap gap-1.5 focus-within:ring-2 focus-within:ring-ring ${disabled ? 'opacity-50 cursor-not-allowed bg-muted/50' : 'cursor-text'}`}
        onClick={(e) =>
          !disabled && (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()
        }
      >
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-sm font-medium"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(tags.filter((_, j) => j !== i).join(','));
                }}
                className="leading-none hover:text-primary/60"
              >
                ×
              </button>
            )}
          </span>
        ))}
        <input
          type="text"
          value={tagInputVal}
          onChange={(e) => setTagInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addTag(tagInputVal);
            } else if (e.key === 'Backspace' && !tagInputVal && tags.length > 0) {
              onChange(tags.slice(0, -1).join(','));
            }
          }}
          onBlur={() => {
            if (tagInputVal.trim()) addTag(tagInputVal);
          }}
          placeholder={tags.length === 0 ? placeholder : 'Add more…'}
          disabled={disabled}
          className="flex-1 min-w-[8rem] bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed"
        />
      </div>
    );
  }

  if (uiComponent === 'option-pills' && options) {
    return (
      <div className={`flex flex-wrap gap-2 pt-0.5 ${disabled ? 'opacity-50' : ''}`}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(value === o.value ? '' : o.value)}
            disabled={disabled}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all disabled:cursor-not-allowed ${value === o.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted/40'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    );
  }

  if (options) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={base}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  // ── File upload ───────────────────────────────────────────────────────────────
  if (dataType === 'FILE') {
    const accept = attrs['html:accept'];
    const isImage = !!accept?.includes('image');
    return (
      <label
        className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border transition-colors py-6 px-4 text-center ${disabled ? 'opacity-50 cursor-not-allowed bg-muted/50' : 'cursor-pointer hover:border-primary/40 hover:bg-muted/20'}`}
      >
        <Upload className="h-6 w-6 text-muted-foreground/40" />
        <span className="text-sm font-medium text-foreground">
          {value ? String(value) : 'Drag & drop or click to browse'}
        </span>
        {accept && <span className="text-[10px] text-muted-foreground/50">{accept}</span>}
        {!isImage && <span className="text-[10px] text-muted-foreground/50">File upload</span>}
        <input
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => onChange(e.target.files?.[0]?.name ?? '')}
          disabled={disabled}
        />
      </label>
    );
  }

  // ── Duration (PT…) ────────────────────────────────────────────────────────────
  if (dataType === 'DURATION') {
    const parts = /^PT?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(String(value ?? ''));
    const [h, m, s] = [parts?.[1] ?? '0', parts?.[2] ?? '0', parts?.[3] ?? '0'];
    const emit = (hv: string, mv: string, sv: string) =>
      onChange(`PT${hv || 0}H${mv || 0}M${sv || 0}S`);
    return (
      <div className={`flex items-center gap-2 flex-wrap ${disabled ? 'opacity-50' : ''}`}>
        {[
          { label: 'h', val: h, set: (v: string) => emit(v, m, s) },
          { label: 'min', val: m, set: (v: string) => emit(h, v, s) },
          { label: 'sec', val: s, set: (v: string) => emit(h, m, v) },
        ].map(({ label, val, set }) => (
          <div key={label} className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              value={val}
              onChange={(e) => set(e.target.value)}
              disabled={disabled}
              className={`w-16 ${numBase}`}
            />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    );
  }

  // ── Period (P…) ───────────────────────────────────────────────────────────────
  if (dataType === 'PERIOD') {
    const parts = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?$/.exec(String(value ?? ''));
    const [yr, mo, d] = [parts?.[1] ?? '0', parts?.[2] ?? '0', parts?.[3] ?? '0'];
    const emit = (yv: string, mv: string, dv: string) =>
      onChange(`P${yv || 0}Y${mv || 0}M${dv || 0}D`);
    return (
      <div className={`flex items-center gap-2 flex-wrap ${disabled ? 'opacity-50' : ''}`}>
        {[
          { label: 'yr', val: yr, set: (v: string) => emit(v, mo, d) },
          { label: 'mo', val: mo, set: (v: string) => emit(yr, v, d) },
          { label: 'd', val: d, set: (v: string) => emit(yr, mo, v) },
        ].map(({ label, val, set }) => (
          <div key={label} className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              value={val}
              onChange={(e) => set(e.target.value)}
              disabled={disabled}
              className={`w-16 ${numBase}`}
            />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    );
  }

  if (multiline) {
    return (
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`${base} resize-none`}
      />
    );
  }

  return (
    <input
      type={attrs['html:type'] ?? 'text'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      pattern={pattern}
      minLength={attrMin ? Number(attrMin) : undefined}
      maxLength={attrMax ? Number(attrMax) : undefined}
      disabled={disabled}
      className={base}
    />
  );
}

// ─── Listing view preview ─────────────────────────────────────────────────────
// Mirrors how the listing detail page (/listings/{id}/view) renders property values.

function ListViewField({ prop, value }: { prop: PropertyDef; value: unknown }) {
  if (value === undefined || value === null || value === '') {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  const strVal = String(value);
  const attrs = prop.attributes ?? {};
  const listAttrs = resolveAttrs(attrs, 'list', prop.type as never);
  const listDisplay = listAttrs['list:display'];
  const listPrefix = listAttrs['list:prefix'];
  const listSuffix = listAttrs['list:suffix'];
  const optionsRaw = attrs['style:options'];
  const colorOptionsRaw = attrs['style:color-options'];
  const uiComponent = attrs['ui:component'];

  // LIST / SET — array of child items
  if ((prop.type === 'LIST_PROPERTY' || prop.type === 'SET_PROPERTY') && Array.isArray(value)) {
    const children = prop.value ?? [];
    return (
      <div className="space-y-2">
        {(value as Record<string, unknown>[]).map((item, i) => (
          <div key={i} className="rounded-md border border-border/60 p-2.5 space-y-1.5">
            {children.map((child) => (
              <div key={child.name} className="flex items-baseline gap-2">
                <span className="text-xs text-muted-foreground w-24 shrink-0">{child.label}</span>
                <ListViewField prop={child} value={item[child.name]} />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  const mt = resolveMT(prop.dataType);

  // Spatial types are structured objects — render before generic stringification
  if (mt === 'COORDINATES' && typeof value === 'object' && value !== null) {
    const c = value as Record<string, unknown>;
    const latV = c['latitude'] != null ? String(c['latitude']) : '—';
    const lngV = c['longitude'] != null ? String(c['longitude']) : '—';
    return (
      <span className="text-sm font-mono text-foreground">
        {latV}, {lngV}
      </span>
    );
  }
  if (mt === 'ADDRESS' && typeof value === 'object' && value !== null) {
    const a = value as Record<string, unknown>;
    const parts = [
      a['addressLine1'],
      a['addressLine2'],
      a['area'],
      a['city'],
      a['state'],
      a['country'],
      a['pincode'],
    ].filter(Boolean);
    return <span className="text-sm text-foreground">{parts.join(', ') || '—'}</span>;
  }

  // BOOLEAN
  if (mt === 'BOOLEAN') {
    const on = strVal === 'true';
    return on ? (
      <span className="inline-flex items-center gap-1 text-emerald-600 text-sm font-medium">
        <CheckCircle2 className="h-4 w-4" /> Yes
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-muted-foreground text-sm">
        <XCircle className="h-4 w-4" /> No
      </span>
    );
  }

  if (listDisplay === 'link') {
    const label = listAttrs['list:link.label'] || strVal;
    return (
      <a href={strVal} className="text-sm font-medium text-primary underline-offset-2 hover:underline">
        {label}
      </a>
    );
  }

  if (listDisplay === 'boolean') {
    const on = strVal === 'true' || strVal === '1' || strVal === 'yes';
    return (
      <span className="text-sm text-foreground">
        {on ? listAttrs['list:boolean.true'] || 'Yes' : listAttrs['list:boolean.false'] || 'No'}
      </span>
    );
  }

  if (listDisplay === 'progress') {
    const max = Number(listAttrs['list:progress.max'] || 100) || 100;
    const num = Number(strVal);
    const pct = Number.isNaN(num) ? 0 : Math.max(0, Math.min(100, (num / max) * 100));
    return (
      <div className="flex items-center gap-2 min-w-[8rem]">
        <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">{Math.round(pct)}%</span>
      </div>
    );
  }

  // Badge
  if (listDisplay === 'badge' || listDisplay === 'pill') {
    const badgeColor = listAttrs['list:badge.color'];
    const colorCls =
      badgeColor === 'success'
        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
        : badgeColor === 'warning'
          ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
          : badgeColor === 'danger'
            ? 'bg-red-500/10 text-red-600 border-red-500/30'
            : 'bg-primary/10 text-primary border-primary/30';
    return (
      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${colorCls}`}
      >
        {strVal}
      </span>
    );
  }

  // Price
  if (listDisplay === 'price') {
    const currency = listAttrs['list:price.currency'] ?? 'USD';
    const fmt = listAttrs['list:price.format'] ?? 'symbol';
    const symbols: Record<string, string> = { USD: '$', GBP: '£', EUR: '€', INR: '₹' };
    const symbol = fmt === 'symbol' ? (symbols[currency] ?? currency) : '';
    const code = fmt === 'code' ? ` ${currency}` : '';
    return (
      <span className="text-base font-medium text-foreground tabular-nums">
        {symbol}
        {strVal}
        {code}
      </span>
    );
  }

  // Color swatch
  if (colorOptionsRaw) {
    const colors = colorOptionsRaw
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    return (
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <div
            key={color}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border-2 ${strVal === color ? 'border-primary scale-105' : 'border-transparent opacity-50'}`}
          >
            <span
              className="w-6 h-6 rounded-full border border-border/40 block"
              style={{ backgroundColor: color }}
            />
            <span className="text-[10px] text-muted-foreground capitalize">{color}</span>
          </div>
        ))}
      </div>
    );
  }

  // Rating
  if (uiComponent === 'rating') {
    const num = parseInt(strVal, 10) || 0;
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < num ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/40'}`}
          />
        ))}
        <span className="text-sm text-muted-foreground ml-1">{num}/5</span>
      </div>
    );
  }

  // Option pills — show all, highlight selected
  if ((uiComponent === 'option-pills' || optionsRaw) && optionsRaw) {
    const options = optionsRaw.split(',').map((o) => {
      const [label, val] = o.trim().split(':');
      return { label: label?.trim() ?? '', value: val?.trim() ?? label?.trim() ?? '' };
    });
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <span
            key={opt.value}
            className={`px-3 py-1.5 rounded-md border text-sm font-medium ${strVal === opt.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground'}`}
          >
            {opt.label}
          </span>
        ))}
      </div>
    );
  }

  // Tag input
  if (uiComponent === 'tag-input') {
    const tags = strVal
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    return (
      <div className="flex flex-wrap gap-1">
        {tags.map((t) => (
          <span key={t} className="px-2 py-0.5 rounded-full bg-muted text-xs text-foreground">
            {t}
          </span>
        ))}
      </div>
    );
  }

  // Prefix / suffix modifiers
  if (listPrefix || listSuffix) {
    return (
      <span className="inline-flex items-center gap-0.5 text-sm text-foreground">
        {listPrefix && <span className="text-muted-foreground text-xs">{listPrefix}</span>}
        {strVal}
        {listSuffix && <span className="text-muted-foreground text-xs">{listSuffix}</span>}
      </span>
    );
  }

  return <span className="text-sm text-foreground">{strVal}</span>;
}

export function ListingViewPreview({
  properties,
  title,
  asComposite,
}: {
  properties: PropertyDef[];
  title?: string;
  asComposite?: boolean;
}) {
  if (properties.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Add properties in the Build tab to see the listing view preview here.
      </div>
    );
  }

  const values = generateDummyValues(properties);

  // Component mode: render all properties as a single composite spec-table card
  if (asComposite) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          How this component appears inside a listing detail page
        </p>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {title && (
            <div className="px-5 py-3 bg-muted/40 border-b border-border flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{title}</span>
              <span className="text-xs text-muted-foreground">· {properties.length} fields</span>
            </div>
          )}
          <div className="divide-y divide-border/50">
            {properties.map((prop) => (
              <div
                key={prop.name}
                className="flex items-start gap-4 px-5 py-2.5 hover:bg-muted/20 transition-colors"
              >
                <span className="text-xs font-medium text-muted-foreground w-32 shrink-0 pt-0.5">
                  {prop.label}
                </span>
                <ListViewField prop={prop} value={values[prop.name]} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const scalars = properties.filter((p) => p.type !== 'COMPOSITE_PROPERTY');
  const composites = properties.filter((p) => p.type === 'COMPOSITE_PROPERTY');

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        How this data appears on the listing detail page
      </p>

      {scalars.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          {title && (
            <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">
              {title}
            </h2>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {scalars.map((prop) => (
              <div key={prop.name}>
                <p className="text-xs font-medium text-muted-foreground mb-1">{prop.label}</p>
                <ListViewField prop={prop} value={values[prop.name]} />
              </div>
            ))}
          </div>
        </div>
      )}

      {composites.map((prop) => {
        const compositeVal = values[prop.name] as Record<string, unknown> | undefined;
        const children = prop.value ?? [];
        return (
          <div key={prop.name} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 bg-muted/40 border-b border-border flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{prop.label}</span>
              <span className="text-xs text-muted-foreground">· {children.length} fields</span>
            </div>
            <div className="divide-y divide-border/50">
              {children.map((child) => (
                <div
                  key={child.name}
                  className="flex items-start gap-4 px-5 py-2.5 hover:bg-muted/20 transition-colors"
                >
                  <span className="text-xs font-medium text-muted-foreground w-32 shrink-0 pt-0.5">
                    {child.label}
                  </span>
                  <ListViewField prop={child} value={compositeVal?.[child.name]} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
