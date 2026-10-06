'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Plus, Search, Trash2, Upload } from 'lucide-react';
import {
  Button,
  Label,
  DatePicker,
  TimePicker,
  DateTimePicker,
  YearPicker,
  OffsetTimePicker,
  OffsetDateTimePicker,
} from '@repo/ui';
import {
  ManagedTypeVM,
  ManagedTypeListItemFull,
  PropertyDef,
  PropertyType,
  metadataApi,
} from '@repo/api';
import ReactSelect from 'react-select';
import type { SingleValue } from 'react-select';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { AddressField } from '@/components/common/admin/AddressField';
import { CoordinatesMapField } from '@/components/common/admin/CoordinatesMapField';
import { PhrasesInput } from '@/components/common/admin/PhrasesInput';
import { resolveAttrs } from '../../metadata/_components/attribute-protocol';

interface TypeOption {
  id: string;
  name: string;
  description?: string;
}

interface Step3Props {
  managedTypeId: string;
  selectedManagedType: ManagedTypeVM | null;
  loadingType: boolean;
  fieldValues: Record<string, unknown>;
  onTypeChange: (id: string) => void;
  onFieldChange: (name: string, value: unknown) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onCancel: () => void;
  onSkip?: () => void;
  saving: boolean;
  error: string | null;
}

export function Step3Catalog({
  managedTypeId,
  selectedManagedType,
  loadingType,
  fieldValues,
  onTypeChange,
  onFieldChange,
  onSubmit,
  onBack,
  onCancel,
  onSkip,
  saving,
  error,
}: Step3Props) {
  const [searchPhrases, setSearchPhrases] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<ManagedTypeListItemFull[]>([]);
  const [searching, setSearching] = useState(false);

  const doSearch = useCallback(async (phrases: string[]) => {
    setSearching(true);
    try {
      const results = await metadataApi.searchManagedTypeListItems({
        phrases,
        type: 'CATALOGUE',
      });
      setSearchResults(results);
    } catch {
      // silently ignore search errors
    } finally {
      setSearching(false);
    }
  }, []);

  // Auto-load all CATALOGUE types on mount
  useEffect(() => {
    doSearch([]);
  }, [doSearch]);

  // Options for react-select: search results + ensure selected type is always visible
  const options: TypeOption[] = (() => {
    const list = searchResults.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
    }));
    // Ensure currently selected type is in the list (important for edit flow)
    if (selectedManagedType && !list.some((o) => o.id === selectedManagedType.id)) {
      list.unshift({
        id: selectedManagedType.id,
        name: selectedManagedType.name,
        description: selectedManagedType.description,
      });
    }
    return list;
  })();

  const selectValue: TypeOption | null =
    managedTypeId && selectedManagedType
      ? {
          id: selectedManagedType.id,
          name: selectedManagedType.name,
          description: selectedManagedType.description,
        }
      : null;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Catalog template</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Search and select a template, then fill in its fields
          </p>
        </div>

        {/* Search bar */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Search templates</Label>
            <PhrasesInput
              value={searchPhrases}
              onChange={setSearchPhrases}
              placeholder="Template name or tag and press Enter..."
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 h-9"
            onClick={() => doSearch(searchPhrases)}
            disabled={searching}
          >
            {searching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            Search
          </Button>
        </div>

        {/* Type dropdown */}
        <div className="space-y-1.5">
          <Label>Template</Label>
          <ReactSelect<TypeOption>
            options={options}
            value={selectValue}
            onChange={(opt: SingleValue<TypeOption>) => {
              if (opt) onTypeChange(opt.id);
            }}
            getOptionValue={(o) => o.id}
            getOptionLabel={(o) => o.name}
            formatOptionLabel={(o) => (
              <div className="py-0.5">
                <div className="text-sm font-medium leading-tight">{o.name}</div>
                {o.description && (
                  <div className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                    {o.description}
                  </div>
                )}
              </div>
            )}
            placeholder={searching ? 'Loading...' : 'Select template...'}
            isLoading={searching}
            noOptionsMessage={() => 'No templates found. Try a different search.'}
            styles={{
              control: (base, state) => ({
                ...base,
                backgroundColor: 'hsl(var(--background))',
                borderColor: state.isFocused ? 'hsl(var(--primary))' : 'hsl(var(--input))',
                boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--primary) / 0.2)' : 'none',
                borderRadius: '0.375rem',
                minHeight: '2.25rem',
                fontSize: '0.875rem',
                '&:hover': { borderColor: 'hsl(var(--primary) / 0.5)' },
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isSelected
                  ? 'hsl(var(--primary))'
                  : state.isFocused
                    ? 'hsl(var(--muted))'
                    : 'hsl(var(--background))',
                color: state.isSelected
                  ? 'hsl(var(--primary-foreground))'
                  : 'hsl(var(--foreground))',
                cursor: 'pointer',
              }),
              menu: (base) => ({
                ...base,
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                boxShadow: '0 4px 16px hsl(var(--foreground)/0.08)',
                zIndex: 50,
              }),
              singleValue: (base) => ({ ...base, color: 'hsl(var(--foreground))' }),
              input: (base) => ({ ...base, color: 'hsl(var(--foreground))' }),
              placeholder: (base) => ({
                ...base,
                color: 'hsl(var(--muted-foreground))',
                fontSize: '0.875rem',
              }),
            }}
          />
        </div>

        {loadingType && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading type fields...
          </div>
        )}

        {selectedManagedType && (selectedManagedType.properties ?? []).length > 0 && (
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-5">
            {selectedManagedType.description && (
              <p className="text-xs text-muted-foreground">{selectedManagedType.description}</p>
            )}
            {selectedManagedType.properties?.map((prop: PropertyDef) => (
              <PropertyFieldGroup
                key={prop.name}
                prop={prop}
                value={fieldValues[prop.name]}
                onChange={(value) => onFieldChange(prop.name, value)}
              />
            ))}
          </div>
        )}

        {selectedManagedType && (selectedManagedType.properties ?? []).length === 0 && (
          <p className="text-xs text-muted-foreground">This type has no properties defined.</p>
        )}
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        {onSkip ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
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
              'Save listing'
            )}
          </Button>
        )}
      </div>
    </form>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRequired(prop: PropertyDef): boolean {
  return (prop.validators ?? []).some((v) => {
    const t = v.type as unknown;
    if (typeof t === 'string') return t === 'NOT_NULL';
    if (typeof t === 'object' && t !== null) return 'NOT_NULL' in (t as object);
    return false;
  });
}

