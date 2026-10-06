import type { PropertyType } from '@repo/api';

export type AttrValueType = 'text' | 'number' | 'select' | 'tags' | 'color';

export type AttrSurface = 'form' | 'list' | 'both';

export interface AttrKeyDef {
  key: string;
  label: string;
  description: string;
  valueType: AttrValueType;
  options?: string[];
  surface: AttrSurface;
  group: 'html' | 'ui' | 'style' | 'form' | 'list';
  block?: string;
  showWhen?: { key: string; equals: string | string[] };
  appliesTo?: PropertyType[];
}

export interface AttrBlockDef {
  name: string;
  label: string;
  surface: AttrSurface;
  trigger?: { key: string; equals: string };
  triggerPropType?: PropertyType;
  keys: string[];
}

export const ATTR_BLOCKS: AttrBlockDef[] = [
  {
    name: 'badge',
    label: 'Badge style',
    surface: 'list',
    trigger: { key: 'list:display', equals: 'badge' },
    keys: ['list:badge.color', 'list:badge.size', 'list:badge.variant'],
  },
  {
    name: 'pill',
    label: 'Pill style',
    surface: 'list',
    trigger: { key: 'list:display', equals: 'pill' },
    keys: ['list:badge.color', 'list:badge.size', 'list:badge.variant'],
  },
  {
    name: 'image',
    label: 'Image display',
    surface: 'list',
    trigger: { key: 'list:display', equals: 'image' },
    keys: ['list:image.size', 'list:image.shape', 'list:image.fit'],
  },
  {
    name: 'price',
    label: 'Price display',
    surface: 'list',
    trigger: { key: 'list:display', equals: 'price' },
    keys: ['list:price.currency', 'list:price.format', 'list:price.size'],
  },
  {
    name: 'composite-layout',
    label: 'Composite layout',
    surface: 'list',
    triggerPropType: 'COMPOSITE_PROPERTY',
    keys: [
      'list:composite.layout',
      'list:composite.columns',
      'list:composite.gap',
      'list:composite.label-width',
    ],
  },
  {
    name: 'list-layout',
    label: 'List layout',
    surface: 'list',
    triggerPropType: 'LIST_PROPERTY',
    keys: ['list:list.layout', 'list:list.item-style'],
  },
  {
    name: 'link',
    label: 'Link display',
    surface: 'list',
    trigger: { key: 'list:display', equals: 'link' },
    keys: ['list:link.label', 'list:link.new-tab'],
  },
  {
    name: 'boolean',
    label: 'Boolean labels',
    surface: 'list',
    trigger: { key: 'list:display', equals: 'boolean' },
    keys: ['list:boolean.true', 'list:boolean.false'],
  },
  {
    name: 'progress',
    label: 'Progress bar',
    surface: 'list',
    trigger: { key: 'list:display', equals: 'progress' },
    keys: ['list:progress.max'],
  },
];

