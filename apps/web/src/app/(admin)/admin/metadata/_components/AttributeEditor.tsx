'use client';

import { useState } from 'react';
import { Info, Trash2 } from 'lucide-react';
import type { PropertyType } from '@repo/api';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  cn,
} from '@repo/ui';
import Tip from '@/components/common/admin/Tip';
import {
  ATTRIBUTE_PROTOCOL,
  ATTR_GROUPS,
  ATTR_PROTOCOL_MAP,
  inactiveReason,
  keyAppliesTo,
} from '@/lib/attributes/protocol';

const CUSTOM = '__custom__';
const NONE = '__none__';

interface AttributeEditorProps {
  attrKey: string;
  attrValue: string;
  propType: PropertyType;
  /** All attributes on the property, to evaluate showWhen conditions. */
  attrs: Record<string, string>;
  /** Keys used by other rows (can't be picked twice). */
  usedKeys: Set<string>;
  onKeyChange: (newKey: string) => void;
  onValueChange: (newValue: string) => void;
  onRemove: () => void;
}

export function AttributeEditor({
  attrKey,
  attrValue,
  propType,
  attrs,
  usedKeys,
  onKeyChange,
  onValueChange,
  onRemove,
}: AttributeEditorProps) {
  const def = attrKey ? ATTR_PROTOCOL_MAP[attrKey] : undefined;
  const [customMode, setCustomMode] = useState(attrKey !== '' && !def);
  const reason = inactiveReason(attrKey, attrs, propType);
  const duplicate = customMode && attrKey !== '' && usedKeys.has(attrKey);

  const groups = ATTR_GROUPS.map((group) => ({
    group,
    defs: ATTRIBUTE_PROTOCOL.filter((d) => d.group === group && keyAppliesTo(d, propType)),
  })).filter((g) => g.defs.length > 0);
  const listed = def && keyAppliesTo(def, propType);

  const keyControl = customMode ? (
    <Input
      value={attrKey}
      placeholder="namespace:key"
      aria-label="Custom attribute key"
      onChange={(e) => onKeyChange(e.target.value.trim())}
      onBlur={() => {
        if (attrKey && ATTR_PROTOCOL_MAP[attrKey]) setCustomMode(false);
      }}
      className={cn(
        'h-8 min-w-0 flex-1 font-mono text-xs md:text-xs',
        duplicate && 'border-destructive',
      )}
    />
  ) : (
    <Select
      value={attrKey}
      onValueChange={(v) => {
        if (v === CUSTOM) {
          setCustomMode(true);
          onKeyChange('');
        } else onKeyChange(v);
      }}
    >
      <SelectTrigger aria-label="Attribute key" className="h-8 min-w-0 flex-1 font-mono text-xs">
        <SelectValue placeholder="Select key…" />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        {def && !listed && (
          <SelectGroup>
            <SelectLabel>Not applicable</SelectLabel>
            <SelectItem value={def.key} className="font-mono text-xs">
              {def.key}
            </SelectItem>
          </SelectGroup>
        )}
        {groups.map(({ group, defs }) => (
          <SelectGroup key={group}>
            <SelectLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {group}
            </SelectLabel>
            {defs.map((d) => (
              <SelectItem
                key={d.key}
                value={d.key}
                disabled={d.key !== attrKey && usedKeys.has(d.key)}
                className="font-mono text-xs"
              >
                {d.key}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
        <SelectGroup>
          <SelectLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
            other
          </SelectLabel>
          <SelectItem value={CUSTOM} className="text-xs">
            Custom key…
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );

  const choices =
    def?.valueType === 'boolean'
      ? ['true', 'false']
      : def?.valueType === 'select'
        ? def.options
        : null;

  const valueControl = choices ? (
    <Select value={attrValue} onValueChange={(v) => onValueChange(v === NONE ? '' : v)}>
      <SelectTrigger aria-label={`Value for ${attrKey}`} className="h-8 min-w-0 flex-1 text-xs">
        <SelectValue placeholder="Select…" />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        {attrValue && !choices.includes(attrValue) && (
          <SelectItem value={attrValue} className="text-xs">
            {attrValue} (current)
          </SelectItem>
        )}
        {choices.map((o) => (
          <SelectItem key={o} value={o} className="text-xs">
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : (
    <Input
      type={def?.valueType === 'number' ? 'number' : 'text'}
      value={attrValue}
      aria-label={attrKey ? `Value for ${attrKey}` : 'Attribute value'}
      placeholder={
        def?.valueType === 'tags' ? 'val1,val2,val3' : def?.valueType === 'number' ? '0' : 'value'
      }
      onChange={(e) => onValueChange(e.target.value)}
      className="h-8 min-w-0 flex-1 text-xs md:text-xs"
    />
  );

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {keyControl}
        <span className="shrink-0 text-xs text-muted-foreground" aria-hidden>
          →
        </span>
        {valueControl}
        {def ? (
          <Tip label={`${def.label}: ${def.description}`}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground"
              aria-label={`About ${def.key}`}
            >
              <Info className="h-3.5 w-3.5" />
            </Button>
          </Tip>
        ) : (
          <span className="w-8 shrink-0" />
        )}
        <Tip label="Remove attribute">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            aria-label={`Remove ${attrKey || 'attribute'}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </Tip>
      </div>
      {(reason || duplicate) && (
        <p
          className={cn(
            'pl-1 text-[11px]',
            duplicate ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {duplicate ? 'This key is already used on this property' : reason}
        </p>
      )}
    </div>
  );
}
