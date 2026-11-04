'use client';

import { useId, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Minus, Plus, Star, Trash2, Upload } from 'lucide-react';
import {
  Button,
  Checkbox,
  DatePicker,
  DateTimePicker,
  Input,
  Label,
  OffsetDateTimePicker,
  OffsetTimePicker,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Switch,
  Textarea,
  TimePicker,
  YearPicker,
  cn,
} from '@repo/ui';
import type { PropertyDef } from '@repo/api';
import { AddressField } from '@/components/common/admin/AddressField';
import { CoordinatesMapField } from '@/components/common/admin/CoordinatesMapField';
import { SegmentedControl } from '@/components/common/admin/SegmentedControl';
import { TagInput } from '@/components/common/admin/TagInput';
import Tip from '@/components/common/admin/Tip';
import { resolveAttrs } from '@/lib/attributes/protocol';
import {
  DAY_OPTIONS,
  DECIMAL_DATA_TYPES,
  INTEGER_DATA_TYPES,
  MONTH_OPTIONS,
  coerceValue,
  isListType,
  isRequired,
  joinMulti,
  parseDuration,
  parseList,
  parseOptions,
  parsePeriod,
  resolveDataType,
  splitMulti,
  type AttrOption,
} from '@/lib/attributes/values';

/**
 * Renders a managed-type property as a form input, driven by its `html:*`, `ui:*`,
 * `style:*` and `form:*` attributes. Used by the listing wizard and every preview.
 */

export interface AttrFieldProps {
  prop: PropertyDef;
  value: unknown;
  onChange: (value: unknown) => void;
  depth?: number;
  disabled?: boolean;
}

export function AttrField(props: AttrFieldProps) {
  if (props.prop.type === 'COMPOSITE_PROPERTY') return <CompositeSection {...props} />;
  if (isListType(props.prop.type)) return <ListSection {...props} />;
  return <ScalarFieldGroup {...props} />;
}

// ── shared bits ──────────────────────────────────────────────────────────────

const DATA_TYPE_LABELS: Partial<Record<string, string>> = {
  BOOLEAN: 'Boolean',
  BYTE: 'Byte',
  SHORT: 'Small int',
  INTEGER: 'Integer',
  LONG: 'Long',
  FLOAT: 'Float',
  DOUBLE: 'Double',
  BIG_INTEGER: 'Big int',
  BIG_DECIMAL: 'Decimal',
  YEAR: 'Year',
  MONTH: 'Month',
  DAY_OF_WEEK: 'Day',
  YEAR_MONTH: 'Year/month',
  LOCAL_DATE: 'Date',
  LOCAL_TIME: 'Time',
  LOCAL_DATE_TIME: 'Date & time',
  ZONED_DATE_TIME: 'Date & time',
  INSTANT: 'Date & time',
  OFFSET_TIME: 'Offset time',
  OFFSET_DATE_TIME: 'Offset date & time',
  COORDINATES: 'Coordinates',
  ADDRESS: 'Address',
  FILE: 'File',
  DURATION: 'Duration',
  PERIOD: 'Period',
};

const SIZE_CLASSES: Record<string, string> = {
  sm: 'h-8 px-2.5 py-1 text-xs md:text-xs',
  md: '',
  lg: 'h-11 px-4 text-base md:text-base',
  xl: 'h-12 px-4 text-lg md:text-lg',
};

const TEXTAREA_SIZE_CLASSES: Record<string, string> = {
  sm: 'px-2.5 py-1.5 text-xs md:text-xs',
  md: '',
  lg: 'px-4 py-2.5 text-base md:text-base',
  xl: 'px-4 py-3 text-lg md:text-lg',
};

const VARIANT_CLASSES: Record<string, string> = {
  default: '',
  outline: 'border-border bg-transparent',
  ghost: 'border-transparent bg-transparent hover:bg-muted/40',
  filled: 'border-transparent bg-muted',
  underline:
    'rounded-none border-0 border-b border-input bg-transparent px-0 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0',
};

const WIDTH_CLASSES: Record<string, string> = {
  full: 'w-full',
  half: 'w-full md:w-1/2',
  auto: 'w-fit max-w-full',
  fixed: 'w-full sm:w-48',
};

const COLUMN_CLASSES: Record<string, string> = {
  '1': '',
  '2': 'md:grid-cols-2',
  '3': 'md:grid-cols-3',
  '4': 'md:grid-cols-2 lg:grid-cols-4',
};