const INTEGER_DATA_TYPES = new Set(['BYTE', 'SHORT', 'INTEGER', 'LONG', 'BIG_INTEGER', 'YEAR']);

const DECIMAL_DATA_TYPES = new Set(['FLOAT', 'DOUBLE', 'BIG_DECIMAL']);
const BOOLEAN_DATA_TYPES = new Set(['BOOLEAN']);

function coerceValue(prop: PropertyDef, value: unknown): unknown {
  if (value === undefined || value === null) return value;
  const dataType = resolveDataType(prop.dataType as unknown);

  if (BOOLEAN_DATA_TYPES.has(dataType)) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === 'true';
    if (typeof value === 'number') return value !== 0;
  }

  if (INTEGER_DATA_TYPES.has(dataType)) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      if (value === '') return value;
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : value;
    }
  }

  if (DECIMAL_DATA_TYPES.has(dataType)) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      if (value === '') return value;
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : value;
    }
  }

  return value;
}

function resolveDataType(dataType: unknown): string {
  if (typeof dataType === 'string') return dataType;
  if (typeof dataType === 'object' && dataType !== null)
    return Object.keys(dataType as Record<string, unknown>)[0] ?? '';
  return '';
}

const DATA_TYPE_LABELS: Partial<Record<string, string>> = {
  BOOLEAN: 'Boolean',
  BYTE: 'Byte',
  SHORT: 'Small Int',
  INTEGER: 'Integer',
  LONG: 'Long',
  FLOAT: 'Float',
  DOUBLE: 'Double',
  BIG_INTEGER: 'Big Int',
  BIG_DECIMAL: 'Decimal',
  STRING: 'Text',
  YEAR: 'Year',
  MONTH: 'Month',
  DAY_OF_WEEK: 'Day',
  YEAR_MONTH: 'Year/Month',
  LOCAL_DATE: 'Date',
  LOCAL_TIME: 'Time',
  LOCAL_DATE_TIME: 'Date & Time',
  OFFSET_TIME: 'Offset Time',
  OFFSET_DATE_TIME: 'Offset Date & Time',
  COORDINATES: 'Coordinates',
  ADDRESS: 'Address',
  FILE: 'File',
  LIST: 'List',
  DURATION: 'Duration',
  PERIOD: 'Period',
};

