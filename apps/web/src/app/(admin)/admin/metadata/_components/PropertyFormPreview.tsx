'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@repo/ui';
import type { PropertyDef } from '@repo/api';
import { AttrField } from '@/components/common/attributes/AttrField';
import { AttrPropertySections } from '@/components/common/attributes/AttrValue';
import {
  isListType,
  joinMulti,
  parseList,
  parseOptions,
  resolveDataType,
} from '@/lib/attributes/values';

interface PropertyFormPreviewProps {
  properties: PropertyDef[];
  initialValues?: Record<string, unknown>;
  disabled?: boolean;
}

// ── Dummy value generation ────────────────────────────────────────────────────

function dummyScalar(prop: PropertyDef): unknown {
  const attrs = prop.attributes ?? {};
  const component = attrs['ui:component'];
  const options = parseOptions(attrs['style:options']);
  if (options) {
    const multi =
      component === 'multi-pills' ||
      component === 'checkbox-group' ||
      attrs['list:display'] === 'tags';
    return multi ? joinMulti(options.slice(0, 2).map((o) => o.value)) : options[0]!.value;
  }
  const colors = parseList(attrs['style:color-options']);
  if (colors.length) return colors[0];

  const display = attrs['list:display'];
  if (component === 'rating' || display === 'rating') return '4';
  if (component === 'tag-input' || display === 'tags') return 'Sample,Preview,Demo';
  if (display === 'link') return 'https://example.com';
  if (display === 'email') return 'hello@example.com';
  if (display === 'phone') return '+91 98765 43210';
  if (display === 'progress') return '65';
  if (display === 'price') return '139900';
  if (display === 'image' || display === 'image-grid') return '';
  if (component === 'slider') {
    const min = Number(attrs['html:min'] ?? 0);
    const max = Number(attrs['html:max'] ?? 100);
    return String(Math.round((min + max) / 2));
  }

  switch (resolveDataType(prop.dataType)) {
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
    case 'DURATION':
      return 'PT1H30M0S';
    case 'PERIOD':
      return 'P1Y2M';
    case 'COORDINATES':
      return { latitude: 28.6139, longitude: 77.209 };
    case 'ADDRESS':
      return {
        country: 'India',
        pinCode: '110001',
        area: 'Connaught Place',
        city: 'New Delhi',
        state: 'Delhi',
        addressLine1: 'Sample Building',
        addressLine2: 'Sample Street',
        landmark: 'Near Sample Mall',
        coordinates: { latitude: 28.6139, longitude: 77.209 },
      };
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
  if (isListType(prop.type)) {
    const children = prop.value ?? [];
    if (children.length === 0) {
      const first = dummyScalar(prop);
      return [first, typeof first === 'string' ? `${first} 2` : first];
    }
    return [1, 2].map(() => {
      const item: Record<string, unknown> = {};
      for (const child of children) item[child.name] = dummyValue(child);
      return item;
    });
  }
  return dummyScalar(prop);
}

export function generateDummyValues(properties: PropertyDef[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const p of properties) out[p.name] = dummyValue(p);
  return out;
}

// ── Form preview ──────────────────────────────────────────────────────────────

export function PropertyFormPreview({
  properties,
  initialValues,
  disabled,
}: PropertyFormPreviewProps) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues ?? {});

  if (properties.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
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
            Interactive preview. Fill in fields to test rendering.
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

      <div className="space-y-5 rounded-lg border border-border bg-muted/20 p-4">
        {properties.map((prop) => (
          <AttrField
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

// ── Listing view preview ──────────────────────────────────────────────────────
// Uses the same renderer as the listing detail page, with generated sample values.

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
      <div className="py-12 text-center text-sm text-muted-foreground">
        Add properties in the Build tab to see the listing view preview here.
      </div>
    );
  }

  const values = generateDummyValues(properties);

  // A component renders inside a listing as one composite section.
  const defs: PropertyDef[] = asComposite
    ? [
        {
          type: 'COMPOSITE_PROPERTY',
          name: '__component',
          label: title || 'Component',
          dataType: 'STRING',
          value: properties,
        },
      ]
    : properties;
  const sectionValues = asComposite ? { __component: values } : values;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {asComposite
          ? 'How this component appears inside a listing detail page'
          : 'How this data appears on the listing detail page'}
      </p>
      <AttrPropertySections
        defs={defs}
        values={sectionValues}
        title={asComposite ? undefined : title}
      />
    </div>
  );
}