function num(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function toStr(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') return '';
  return String(value);
}

function RequiredMark() {
  return (
    <span className="ml-0.5 text-destructive" aria-hidden>
      *
    </span>
  );
}

// ── Composite + list sections ────────────────────────────────────────────────

function SectionShell({
  title,
  required,
  helper,
  collapsible,
  actions,
  children,
}: {
  title: string;
  required: boolean;
  helper?: string;
  collapsible?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const canCollapse = collapsible === 'true' || collapsible === 'collapsed';
  const [open, setOpen] = useState(collapsible !== 'collapsed');
  const contentId = useId();

  const heading = (
    <span className="text-sm font-semibold text-foreground">
      {title}
      {required && <RequiredMark />}
    </span>
  );

  return (
    <section className="overflow-hidden rounded-lg border border-border">
      <div
        className={cn(
          'flex items-center gap-2 bg-muted/40 px-4 py-2.5',
          open && 'border-b border-border',
        )}
      >
        {canCollapse ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={contentId}
            onClick={() => setOpen((o) => !o)}
            className="flex flex-1 items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                !open && '-rotate-90',
              )}
            />
            {heading}
          </button>
        ) : (
          <div className="flex flex-1 items-center gap-2">{heading}</div>
        )}
        {actions}
      </div>
      {open && (
        <div id={contentId} className="bg-background/60">
          {helper && <p className="px-4 pt-3 text-xs text-muted-foreground">{helper}</p>}
          {children}
        </div>
      )}
    </section>
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function CompositeSection({ prop, value, onChange, depth = 0, disabled }: AttrFieldProps) {
  const attrs = resolveAttrs(prop.attributes, 'form', prop.type);
  const children = prop.value ?? [];
  const obj = asRecord(value);
  const locked = disabled || attrs['form:readonly'] === 'true';

  return (
    <SectionShell
      title={prop.label}
      required={isRequired(prop)}
      helper={attrs['form:helper-text']}
      collapsible={attrs['form:collapsible']}
    >
      {children.length === 0 ? (
        <p className="px-4 py-3 text-xs text-muted-foreground">No child properties defined.</p>
      ) : (
        <div
          className={cn(
            'grid grid-cols-1 gap-4 px-4 py-4',
            COLUMN_CLASSES[attrs['form:columns'] ?? '1'],
          )}
        >
          {children.map((child) => (
            <div
              key={child.name}
              className={cn(
                (child.type === 'COMPOSITE_PROPERTY' || isListType(child.type)) && 'col-span-full',
              )}
            >
              <AttrField
                prop={child}
                value={obj[child.name]}
                onChange={(v) => onChange({ ...obj, [child.name]: v })}
                depth={depth + 1}
                disabled={locked}
              />
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

function itemTitle(
  template: string | undefined,
  fallback: string,
  index: number,
  item: unknown,
): string {
  if (!template) return `${fallback} ${index + 1}`;
  const rec = asRecord(item);
  const out = template.replace(/\{(\w+)\}/g, (_m, key: string) =>
    key === 'n' ? String(index + 1) : toStr(rec[key]),
  );
  return out.trim() || `${fallback} ${index + 1}`;
}

function ListSection({ prop, value, onChange, depth = 0, disabled }: AttrFieldProps) {
  const attrs = resolveAttrs(prop.attributes, 'form', prop.type);
  const children = prop.value ?? [];
  const items = Array.isArray(value) ? (value as unknown[]) : [];
  const locked = disabled || attrs['form:readonly'] === 'true';
  const min = num(attrs['form:min-items']) ?? 0;
  const max = num(attrs['form:max-items']);
  const canAdd = !locked && (max === undefined || items.length < max);
  const canRemove = !locked && items.length > min;
  const addLabel = attrs['form:add-label'] || 'Add item';
  const scalarId = useId();

  const addItem = () =>
    onChange([
      ...items,
      children.length ? Object.fromEntries(children.map((c) => [c.name, ''])) : '',
    ]);
  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, next: unknown) =>
    onChange(items.map((it, i) => (i === idx ? next : it)));
  const moveItem = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };

  const countHint =
    max !== undefined ? `${items.length} / ${max}` : min > 0 ? `At least ${min}` : undefined;

  return (
    <SectionShell
      title={prop.label}
      required={isRequired(prop)}
      helper={attrs['form:helper-text']}
      collapsible={attrs['form:collapsible']}
      actions={
        <div className="flex items-center gap-2">
          {countHint && (
            <span className="text-xs tabular-nums text-muted-foreground">{countHint}</span>
          )}
          {!locked && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addItem}
              disabled={!canAdd}
              className="h-7 gap-1 px-2 text-xs text-primary hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              {addLabel}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-2 px-4 py-4">
        {items.length === 0 && (
          <div className="rounded-md border border-dashed border-border bg-muted/10 py-4 text-center text-xs text-muted-foreground">
            No items yet.
            {canAdd && (
              <>
                {' '}
                <button
                  type="button"
                  onClick={addItem}
                  className="rounded-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Add the first one
                </button>
              </>
            )}
          </div>
        )}

        {items.map((item, idx) => {
          const title = itemTitle(attrs['form:item-label'], prop.label, idx, item);
          return (
            <div key={idx} className="space-y-3 rounded-md border border-border bg-background p-3">
              <div className="flex items-center gap-1">
                <span className="flex-1 truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {title}
                </span>
                {!locked && (
                  <>
                    <Tip label="Move up">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={`Move ${title} up`}
                        disabled={idx === 0}
                        onClick={() => moveItem(idx, -1)}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                    </Tip>
                    <Tip label="Move down">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={`Move ${title} down`}
                        disabled={idx === items.length - 1}
                        onClick={() => moveItem(idx, 1)}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </Tip>
                    <Tip label="Remove">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${title}`}
                        disabled={!canRemove}
                        onClick={() => removeItem(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </Tip>
                  </>
                )}
              </div>
              {children.length > 0 ? (
                children.map((child) => (
                  <AttrField
                    key={child.name}
                    prop={child}
                    value={asRecord(item)[child.name]}
                    onChange={(v) => updateItem(idx, { ...asRecord(item), [child.name]: v })}
                    depth={depth + 1}
                    disabled={locked}
                  />
                ))
              ) : (
                <ScalarControl
                  prop={prop}
                  attrs={attrs}
                  value={item}
                  onChange={(v) => updateItem(idx, coerceValue(prop, v))}
                  id={`${scalarId}-${idx}`}
                  ariaLabel={title}
                  disabled={locked}
                />
              )}
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

// ── Scalar field (label + control + helper) ──────────────────────────────────

function ScalarFieldGroup({ prop, value, onChange, disabled }: AttrFieldProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const helperId = `${id}-help`;
  const attrs = resolveAttrs(prop.attributes, 'form', prop.type);
  const dataType = resolveDataType(prop.dataType as unknown);
  const required = isRequired(prop);
  const labelPos = attrs['form:label.position'] ?? 'top';
  const layout = labelPos === 'left' ? 'horizontal' : (attrs['form:layout'] ?? 'vertical');
  const helper = attrs['form:helper-text'];
  const maxLength = num(attrs['html:maxlength']);
  const showCount = attrs['form:show-count'] === 'true';
  const strVal = toStr(value);

  const labelEl = (
    <div className={cn('flex items-center gap-2', labelPos === 'hidden' && 'sr-only')}>
      <Label id={labelId} htmlFor={id} className="text-sm font-medium">
        {prop.label}
        {required && <RequiredMark />}
      </Label>
      {dataType && dataType !== 'STRING' && DATA_TYPE_LABELS[dataType] && (
        <span className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {DATA_TYPE_LABELS[dataType]}
        </span>
      )}
    </div>
  );

  const footer =
    helper || showCount ? (
      <div className="flex items-start justify-between gap-3">
        {helper ? (
          <p id={helperId} className="text-xs text-muted-foreground">
            {helper}
          </p>
        ) : (
          <span />
        )}
        {showCount && (
          <span
            className={cn(
              'shrink-0 text-xs tabular-nums text-muted-foreground',
              maxLength !== undefined && strVal.length > maxLength && 'text-destructive',
            )}
            aria-live="polite"
          >
            {strVal.length}
            {maxLength !== undefined && ` / ${maxLength}`}
          </span>
        )}
      </div>
    ) : null;

  const control = (
    <div className={cn('space-y-1', WIDTH_CLASSES[attrs['form:width'] ?? 'full'])}>
      <ScalarControl
        prop={prop}
        attrs={attrs}
        value={value}
        onChange={(v) => onChange(coerceValue(prop, v))}
        id={id}
        labelId={labelId}
        describedBy={helper ? helperId : undefined}
        required={required}
        disabled={disabled}
      />
      {footer}
    </div>
  );

  if (layout === 'horizontal') {
    return (
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
        <div className="sm:w-40 sm:shrink-0 sm:pt-2">{labelEl}</div>
        <div className="min-w-0 flex-1">{control}</div>
      </div>
    );
  }
  if (layout === 'inline') {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="shrink-0">{labelEl}</div>
        <div className="min-w-0 flex-1">{control}</div>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {labelEl}
      {control}
    </div>
  );
}

// ── Scalar control (the widget itself) ───────────────────────────────────────

interface ControlProps {
  prop: PropertyDef;
  attrs: Record<string, string>;
  value: unknown;
  onChange: (value: unknown) => void;
  id: string;
  labelId?: string;
  /** Used when there is no visible label (scalar list items). */
  ariaLabel?: string;
  describedBy?: string;
  required?: boolean;
  disabled?: boolean;
}

type OptionMode =
  | 'select'
  | 'radio'
  | 'segmented'
  | 'option-pills'
  | 'multi-pills'
  | 'checkbox-group';

const OPTION_MODES: OptionMode[] = [
  'select',
  'radio',
  'segmented',
  'option-pills',
  'multi-pills',
  'checkbox-group',
];

export function ScalarControl(p: ControlProps) {
  const { prop, attrs, value, onChange, id, disabled } = p;
  const dataType = resolveDataType(prop.dataType as unknown);
  const component = attrs['ui:component'];
  const readOnly = attrs['form:readonly'] === 'true';
  const locked = !!disabled || readOnly;
  const strVal = toStr(value);
  const options = parseOptions(attrs['style:options']);
  const placeholder = attrs['html:placeholder'] ?? `Enter ${prop.label.toLowerCase()}…`;
  const size = attrs['form:size'] ?? 'md';
  const boxCls = cn(SIZE_CLASSES[size], VARIANT_CLASSES[attrs['form:variant'] ?? 'default']);
  const a11y = {
    'aria-labelledby': p.ariaLabel ? undefined : p.labelId,
    'aria-label': p.ariaLabel,
    'aria-describedby': p.describedBy,
  };
  const numeric = INTEGER_DATA_TYPES.has(dataType) || DECIMAL_DATA_TYPES.has(dataType);
  const min = attrs['html:min'];
  const max = attrs['html:max'];
  const step = attrs['html:step'];

  const optionControl = (opts: AttrOption[], mode: OptionMode) => (
    <OptionsControl
      {...p}
      options={opts}
      mode={mode}
      locked={locked}
      boxCls={boxCls}
      placeholder={attrs['html:placeholder'] ?? 'Select…'}
    />
  );

  if (options && (numeric || dataType === 'STRING' || dataType === '')) {
    const mode = OPTION_MODES.includes(component as OptionMode)
      ? (component as OptionMode)
      : 'select';
    return optionControl(options, mode);
  }

  switch (dataType) {
    case 'BYTE':
    case 'SHORT':
    case 'INTEGER':
    case 'LONG':
    case 'BIG_INTEGER':
    case 'FLOAT':
    case 'DOUBLE':
    case 'BIG_DECIMAL': {
      if (component === 'slider') return <SliderControl {...p} locked={locked} />;
      if (component === 'stepper') return <StepperControl {...p} locked={locked} boxCls={boxCls} />;
      if (component === 'rating' && INTEGER_DATA_TYPES.has(dataType))
        return <RatingControl {...p} locked={locked} />;
      return (
        <Adorned prefix={attrs['form:prefix']} suffix={attrs['form:suffix']}>
          <Input
            id={id}
            type="number"
            inputMode={
              (attrs['html:inputmode'] as React.HTMLAttributes<HTMLInputElement>['inputMode']) ??
              (INTEGER_DATA_TYPES.has(dataType) ? 'numeric' : 'decimal')
            }
            step={step ?? (INTEGER_DATA_TYPES.has(dataType) ? '1' : 'any')}
            min={min}
            max={max}
            value={strVal}
            placeholder={placeholder}
            readOnly={readOnly}
            disabled={disabled}
            required={p.required}
            onChange={(e) => onChange(e.target.value)}
            className={cn(boxCls, adornCls(attrs))}
            {...a11y}
          />
        </Adorned>
      );
    }

    case 'BOOLEAN': {
      const on = strVal === 'true';
      if (component === 'toggle' || component === 'checkbox') {
        const Ctrl = component === 'toggle' ? Switch : Checkbox;
        return (
          <div className="flex items-center gap-2 pt-0.5">
            <Ctrl
              id={id}
              checked={on}
              disabled={locked}
              onCheckedChange={(c) => onChange(c === true ? 'true' : 'false')}
              {...a11y}
            />
            <span className="text-sm text-muted-foreground">{on ? 'Yes' : 'No'}</span>
          </div>
        );
      }
      const yesNo: AttrOption[] = [
        { label: 'Yes', value: 'true' },
        { label: 'No', value: 'false' },
      ];
      return optionControl(yesNo, component === 'segmented' ? 'segmented' : 'radio');
    }

    case 'LOCAL_DATE':
      return (
        <DatePicker
          id={id}
          value={strVal || undefined}
          onChange={onChange}
          placeholder={placeholder}
          disabled={locked}
        />
      );
    case 'LOCAL_TIME':
      return (
        <TimePicker
          id={id}
          value={strVal || undefined}
          onChange={onChange}
          placeholder={placeholder}
          disabled={locked}
        />
      );
    case 'LOCAL_DATE_TIME':
    case 'ZONED_DATE_TIME':
    case 'INSTANT':
      return (
        <DateTimePicker
          id={id}
          value={strVal || undefined}
          onChange={onChange}
          placeholder={placeholder}
          disabled={locked}
        />
      );
    case 'OFFSET_DATE_TIME':
      return (
        <OffsetDateTimePicker
          id={id}
          value={strVal || undefined}
          onChange={onChange}
          placeholder={placeholder}
          disabled={locked}
        />
      );
    case 'OFFSET_TIME':
      return (
        <OffsetTimePicker
          id={id}
          value={strVal || undefined}
          onChange={onChange}
          placeholder={placeholder}
          disabled={locked}
        />
      );
    case 'YEAR':
      return (
        <YearPicker
          id={id}
          value={strVal || undefined}
          onChange={onChange}
          placeholder={placeholder}
          minYear={num(min)}
          maxYear={num(max)}
          disabled={locked}
        />
      );
    case 'YEAR_MONTH':
      return (
        <Input
          id={id}
          type="month"
          value={strVal}
          min={min}
          max={max}
          readOnly={readOnly}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={boxCls}
          {...a11y}
        />
      );
    case 'MONTH':
      return optionControl(MONTH_OPTIONS, 'select');
    case 'DAY_OF_WEEK':
      return optionControl(DAY_OPTIONS, 'select');

    case 'COORDINATES':
      return <CoordinatesMapField value={value} onChange={onChange} disabled={locked} />;
    case 'ADDRESS':
      return <AddressField value={value} onChange={onChange} disabled={locked} />;
    case 'FILE':
      return (
        <FileDrop
          id={id}
          value={strVal}
          onChange={onChange}
          accept={attrs['html:accept']}
          disabled={locked}
          describedBy={p.describedBy}
        />
      );
    case 'DURATION':
      return <DurationControl {...p} locked={locked} boxCls={boxCls} />;
    case 'PERIOD':
      return <PeriodControl {...p} locked={locked} boxCls={boxCls} />;

    case 'STRING':
    default: {
      const colors = parseList(attrs['style:color-options']);
      if (colors.length) return <SwatchControl {...p} colors={colors} locked={locked} />;

      if (component === 'tag-input') {
        const tags = splitMulti(value);
        if (locked) return <ChipList items={tags} />;
        return (
          <TagInput
            value={tags}
            onChange={(t) => onChange(joinMulti(t))}
            max={num(attrs['html:max']) ?? 50}
            placeholder={placeholder}
          />
        );
      }

      if (component === 'color') {
        return (
          <Input
            id={id}
            type="color"
            value={/^#[0-9a-f]{6}$/i.test(strVal) ? strVal : '#000000'}
            disabled={locked}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-16 cursor-pointer p-1"
            {...a11y}
          />
        );
      }

      const maxLength = num(attrs['html:maxlength']) ?? num(attrs['html:max']);
      if (attrs['ui:multiline'] === 'true' || component === 'textarea') {
        return (
          <Textarea
            id={id}
            value={strVal}
            rows={num(attrs['ui:rows']) ?? 3}
            maxLength={maxLength}
            readOnly={readOnly}
            disabled={disabled}
            required={p.required}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              'min-h-0 resize-y',
              TEXTAREA_SIZE_CLASSES[size],
              VARIANT_CLASSES[attrs['form:variant'] ?? 'default'],
            )}
            {...a11y}
          />
        );
      }

      return (
        <Adorned prefix={attrs['form:prefix']} suffix={attrs['form:suffix']}>
          <Input
            id={id}
            type={attrs['html:type'] ?? 'text'}
            inputMode={
              attrs['html:inputmode'] as React.HTMLAttributes<HTMLInputElement>['inputMode']
            }
            value={strVal}
            readOnly={readOnly}
            disabled={disabled}
            required={p.required}
            autoComplete={attrs['html:autocomplete']}
            pattern={attrs['html:pattern']}
            minLength={num(attrs['html:min'])}
            maxLength={maxLength}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={cn(boxCls, adornCls(attrs))}
            {...a11y}
          />
        </Adorned>
      );
    }
  }
}

// ── widgets ──────────────────────────────────────────────────────────────────

function adornCls(attrs: Record<string, string>): string {
  return cn(
    (attrs['form:prefix'] || attrs['form:suffix']) && 'min-w-0 flex-1',
    attrs['form:prefix'] && 'rounded-l-none',
    attrs['form:suffix'] && 'rounded-r-none',
  );
}

function Adorned({
  prefix,
  suffix,
  children,
}: {
  prefix?: string;
  suffix?: string;
  children: ReactNode;
}) {
  if (!prefix && !suffix) return <>{children}</>;
  const addon =
    'inline-flex shrink-0 items-center border border-input bg-muted px-3 text-sm text-muted-foreground';
  return (
    <div className="flex w-full items-stretch">
      {prefix && <span className={cn(addon, 'rounded-l-md border-r-0')}>{prefix}</span>}
      {children}
      {suffix && <span className={cn(addon, 'rounded-r-md border-l-0')}>{suffix}</span>}
    </div>
  );
}

const pillCls = (selected: boolean) =>
  cn(
    'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
    'disabled:cursor-not-allowed disabled:opacity-50',
    selected
      ? 'border-primary bg-primary/15 text-primary'
      : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted/40',
  );

function OptionsControl({
  id,
  labelId,
  ariaLabel,
  describedBy,
  prop,
  value,
  onChange,
  options,
  mode,
  locked,
  boxCls,
  placeholder,
  required,
}: ControlProps & {
  options: AttrOption[];
  mode: OptionMode;
  locked: boolean;
  boxCls: string;
  placeholder: string;
}) {
  const strVal = toStr(value);
  const groupA11y = {
    'aria-labelledby': ariaLabel ? undefined : labelId,
    'aria-label': ariaLabel,
    'aria-describedby': describedBy,
  };

  if (mode === 'multi-pills' || mode === 'checkbox-group') {
    const selected = new Set(splitMulti(value));
    const toggle = (v: string) => {
      const next = new Set(selected);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      onChange(joinMulti(options.map((o) => o.value).filter((o) => next.has(o))));
    };
    if (mode === 'checkbox-group') {
      return (
        <div role="group" className="flex flex-wrap gap-x-5 gap-y-2 pt-0.5" {...groupA11y}>
          {options.map((o, i) => (
            <div key={o.value} className="flex items-center gap-2">
              <Checkbox
                id={`${id}-${i}`}
                checked={selected.has(o.value)}
                disabled={locked}
                onCheckedChange={() => toggle(o.value)}
              />
              <Label htmlFor={`${id}-${i}`} className="cursor-pointer text-sm font-normal">
                {o.label}
              </Label>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div role="group" className="flex flex-wrap gap-2 pt-0.5" {...groupA11y}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={selected.has(o.value)}
            disabled={locked}
            onClick={() => toggle(o.value)}
            className={pillCls(selected.has(o.value))}
          >
            {o.label}
          </button>
        ))}
      </div>
    );
  }

  if (mode === 'option-pills') {
    return (
      <div role="group" className="flex flex-wrap gap-2 pt-0.5" {...groupA11y}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={strVal === o.value}
            disabled={locked}
            onClick={() => onChange(strVal === o.value ? '' : o.value)}
            className={pillCls(strVal === o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    );
  }

  if (mode === 'segmented') {
    return (
      <SegmentedControl
        label={ariaLabel ?? prop.label}
        value={strVal || null}
        onChange={(v) => onChange(v)}
        options={options.map((o) => ({ ...o, disabled: locked }))}
      />
    );
  }

  if (mode === 'radio') {
    return (
      <RadioGroup
        value={strVal}
        onValueChange={onChange}
        disabled={locked}
        className="flex flex-wrap gap-x-5 gap-y-2 pt-0.5"
        {...groupA11y}
      >
        {options.map((o, i) => (
          <div key={o.value} className="flex items-center gap-2">
            <RadioGroupItem id={`${id}-${i}`} value={o.value} />
            <Label htmlFor={`${id}-${i}`} className="cursor-pointer text-sm font-normal">
              {o.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    );
  }

  const CLEAR = '__clear__';
  return (
    <Select value={strVal} onValueChange={(v) => onChange(v === CLEAR ? '' : v)} disabled={locked}>
      <SelectTrigger
        id={id}
        className={boxCls}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {!required && strVal && (
          <SelectItem value={CLEAR} className="text-muted-foreground">
            Clear selection
          </SelectItem>
        )}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SliderControl({
  attrs,
  value,
  onChange,
  labelId,
  ariaLabel,
  locked,
}: ControlProps & {
  locked: boolean;
}) {
  const minN = num(attrs['html:min']) ?? 0;
  const maxN = num(attrs['html:max']) ?? 100;
  const stepN = num(attrs['html:step']) ?? 1;
  const raw = toStr(value);
  const current = raw === '' ? minN : Number(raw);
  const prefix = attrs['form:prefix'] ?? '';
  const suffix = attrs['form:suffix'] ?? '';
  const fmt = (n: number) => `${prefix}${n.toLocaleString()}${suffix}`;

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center gap-3">
        <Slider
          min={minN}
          max={maxN}
          step={stepN}
          value={[Number.isFinite(current) ? current : minN]}
          onValueChange={([v]) => onChange(String(v))}
          disabled={locked}
          aria-labelledby={ariaLabel ? undefined : labelId}
          aria-label={ariaLabel}
          className="flex-1"
        />
        <span className="min-w-[3rem] shrink-0 text-right text-sm tabular-nums text-foreground">
          {raw === '' ? '—' : fmt(current)}
        </span>
      </div>
      <div className="flex justify-between text-[10px] tabular-nums text-muted-foreground">
        <span>{fmt(minN)}</span>
        <span>{fmt(maxN)}</span>
      </div>
    </div>
  );
}

function StepperControl({
  id,
  attrs,
  value,
  onChange,
  labelId,
  ariaLabel,
  describedBy,
  locked,
  boxCls,
}: ControlProps & { locked: boolean; boxCls: string }) {
  const stepN = num(attrs['html:step']) ?? 1;
  const minN = num(attrs['html:min']);
  const maxN = num(attrs['html:max']);
  const raw = toStr(value);
  const current = raw === '' ? 0 : Number(raw);
  const clamp = (n: number) => Math.min(maxN ?? Infinity, Math.max(minN ?? -Infinity, n));
  const bump = (dir: 1 | -1) => onChange(String(clamp(current + dir * stepN)));

  return (
    <div className="flex w-fit items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Decrease"
        disabled={locked || (minN !== undefined && current <= minN)}
        onClick={() => bump(-1)}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        id={id}
        type="number"
        value={raw}
        min={minN}
        max={maxN}
        step={stepN}
        disabled={locked}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-20 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          boxCls,
        )}
        aria-labelledby={ariaLabel ? undefined : labelId}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Increase"
        disabled={locked || (maxN !== undefined && current >= maxN)}
        onClick={() => bump(1)}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

function RatingControl({
  attrs,
  value,
  onChange,
  labelId,
  ariaLabel,
  locked,
}: ControlProps & {
  locked: boolean;
}) {
  const scale = Math.max(1, Math.min(10, num(attrs['ui:max']) ?? 5));
  const current = Number(toStr(value)) || 0;
  return (
    <div
      role="group"
      aria-labelledby={ariaLabel ? undefined : labelId}
      aria-label={ariaLabel}
      className="flex items-center gap-0.5 pt-0.5"
    >
      {Array.from({ length: scale }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          disabled={locked}
          aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
          aria-pressed={current === star}
          onClick={() => onChange(current === star ? '' : String(star))}
          className="rounded-sm p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
        >
          <Star
            className={cn(
              'h-6 w-6',
              current >= star
                ? 'fill-warning text-warning'
                : 'text-muted-foreground/30 hover:text-warning/60',
            )}
          />
        </button>
      ))}
      {current > 0 && (
        <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">
          {current}/{scale}
        </span>
      )}
    </div>
  );
}

function SwatchControl({
  value,
  onChange,
  colors,
  labelId,
  ariaLabel,
  locked,
}: ControlProps & { colors: string[]; locked: boolean }) {
  const strVal = toStr(value);
  return (
    <div
      role="group"
      aria-labelledby={ariaLabel ? undefined : labelId}
      aria-label={ariaLabel}
      className="flex flex-wrap gap-2 pt-0.5"
    >
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          aria-pressed={strVal === color}
          aria-label={color}
          disabled={locked}
          onClick={() => onChange(strVal === color ? '' : color)}
          className={cn(
            'flex flex-col items-center gap-1 rounded-lg border-2 p-1.5 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            strVal === color ? 'border-primary' : 'border-transparent hover:border-border',
          )}
        >
          <span
            className="block h-6 w-6 rounded-full border border-border/40"
            style={{ backgroundColor: color }}
          />
          <span className="text-[10px] capitalize leading-none text-muted-foreground">{color}</span>
        </button>
      ))}
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <span key={t} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-foreground">
          {t}
        </span>
      ))}
    </div>
  );
}

function UnitInputs({
  units,
  values,
  onChange,
  locked,
  boxCls,
  ariaLabel,
}: {
  units: { label: string; max?: number }[];
  values: number[];
  onChange: (next: number[]) => void;
  locked: boolean;
  boxCls: string;
  ariaLabel: string;
}) {
  return (
    <div className="flex gap-2">
      {units.map((u, i) => (
        <div key={u.label} className="min-w-0 flex-1">
          <Adorned suffix={u.label}>
            <Input
              type="number"
              min={0}
              max={u.max}
              value={values[i]}
              disabled={locked}
              aria-label={`${ariaLabel} ${u.label}`}
              onChange={(e) => {
                const next = [...values];
                next[i] = Number.parseInt(e.target.value, 10) || 0;
                onChange(next);
              }}
              className={cn('min-w-0 flex-1 rounded-r-none tabular-nums', boxCls)}
            />
          </Adorned>
        </div>
      ))}
    </div>
  );
}

function DurationControl({
  prop,
  value,
  onChange,
  locked,
  boxCls,
}: ControlProps & { locked: boolean; boxCls: string }) {
  const { hours, minutes, seconds } = parseDuration(toStr(value));
  return (
    <UnitInputs
      units={[{ label: 'hr' }, { label: 'min', max: 59 }, { label: 'sec', max: 59 }]}
      values={[hours, minutes, seconds]}
      onChange={([h, m, s]) => onChange(`PT${h}H${m}M${s}S`)}
      locked={locked}
      boxCls={boxCls}
      ariaLabel={prop.label}
    />
  );
}

function PeriodControl({
  prop,
  value,
  onChange,
  locked,
  boxCls,
}: ControlProps & { locked: boolean; boxCls: string }) {
  const { years, months, days } = parsePeriod(toStr(value));
  return (
    <UnitInputs
      units={[{ label: 'yr' }, { label: 'mo' }, { label: 'd' }]}
      values={[years, months, days]}
      onChange={([y, mo, d]) => {
        const parts = [y && `${y}Y`, mo && `${mo}M`, d && `${d}D`].filter(Boolean);
        onChange(parts.length ? `P${parts.join('')}` : 'P0D');
      }}
      locked={locked}
      boxCls={boxCls}
      ariaLabel={prop.label}
    />
  );
}

function FileDrop({
  id,
  value,
  onChange,
  accept,
  disabled,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (v: unknown) => void;
  accept?: string;
  disabled?: boolean;
  describedBy?: string;
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
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-describedby={describedBy}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && !disabled) handleFile(file);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        'relative cursor-pointer rounded-lg border-2 border-dashed transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        disabled && 'cursor-not-allowed opacity-50',
        dragging
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/40 hover:bg-muted/20',
      )}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        tabIndex={-1}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {preview ? (
        <div className="flex items-center gap-3 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt=""
            className="h-16 w-16 shrink-0 rounded-md border border-border object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-foreground">{value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Click or drop to replace</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <Upload className="h-7 w-7 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">
            {dragging ? 'Drop file here' : 'Drag & drop or click to browse'}
          </p>
          {value && <p className="max-w-xs truncate text-xs text-primary">{value}</p>}
          {accept && <p className="text-[10px] text-muted-foreground">{accept}</p>}
        </div>
      )}
    </div>
  );
}