export const ATTRIBUTE_PROTOCOL: AttrKeyDef[] = [
  // ── html ──────────────────────────────────────────────────────────────────
  {
    key: 'html:placeholder',
    surface: 'both',
    group: 'html',
    label: 'Placeholder',
    description: 'Placeholder text shown inside the input',
    valueType: 'text',
  },
  {
    key: 'html:min',
    surface: 'both',
    group: 'html',
    label: 'Min',
    description: 'Minimum numeric value or string length',
    valueType: 'number',
  },
  {
    key: 'html:max',
    surface: 'both',
    group: 'html',
    label: 'Max',
    description: 'Maximum numeric value or string length',
    valueType: 'number',
  },
  {
    key: 'html:step',
    surface: 'both',
    group: 'html',
    label: 'Step',
    description: 'Numeric step increment',
    valueType: 'number',
  },
  {
    key: 'html:pattern',
    surface: 'both',
    group: 'html',
    label: 'Pattern',
    description: 'Regex validation pattern applied to the input',
    valueType: 'text',
  },
  {
    key: 'html:accept',
    surface: 'both',
    group: 'html',
    label: 'Accept',
    description: 'File input MIME filter, e.g. image/* or application/pdf',
    valueType: 'select',
    options: [
      'image/*',
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/rtf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  {
    key: 'html:type',
    surface: 'both',
    group: 'html',
    label: 'Input type',
    description: 'Override the HTML input type',
    valueType: 'select',
    options: ['text', 'email', 'tel', 'url', 'password', 'search', 'number'],
  },
  {
    key: 'html:maxlength',
    surface: 'both',
    group: 'html',
    label: 'Max length',
    description: 'Maximum number of characters for text inputs',
    valueType: 'number',
  },
  {
    key: 'html:autocomplete',
    surface: 'both',
    group: 'html',
    label: 'Autocomplete',
    description: 'Browser autocomplete hint for the input',
    valueType: 'select',
    options: ['off', 'on', 'name', 'email', 'tel', 'url', 'street-address', 'postal-code'],
  },

  // ── ui ────────────────────────────────────────────────────────────────────
  {
    key: 'ui:component',
    surface: 'both',
    group: 'ui',
    label: 'Component',
    description: 'Override the default UI widget for this field',
    valueType: 'select',
    options: [
      'checkbox',
      'toggle',
      'slider',
      'stepper',
      'rating',
      'textarea',
      'tag-input',
      'option-pills',
      'radio',
      'color',
    ],
  },
  {
    key: 'ui:display',
    surface: 'both',
    group: 'ui',
    label: 'Display mode',
    description: 'How the stored value appears in listing/detail views',
    valueType: 'select',
    options: ['text', 'badge', 'color-swatch', 'image-grid', 'icon'],
  },
  {
    key: 'ui:multiline',
    surface: 'both',
    group: 'ui',
    label: 'Multiline',
    description: 'Render a STRING field as a resizable textarea',
    valueType: 'select',
    options: ['true', 'false'],
  },
  {
    key: 'ui:rows',
    surface: 'both',
    group: 'ui',
    label: 'Rows',
    description: 'Row count when ui:multiline or ui:component=textarea',
    valueType: 'number',
  },

  // ── style ─────────────────────────────────────────────────────────────────
  {
    key: 'style:options',
    surface: 'both',
    group: 'style',
    label: 'Options',
    description: 'Comma-separated select options. Format: Label:value or just value',
    valueType: 'tags',
  },
  {
    key: 'style:color-options',
    surface: 'both',
    group: 'style',
    label: 'Color options',
    description: 'Comma-separated color names or hex values shown as clickable swatches',
    valueType: 'tags',
  },

  // ── form ──────────────────────────────────────────────────────────────────
  {
    key: 'form:size',
    surface: 'form',
    group: 'form',
    label: 'Size',
    description: 'Overall size of the input widget',
    valueType: 'select',
    options: ['sm', 'md', 'lg', 'xl'],
  },
  {
    key: 'form:variant',
    surface: 'form',
    group: 'form',
    label: 'Variant',
    description: 'Visual style of the input container',
    valueType: 'select',
    options: ['default', 'outline', 'ghost', 'filled', 'underline'],
  },
  {
    key: 'form:width',
    surface: 'form',
    group: 'form',
    label: 'Width',
    description: 'How wide the input stretches in its container',
    valueType: 'select',
    options: ['full', 'auto', 'fixed'],
  },
  {
    key: 'form:layout',
    surface: 'form',
    group: 'form',
    label: 'Layout',
    description: 'Stack direction of label + input',
    valueType: 'select',
    options: ['vertical', 'horizontal', 'inline'],
  },
  {
    key: 'form:label.position',
    surface: 'form',
    group: 'form',
    label: 'Label position',
    description: 'Where the label appears relative to the input',
    valueType: 'select',
    options: ['top', 'left', 'floating', 'hidden'],
  },
  {
    key: 'form:helper-text',
    surface: 'form',
    group: 'form',
    label: 'Helper text',
    description: 'Small hint line rendered below the field',
    valueType: 'text',
  },
  {
    key: 'form:readonly',
    surface: 'form',
    group: 'form',
    label: 'Read only',
    description: 'Show the field but prevent edits',
    valueType: 'select',
    options: ['true', 'false'],
  },

  // ── list (common) ─────────────────────────────────────────────────────────
  {
    key: 'list:display',
    surface: 'list',
    group: 'list',
    label: 'List display',
    description: 'Primary render mode for the stored value',
    valueType: 'select',
    options: [
      'text',
      'badge',
      'pill',
      'color-swatch',
      'image',
      'icon',
      'price',
      'rating',
      'truncated',
      'link',
      'boolean',
      'progress',
      'monospace',
    ],
  },
  {
    key: 'list:prefix',
    surface: 'list',
    group: 'list',
    label: 'Prefix',
    description: 'Static text prepended to the value',
    valueType: 'text',
  },
  {
    key: 'list:suffix',
    surface: 'list',
    group: 'list',
    label: 'Suffix',
    description: 'Static text appended to the value',
    valueType: 'text',
  },
  {
    key: 'list:truncate',
    surface: 'list',
    group: 'list',
    label: 'Truncate',
    description: 'Max character count (0 = no truncation)',
    valueType: 'number',
  },
  {
    key: 'list:format',
    surface: 'list',
    group: 'list',
    label: 'Format',
    description: 'Value formatting before display',
    valueType: 'select',
    options: ['raw', 'date', 'datetime', 'currency', 'percentage', 'number', 'uppercase', 'lowercase'],
  },
  {
    key: 'list:empty',
    surface: 'list',
    group: 'list',
    label: 'Empty text',
    description: 'Text shown when the stored value is blank',
    valueType: 'text',
  },

  // ── list:badge block ──────────────────────────────────────────────────────
  {
    key: 'list:badge.color',
    surface: 'list',
    group: 'list',
    label: 'Badge color',
    description: 'Background / border color of badge',
    valueType: 'select',
    options: ['primary', 'success', 'warning', 'danger', 'info', 'muted'],
    block: 'badge',
    showWhen: { key: 'list:display', equals: ['badge', 'pill'] },
  },
  {
    key: 'list:badge.size',
    surface: 'list',
    group: 'list',
    label: 'Badge size',
    description: 'Badge size',
    valueType: 'select',
    options: ['sm', 'md', 'lg'],
    block: 'badge',
    showWhen: { key: 'list:display', equals: ['badge', 'pill'] },
  },
  {
    key: 'list:badge.variant',
    surface: 'list',
    group: 'list',
    label: 'Badge variant',
    description: 'Fill style of the badge',
    valueType: 'select',
    options: ['solid', 'outline', 'soft'],
    block: 'badge',
    showWhen: { key: 'list:display', equals: ['badge', 'pill'] },
  },

  // ── list:image block ──────────────────────────────────────────────────────
  {
    key: 'list:image.size',
    surface: 'list',
    group: 'list',
    label: 'Image size',
    description: 'Rendered size of the image',
    valueType: 'select',
    options: ['xs', 'sm', 'md', 'lg', 'full'],
    block: 'image',
    showWhen: { key: 'list:display', equals: 'image' },
  },
  {
    key: 'list:image.shape',
    surface: 'list',
    group: 'list',
    label: 'Image shape',
    description: 'Corner radius / crop shape',
    valueType: 'select',
    options: ['square', 'rounded', 'circle'],
    block: 'image',
    showWhen: { key: 'list:display', equals: 'image' },
  },
  {
    key: 'list:image.fit',
    surface: 'list',
    group: 'list',
    label: 'Image fit',
    description: 'CSS object-fit applied to the image',
    valueType: 'select',
    options: ['cover', 'contain', 'fill'],
    block: 'image',
    showWhen: { key: 'list:display', equals: 'image' },
  },

  // ── list:price block ──────────────────────────────────────────────────────
  {
    key: 'list:price.currency',
    surface: 'list',
    group: 'list',
    label: 'Price currency',
    description: 'Currency to show alongside the value',
    valueType: 'select',
    options: ['USD', 'GBP', 'EUR', 'INR', 'custom'],
    block: 'price',
    showWhen: { key: 'list:display', equals: 'price' },
  },
  {
    key: 'list:price.format',
    surface: 'list',
    group: 'list',
    label: 'Price format',
    description: 'How the currency identifier is rendered',
    valueType: 'select',
    options: ['symbol', 'code', 'name'],
    block: 'price',
    showWhen: { key: 'list:display', equals: 'price' },
  },
  {
    key: 'list:price.size',
    surface: 'list',
    group: 'list',
    label: 'Price size',
    description: 'Text size of the price display',
    valueType: 'select',
    options: ['sm', 'md', 'lg'],
    block: 'price',
    showWhen: { key: 'list:display', equals: 'price' },
  },

  // ── list:composite block (type-triggered) ──────────────────────────────────
  {
    key: 'list:composite.layout',
    surface: 'list',
    group: 'list',
    label: 'Composite layout',
    description: 'How composite renders in listing view',
    valueType: 'select',
    options: ['table', 'inline', 'card', 'grid', 'definition', 'hidden'],
    block: 'composite-layout',
    appliesTo: ['COMPOSITE_PROPERTY'],
  },
  {
    key: 'list:composite.columns',
    surface: 'list',
    group: 'list',
    label: 'Grid columns',
    description: 'Number of columns for grid layout',
    valueType: 'number',
    block: 'composite-layout',
    appliesTo: ['COMPOSITE_PROPERTY'],
  },
  {
    key: 'list:composite.gap',
    surface: 'list',
    group: 'list',
    label: 'Gap',
    description: 'Spacing between items',
    valueType: 'select',
    options: ['tight', 'normal', 'loose'],
    block: 'composite-layout',
    appliesTo: ['COMPOSITE_PROPERTY'],
  },
  {
    key: 'list:composite.label-width',
    surface: 'list',
    group: 'list',
    label: 'Label width',
    description: 'Fixed label width (Tailwind class, e.g. w-32)',
    valueType: 'text',
    block: 'composite-layout',
    appliesTo: ['COMPOSITE_PROPERTY'],
  },

  // ── list:list block (type-triggered for LIST/SET) ──────────────────────────
  {
    key: 'list:list.layout',
    surface: 'list',
    group: 'list',
    label: 'List layout',
    description: 'How list items render',
    valueType: 'select',
    options: ['cards', 'table', 'inline', 'compact'],
    block: 'list-layout',
    appliesTo: ['LIST_PROPERTY'],
  },
  {
    key: 'list:list.item-style',
    surface: 'list',
    group: 'list',
    label: 'Item style',
    description: 'Item border / card style',
    valueType: 'select',
    options: ['flat', 'card', 'bordered', 'separated'],
    block: 'list-layout',
    appliesTo: ['LIST_PROPERTY'],
  },

  {
    key: 'list:link.label',
    surface: 'list',
    group: 'list',
    label: 'Link label',
    description: 'Visible text. The stored value is the URL. Leave blank to show the URL.',
    valueType: 'text',
    block: 'link',
    showWhen: { key: 'list:display', equals: 'link' },
  },
  {
    key: 'list:link.new-tab',
    surface: 'list',
    group: 'list',
    label: 'Open in new tab',
    description: 'Open the link in a new browser tab',
    valueType: 'select',
    options: ['true', 'false'],
    block: 'link',
    showWhen: { key: 'list:display', equals: 'link' },
  },
  {
    key: 'list:boolean.true',
    surface: 'list',
    group: 'list',
    label: 'True label',
    description: 'Text shown when the value is true',
    valueType: 'text',
    block: 'boolean',
    showWhen: { key: 'list:display', equals: 'boolean' },
  },
  {
    key: 'list:boolean.false',
    surface: 'list',
    group: 'list',
    label: 'False label',
    description: 'Text shown when the value is false',
    valueType: 'text',
    block: 'boolean',
    showWhen: { key: 'list:display', equals: 'boolean' },
  },
  {
    key: 'list:progress.max',
    surface: 'list',
    group: 'list',
    label: 'Progress max',
    description: 'Value that represents 100% on the bar',
    valueType: 'number',
    block: 'progress',
    showWhen: { key: 'list:display', equals: 'progress' },
  },
];

export const ATTR_PROTOCOL_MAP: Record<string, AttrKeyDef> = Object.fromEntries(
  ATTRIBUTE_PROTOCOL.map((d) => [d.key, d]),
);

export const ATTR_GROUPS = ['html', 'ui', 'style', 'form', 'list'] as const;
export type AttrGroup = (typeof ATTR_GROUPS)[number];

export function showWhenMatches(
  showWhen: { key: string; equals: string | string[] } | undefined,
  attrs: Record<string, string> | undefined,
): boolean {
  if (!showWhen) return true;
  const actual = attrs?.[showWhen.key];
  return Array.isArray(showWhen.equals)
    ? showWhen.equals.includes(actual ?? '')
    : actual === showWhen.equals;
}

export function resolveAttrs(
  attrs: Record<string, string> | undefined,
  surface: AttrSurface,
  propType?: PropertyType,
): Record<string, string> {
  if (!attrs) return {};
  const out: Record<string, string> = {};
  for (const def of ATTRIBUTE_PROTOCOL) {
    if (def.surface !== 'both' && def.surface !== surface) continue;
    if (def.appliesTo && propType && !def.appliesTo.includes(propType)) continue;
    if (!showWhenMatches(def.showWhen, attrs)) continue;
    if (def.key in attrs) out[def.key] = attrs[def.key]!;
  }
  return out;
}

export function isBlockActive(
  blockName: string,
  attrs: Record<string, string>,
  propType?: PropertyType,
): boolean {
  const block = ATTR_BLOCKS.find((b) => b.name === blockName);
  if (!block) return false;
  if (block.trigger && attrs[block.trigger.key] === block.trigger.equals) return true;
  if (block.triggerPropType && propType === block.triggerPropType) return true;
  return false;
}