// ─── PropertyFieldGroup ───────────────────────────────────────────────────────

interface FieldGroupProps {
  prop: PropertyDef;
  value: unknown;
  onChange: (value: unknown) => void;
  depth?: number;
}

function PropertyFieldGroup({ prop, value, onChange, depth = 0 }: FieldGroupProps) {
  const indent = depth > 0 ? 'ml-4 pl-3 border-l border-border' : '';
  const required = isRequired(prop);
  const resolvedDataType = resolveDataType(prop.dataType as unknown);
  const handleChange = (nextValue: unknown) => onChange(coerceValue(prop, nextValue));

  // COMPOSITE_PROPERTY → labeled card with child fields inside
  if (prop.type === 'COMPOSITE_PROPERTY') {
    const children = prop.value ?? [];
    const obj =
      typeof value === 'object' && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};

    return (
      <div className={`rounded-lg border border-border overflow-hidden ${indent}`}>
        {/* section header */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
          <span className="text-xs font-semibold text-foreground tracking-wide">{prop.label}</span>
          {required && <span className="text-destructive text-xs leading-none">*</span>}
        </div>

        {/* child fields */}
        {children.length === 0 ? (
          <p className="px-4 py-3 text-xs text-muted-foreground">No child properties defined.</p>
        ) : (
          <div className="px-4 py-4 space-y-4 bg-background/60">
            {children.map((child: PropertyDef) => (
              <PropertyFieldGroup
                key={child.name}
                prop={child}
                value={obj[child.name]}
                onChange={(v) => onChange({ ...obj, [child.name]: v })}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // LIST_PROPERTY / SET_PROPERTY → array of schema-defined items
  if (prop.type === 'LIST_PROPERTY' || prop.type === 'SET_PROPERTY') {
    return (
      <CompositeListField
        prop={prop}
        value={value}
        onChange={onChange}
        depth={depth}
        indent={indent}
        required={required}
      />
    );
  }

  // SIMPLE / COMPLEX / default → scalar input
  // Resolve form:* attributes for this property
  const formAttrs = resolveAttrs(prop.attributes, 'form', prop.type as PropertyType);
  const formLayout = formAttrs['form:layout'] ?? 'vertical';
  const formLabelPos = formAttrs['form:label.position'] ?? 'top';
  const formWidth = formAttrs['form:width'] ?? 'full';
  const formHelperText = formAttrs['form:helper-text'];
  const widthClass = formWidth === 'auto' ? '' : formWidth === 'fixed' ? 'w-48' : 'w-full';

  const labelEl = (
    <div className="flex items-center gap-2">
      <FieldLabel label={prop.label} required={required} />
      {resolvedDataType && resolvedDataType !== 'STRING' && (
        <span className="text-[10px] text-muted-foreground/70 font-mono bg-muted/40 px-1.5 py-0.5 rounded">
          {DATA_TYPE_LABELS[resolvedDataType] ?? resolvedDataType}
        </span>
      )}
    </div>
  );

  const inputEl = (
    <>
      <ScalarField prop={prop} value={value} onChange={handleChange} formAttrs={formAttrs} />
      {formHelperText && (
        <p className="text-xs text-muted-foreground/70 mt-0.5">{formHelperText}</p>
      )}
    </>
  );

  if (formLabelPos === 'hidden') {
    return <div className={widthClass}>{inputEl}</div>;
  }

  if (formLayout === 'horizontal') {
    return (
      <div className={`flex items-start gap-3 ${widthClass}`}>
        <div className="shrink-0 pt-1">{labelEl}</div>
        <div className="flex-1 min-w-0">{inputEl}</div>
      </div>
    );
  }

  if (formLayout === 'inline') {
    return (
      <div className={`flex items-center gap-3 ${widthClass}`}>
        {labelEl}
        <div className="flex-1">{inputEl}</div>
      </div>
    );
  }

  return (
    <div className={`space-y-1.5 ${widthClass}`}>
      {labelEl}
      {inputEl}
    </div>
  );
}

// ─── CompositeListField ───────────────────────────────────────────────────────
// Shared renderer for lists of composite items (COMPOSITE_PROPERTY+LIST and LIST_PROPERTY).

function CompositeListField({
  prop,
  value,
  onChange,
  depth,
  indent,
  required,
}: {
  prop: PropertyDef;
  value: unknown;
  onChange: (value: unknown) => void;
  depth: number;
  indent: string;
  required: boolean;
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

  const updateItem = (idx: number, key: string, v: unknown) => {
    onChange(items.map((item, i) => (i === idx ? { ...item, [key]: v } : item)));
  };

  return (
    <div className={`space-y-2 ${indent}`}>
      <div className="flex items-center justify-between">
        <FieldLabel label={prop.label} required={required} />
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
        >
          <Plus className="h-3 w-3" />
          Add item
        </button>
      </div>

      {items.length === 0 && (
        <div className="rounded-md border border-dashed border-border bg-muted/10 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            No items yet —{' '}
            <button
              type="button"
              onClick={addItem}
              className="text-primary hover:underline font-medium"
            >
              add the first one
            </button>
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
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="text-muted-foreground hover:text-destructive transition-colors"
                aria-label={`Remove item ${idx + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {children.length > 0 ? (
              children.map((child: PropertyDef) => (
                <PropertyFieldGroup
                  key={child.name}
                  prop={child}
                  value={item[child.name]}
                  onChange={(v) => updateItem(idx, child.name, v)}
                  depth={depth + 1}
                />
              ))
            ) : (
              <ScalarField
                prop={prop}
                value={typeof item === 'string' ? item : ''}
                onChange={(v) => onChange(items.map((it, i) => (i === idx ? v : it)))}
                formAttrs={resolveAttrs(prop.attributes, 'form', prop.type as PropertyType)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FieldLabel ───────────────────────────────────────────────────────────────

function FieldLabel({ label, required }: { label: string; required: boolean }) {
  return (
    <Label className="text-sm font-medium">
      {label}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </Label>
  );
}

// ─── ScalarField ──────────────────────────────────────────────────────────────

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
] as const;

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAYS_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function parsePeriod(val: string): { years: number; months: number; days: number } {
  if (!val) return { years: 0, months: 0, days: 0 };
  const m = val.match(/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?$/);
  if (!m) return { years: 0, months: 0, days: 0 };
  return {
    years: m[1] ? parseInt(m[1], 10) : 0,
    months: m[2] ? parseInt(m[2], 10) : 0,
    days: m[3] ? parseInt(m[3], 10) : 0,
  };
}

function parseISODuration(val: string) {
  if (!val || typeof val !== 'string') {
    return { hours: 0, minutes: 0, seconds: 0 };
  }
  const match = val.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) {
    return { hours: 0, minutes: 0, seconds: 0 };
  }
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const seconds = match[3] ? parseInt(match[3], 10) : 0;
  return { hours, minutes, seconds };
}

// ─── SliderField ──────────────────────────────────────────────────────────────

function SliderField({
  name,
  value,
  onChange,
  min,
  max,
  step,
}: {
  name: string;
  value: string;
  onChange: (v: unknown) => void;
  min?: string;
  max?: string;
  step?: string;
}) {
  const minNum = min ? Number(min) : 0;
  const maxNum = max ? Number(max) : 100;
  const stepNum = step ? Number(step) : 1;
  const numVal = value !== '' ? Number(value) : minNum;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        <input
          id={`prop-${name}`}
          type="range"
          min={minNum}
          max={maxNum}
          step={stepNum}
          value={numVal}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 accent-primary cursor-pointer"
        />
        <span className="text-sm font-mono w-10 text-right tabular-nums text-foreground shrink-0">
          {numVal}
        </span>
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground/60 px-0.5">
        <span>{minNum}</span>
        <span>{maxNum}</span>
      </div>
    </div>
  );
}

// ─── TagInputField ─────────────────────────────────────────────────────────────

function TagInputField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: unknown) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');
  const tags = value
    ? value
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag || tags.includes(tag)) {
      setInput('');
      return;
    }
    onChange([...tags, tag].join(','));
    setInput('');
  };

  const removeTag = (idx: number) => onChange(tags.filter((_, i) => i !== idx).join(','));

  return (
    <div
      className="min-h-[2.25rem] w-full rounded-md border border-input bg-background px-2 py-1.5 flex flex-wrap gap-1.5 focus-within:ring-2 focus-within:ring-ring cursor-text"
      onClick={(e) => (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}
    >
      {tags.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-sm font-medium"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeTag(i);
            }}
            className="leading-none hover:text-primary/60 transition-colors"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(input);
          } else if (e.key === 'Backspace' && !input && tags.length > 0) removeTag(tags.length - 1);
        }}
        onBlur={() => {
          if (input.trim()) addTag(input);
        }}
        placeholder={tags.length === 0 ? placeholder : 'Add more…'}
        className="flex-1 min-w-[8rem] bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
      />
    </div>
  );
}

// ─── FileField ────────────────────────────────────────────────────────────────

function FileField({
  name,
  value,
  onChange,
  accept,
}: {
  name: string;
  value: string;
  onChange: (v: unknown) => void;
  accept?: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isImage = !!accept?.includes('image');

  const handleFile = (file: File) => {
    onChange(file.name);
    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      onClick={() => inputRef.current?.click()}
      className={`relative cursor-pointer rounded-lg border-2 border-dashed transition-colors ${
        dragging
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/40 hover:bg-muted/20'
      }`}
    >
      <input
        ref={inputRef}
        id={`prop-${name}`}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {preview ? (
        <div className="p-3 flex items-center gap-3">
          <img
            src={preview}
            alt="preview"
            className="h-16 w-16 object-cover rounded-md border border-border shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground truncate">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Click or drop to replace</p>
          </div>
        </div>
      ) : (
        <div className="py-8 px-4 flex flex-col items-center gap-2 text-center">
          <Upload className="h-7 w-7 text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {dragging ? 'Drop file here' : 'Drag & drop or click to browse'}
            </p>
            {value && <p className="text-xs text-primary mt-0.5 truncate max-w-xs">{value}</p>}
            {accept && <p className="text-[10px] text-muted-foreground/50 mt-1">{accept}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ScalarField ──────────────────────────────────────────────────────────────

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

function formBaseClass(formAttrs?: Record<string, string>): string {
  const size = formAttrs?.['form:size'] ?? 'md';
  const variant = formAttrs?.['form:variant'] ?? 'default';
  const width = formAttrs?.['form:width'] ?? 'full';
  const sizeCls = FORM_SIZE_CLASSES[size] ?? FORM_SIZE_CLASSES['md'];
  const variantCls = FORM_VARIANT_CLASSES[variant] ?? FORM_VARIANT_CLASSES['default'];
  const widthCls = width === 'auto' ? '' : width === 'fixed' ? 'w-48' : 'w-full';
  return `${widthCls} rounded-md ${variantCls} ${sizeCls} focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60`;
}

function ScalarField({
  prop,
  value,
  onChange,
  formAttrs,
}: {
  prop: PropertyDef;
  value: unknown;
  onChange: (value: unknown) => void;
  formAttrs?: Record<string, string>;
}) {
  const base = formBaseClass(formAttrs);
  const numBase = `${base} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`;

  const strVal = typeof value === 'string' ? value : value != null ? String(value) : '';
  const dataType = resolveDataType(prop.dataType as unknown);

  // ── Read attributes as typed rendering hints (namespaced protocol) ────────
  const attrs = prop.attributes ?? {};
  const uiComponent = attrs['ui:component'];
  const placeholder = attrs['html:placeholder'] ?? `Enter ${prop.label.toLowerCase()}…`;
  const multiline = attrs['ui:multiline'] === 'true' || uiComponent === 'textarea';
  const rows = attrs['ui:rows'] ? Number(attrs['ui:rows']) : 3;
  const step = attrs['html:step'];
  const attrMin = attrs['html:min'];
  const attrMax = attrs['html:max'];
  const pattern = attrs['html:pattern'];
  const maxLength = attrs['html:maxlength'] ? Number(attrs['html:maxlength']) : undefined;
  const autoComplete = attrs['html:autocomplete'];
  const readOnly = formAttrs?.['form:readonly'] === 'true';
  // style:options — comma-separated "Label:value" or "value"
  const optionsRaw = attrs['style:options'];
  const options: { label: string; value: string }[] | null = optionsRaw
    ? optionsRaw.split(',').map((o) => {
        const [label, val] = o.trim().split(':');
        return { label: label?.trim() ?? '', value: val?.trim() ?? label?.trim() ?? '' };
      })
    : null;
  // style:color-options — comma-separated color names or hex values
  const colorOptionsRaw = attrs['style:color-options'];
  const colorOptions: string[] | null = colorOptionsRaw
    ? colorOptionsRaw
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
    : null;

  switch (dataType) {
    // ── Numeric ──────────────────────────────────────────────────────────────
    case 'BYTE':
    case 'SHORT':
    case 'INTEGER':
    case 'LONG':
    case 'BIG_INTEGER':
      if (uiComponent === 'slider')
        return (
          <SliderField
            name={prop.name}
            value={strVal}
            onChange={onChange}
            min={attrMin}
            max={attrMax}
            step={step}
          />
        );
      if (uiComponent === 'stepper') {
        const stepN = step ? Number(step) : 1;
        const numV = strVal !== '' ? Number(strVal) : 0;
        return (
          <div className="flex items-center w-fit rounded-md border border-input overflow-hidden">
            <button
              type="button"
              onClick={() => onChange(String(numV - stepN))}
              className="h-9 w-9 flex items-center justify-center bg-muted hover:bg-muted/80 text-lg font-medium transition-colors border-r border-input"
            >
              −
            </button>
            <input
              type="number"
              value={strVal}
              onChange={(e) => onChange(e.target.value)}
              className="h-9 w-16 text-center text-sm bg-background focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => onChange(String(numV + stepN))}
              className="h-9 w-9 flex items-center justify-center bg-muted hover:bg-muted/80 text-lg font-medium transition-colors border-l border-input"
            >
              +
            </button>
          </div>
        );
      }
      if (uiComponent === 'rating') {
        return (
          <div className="flex gap-0.5 pt-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => onChange(String(strVal === String(star) ? 0 : star))}
                className={`text-2xl leading-none transition-colors ${
                  Number(strVal) >= star
                    ? 'text-yellow-400'
                    : 'text-muted-foreground/25 hover:text-yellow-300'
                }`}
              >
                ★
              </button>
            ))}
            {strVal && Number(strVal) > 0 && (
              <span className="text-xs text-muted-foreground self-center ml-1.5">{strVal}/5</span>
            )}
          </div>
        );
      }
      return (
        <input
          id={`prop-${prop.name}`}
          type="number"
          step={step ?? '1'}
          min={attrMin}
          max={attrMax}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={numBase}
        />
      );

    case 'FLOAT':
    case 'DOUBLE':
    case 'BIG_DECIMAL':
      if (uiComponent === 'slider')
        return (
          <SliderField
            name={prop.name}
            value={strVal}
            onChange={onChange}
            min={attrMin}
            max={attrMax}
            step={step}
          />
        );
      return (
        <input
          id={`prop-${prop.name}`}
          type="number"
          step={step ?? 'any'}
          min={attrMin}
          max={attrMax}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={numBase}
        />
      );

    // ── Boolean ──────────────────────────────────────────────────────────────
    case 'BOOLEAN':
      if (uiComponent === 'toggle') {
        const on = strVal === 'true';
        return (
          <button
            type="button"
            role="switch"
            aria-checked={on}
            onClick={() => onChange(on ? 'false' : 'true')}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
              on ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
                on ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        );
      }
      if (uiComponent === 'checkbox') {
        return (
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={strVal === 'true'}
              onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
              className="h-4 w-4 accent-primary"
            />
            <span className="text-muted-foreground">{strVal === 'true' ? 'Yes' : 'No'}</span>
          </label>
        );
      }
      return (
        <div className="flex gap-4 pt-0.5">
          {[
            { label: 'Yes', val: 'true' },
            { label: 'No', val: 'false' },
          ].map(({ label, val }) => (
            <label key={val} className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="radio"
                name={`prop-${prop.name}`}
                value={val}
                checked={strVal === val}
                onChange={() => onChange(val)}
                className="accent-primary"
              />
              {label}
            </label>
          ))}
        </div>
      );

    // ── Date / Time ──────────────────────────────────────────────────────────
    case 'LOCAL_DATE':
      return (
        <DatePicker
          id={`prop-${prop.name}`}
          value={strVal || undefined}
          onChange={onChange}
          placeholder={placeholder}
        />
      );

    case 'LOCAL_TIME':
      return (
        <TimePicker
          id={`prop-${prop.name}`}
          value={strVal || undefined}
          onChange={onChange}
          placeholder={placeholder}
        />
      );

    case 'LOCAL_DATE_TIME':
    case 'ZONED_DATE_TIME':
    case 'INSTANT':
      return (
        <DateTimePicker
          id={`prop-${prop.name}`}
          value={strVal || undefined}
          onChange={onChange}
          placeholder={placeholder}
        />
      );

    case 'OFFSET_DATE_TIME':
      return (
        <OffsetDateTimePicker
          id={`prop-${prop.name}`}
          value={strVal || undefined}
          onChange={onChange}
          placeholder={placeholder}
        />
      );

    case 'OFFSET_TIME':
      return (
        <OffsetTimePicker
          id={`prop-${prop.name}`}
          value={strVal || undefined}
          onChange={onChange}
          placeholder={placeholder}
        />
      );

    case 'YEAR':
      return (
        <YearPicker
          id={`prop-${prop.name}`}
          value={strVal || undefined}
          onChange={onChange}
          placeholder={placeholder}
          minYear={attrMin ? Number(attrMin) : undefined}
          maxYear={attrMax ? Number(attrMax) : undefined}
        />
      );

    case 'YEAR_MONTH':
      return (
        <input
          id={`prop-${prop.name}`}
          type="month"
          value={strVal}
          min={attrMin}
          max={attrMax}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      );

    case 'MONTH':
      return (
        <select
          id={`prop-${prop.name}`}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        >
          <option value="">Select month…</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={m}>
              {MONTH_LABELS[i]}
            </option>
          ))}
        </select>
      );

    case 'DAY_OF_WEEK':
      return (
        <select
          id={`prop-${prop.name}`}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        >
          <option value="">Select day…</option>
          {DAYS_OF_WEEK.map((d, i) => (
            <option key={d} value={d}>
              {DAY_LABELS[i]}
            </option>
          ))}
        </select>
      );

    // ── Spatial ───────────────────────────────────────────────────────────────
    case 'COORDINATES':
      // Store as { latitude: number, longitude: number } object (not a string)
      return <CoordinatesMapField value={value} onChange={onChange} />;

    // ── Address ───────────────────────────────────────────────────────────────
    case 'ADDRESS':
      return <AddressField value={value} onChange={onChange} />;

    // ── File ──────────────────────────────────────────────────────────────────
    case 'FILE':
      return (
        <FileField
          name={prop.name}
          value={strVal}
          onChange={onChange}
          accept={attrs['html:accept']}
        />
      );

    case 'DURATION': {
      const { hours, minutes, seconds } = parseISODuration(strVal);

      return (
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="number"
              min="0"
              value={hours}
              onChange={(e) =>
                onChange(`PT${parseInt(e.target.value, 10) || 0}H${minutes}M${seconds}S`)
              }
              className={numBase}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/60 pointer-events-none font-mono">
              hr
            </span>
          </div>
          <div className="flex-1 relative">
            <input
              type="number"
              min="0"
              max="59"
              value={minutes}
              onChange={(e) =>
                onChange(`PT${hours}H${parseInt(e.target.value, 10) || 0}M${seconds}S`)
              }
              className={numBase}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/60 pointer-events-none font-mono">
              min
            </span>
          </div>
          <div className="flex-1 relative">
            <input
              type="number"
              min="0"
              max="59"
              value={seconds}
              onChange={(e) =>
                onChange(`PT${hours}H${minutes}M${parseInt(e.target.value, 10) || 0}S`)
              }
              className={numBase}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/60 pointer-events-none font-mono">
              sec
            </span>
          </div>
        </div>
      );
    }

    case 'PERIOD': {
      const { years, months, days } = parsePeriod(strVal);

      const updatePeriod = (y: number, mo: number, d: number) => {
        const parts: string[] = [];
        if (y) parts.push(`${y}Y`);
        if (mo) parts.push(`${mo}M`);
        if (d) parts.push(`${d}D`);
        onChange(parts.length ? `P${parts.join('')}` : 'P0D');
      };
      return (
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="number"
              min="0"
              value={years}
              onChange={(e) => updatePeriod(parseInt(e.target.value, 10) || 0, months, days)}
              className={numBase}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/60 pointer-events-none font-mono">
              yr
            </span>
          </div>
          <div className="flex-1 relative">
            <input
              type="number"
              min="0"
              value={months}
              onChange={(e) => updatePeriod(years, parseInt(e.target.value, 10) || 0, days)}
              className={numBase}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/60 pointer-events-none font-mono">
              mo
            </span>
          </div>
          <div className="flex-1 relative">
            <input
              type="number"
              min="0"
              value={days}
              onChange={(e) => updatePeriod(years, months, parseInt(e.target.value, 10) || 0)}
              className={numBase}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/60 pointer-events-none font-mono">
              d
            </span>
          </div>
        </div>
      );
    }

    // ── String & default ──────────────────────────────────────────────────────
    case 'STRING':
    default:
      // color swatches → clickable color picker
      if (colorOptions) {
        return (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {colorOptions.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                onClick={() => onChange(strVal === color ? '' : color)}
                className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border-2 transition-all ${
                  strVal === color
                    ? 'border-primary scale-105'
                    : 'border-transparent hover:border-border'
                }`}
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
      // tag-input → chip input, value stored as comma-separated
      if (uiComponent === 'tag-input')
        return <TagInputField value={strVal} onChange={onChange} placeholder={placeholder} />;
      if (uiComponent === 'radio' && options) {
        return (
          <div className="flex flex-wrap gap-4 pt-0.5">
            {options.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name={`prop-${prop.name}`}
                  value={o.value}
                  checked={strVal === o.value}
                  disabled={readOnly}
                  onChange={() => onChange(o.value)}
                  className="accent-primary"
                />
                {o.label}
              </label>
            ))}
          </div>
        );
      }
      if (uiComponent === 'color') {
        return (
          <input
            id={`prop-${prop.name}`}
            type="color"
            value={strVal || '#000000'}
            disabled={readOnly}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-14 rounded-md border border-input bg-background p-1"
          />
        );
      }
      // option-pills → pill button group
      if (uiComponent === 'option-pills' && options) {
        return (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => onChange(strVal === o.value ? '' : o.value)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  strVal === o.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted/40'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        );
      }
      // options attribute → render as select
      if (options) {
        return (
          <select
            id={`prop-${prop.name}`}
            value={strVal}
            onChange={(e) => onChange(e.target.value)}
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
      // multiline attribute → render as textarea
      if (multiline) {
        return (
          <textarea
            id={`prop-${prop.name}`}
            value={strVal}
            rows={rows}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`${base} resize-none`}
          />
        );
      }
      return (
        <input
          id={`prop-${prop.name}`}
          type={attrs['html:type'] ?? 'text'}
          value={strVal}
          readOnly={readOnly}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          pattern={pattern}
          minLength={attrMin ? Number(attrMin) : undefined}
          maxLength={maxLength ?? (attrMax ? Number(attrMax) : undefined)}
          className={base}
        />
      );
  }
}
