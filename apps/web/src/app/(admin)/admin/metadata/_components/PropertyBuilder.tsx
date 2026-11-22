'use client';

import { useState } from 'react';
import { Plus, Puzzle } from 'lucide-react';
import { Button } from '@oxneer/ui';
import type { PropertyDef } from '@oxneer/api';
import { PropertyRow } from './PropertyRow';
import { emptyProperty, sanitizeProperties } from './types';
import { ComponentPicker } from './ComponentPicker';
import type { KV } from './types';

export type { KV };

interface PropertyBuilderProps {
  properties: PropertyDef[];
  onChange: (props: PropertyDef[]) => void;
  propertyTypes?: KV[]; // kept for API compat, not used (PROPERTY_TYPES is internal)
  dataTypes: KV[];
}

export function PropertyBuilder({ properties, onChange, dataTypes }: PropertyBuilderProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const update = (i: number, patch: Partial<PropertyDef>) =>
    onChange(sanitizeProperties(properties.map((p, idx) => (idx === i ? { ...p, ...patch } : p))));

  const remove = (i: number) =>
    onChange(sanitizeProperties(properties.filter((_, idx) => idx !== i)));

  const move = (i: number, dir: -1 | 1) => {
    const arr = [...properties];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
    onChange(sanitizeProperties(arr));
  };

  return (
    <div className="space-y-2">
      {properties.map((prop, i) => (
        <PropertyRow
          key={i}
          prop={prop}
          index={i}
          total={properties.length}
          depth={0}
          dataTypes={dataTypes}
          onUpdate={(patch) => update(i, patch)}
          onRemove={() => remove(i)}
          onMove={(dir) => move(i, dir)}
        />
      ))}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...properties, emptyProperty(dataTypes)])}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add property
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPickerOpen(true)}
          className="text-violet-600 border-violet-200 hover:bg-violet-50 hover:text-violet-700 dark:text-violet-400 dark:border-violet-800 dark:hover:bg-violet-950"
        >
          <Puzzle className="h-4 w-4 mr-1" />
          Insert component
        </Button>
      </div>

      <ComponentPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onInsert={(inserted) => {
          onChange(sanitizeProperties([...properties, ...inserted]));
        }}
      />
    </div>
  );
}
