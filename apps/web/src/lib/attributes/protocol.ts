import type { PropertyType } from '@repo/api';

/**
 * Attribute protocol: every `namespace:key` a property attribute can hold, which
 * surface reads it (form input vs. listing display), and when it applies.
 * See ATTRIBUTE_PROTOCOL.md at the repo root for the full guide.
 */

export type AttrValueType = 'text' | 'number' | 'select' | 'tags' | 'boolean';
export type AttrSurface = 'form' | 'list' | 'both';
export type AttrGroup = 'html' | 'ui' | 'style' | 'form' | 'list';

export interface AttrShowWhen {
  key: string;
  equals: string | string[];
}

export interface AttrKeyDef {
  key: string;
  label: string;
  description: string;
  valueType: AttrValueType;
  options?: string[];
  surface: AttrSurface;
  group: AttrGroup;
  /** Only active while a sibling attribute has one of these values. */
  showWhen?: AttrShowWhen;
  /** Only valid on these property types. Omitted = every type. */
  appliesTo?: PropertyType[];
}

const SCALAR: PropertyType[] = ['SIMPLE_PROPERTY', 'COMPLEX_PROPERTY'];
const LISTS: PropertyType[] = ['LIST_PROPERTY', 'SET_PROPERTY'];
/** Leaf-value keys also apply to lists without child properties (each item is a scalar). */
const LEAF: PropertyType[] = [...SCALAR, ...LISTS];
const COMPOSITE: PropertyType[] = ['COMPOSITE_PROPERTY'];
const CONTAINERS: PropertyType[] = [...COMPOSITE, ...LISTS];

/** Lucide icons available to `list:composite.icon` (kebab-case names). */
export const SECTION_ICONS = [
  'info',
  'monitor',
  'smartphone',
  'camera',
  'battery',
  'cpu',
  'hard-drive',
  'wifi',
  'ruler',
  'package',
  'truck',
  'shield',
  'zap',
  'palette',
  'settings',
  'tag',
  'calendar',
  'map-pin',
  'file-text',
  'image',
  'car',
  'home',
  'star',
  'wrench',
] as const;

export const ATTRIBUTE_PROTOCOL: AttrKeyDef[] = [
  // ── html ──────────────────────────────────────────────────────────────────
  {
    key: 'html:placeholder',
    surface: 'both',
    group: 'html',
    label: 'Placeholder',
    description: 'Placeholder text shown inside the input',
    valueType: 'text',
    appliesTo: LEAF,
  },
  {
    key: 'html:min',
    surface: 'both',
    group: 'html',
    label: 'Min',
    description: 'Minimum value (numbers, sliders, years) or minimum length (text)',
    valueType: 'number',
    appliesTo: LEAF,
  },
  {
    key: 'html:max',
    surface: 'both',
    group: 'html',
    label: 'Max',
    description: 'Maximum value (numbers, sliders, years) or maximum length (text)',
    valueType: 'number',
    appliesTo: LEAF,
  },
  {
    key: 'html:step',
    surface: 'both',
    group: 'html',
    label: 'Step',
    description: 'Increment for number inputs, steppers and sliders',
    valueType: 'number',
    appliesTo: LEAF,
  },
  {
    key: 'html:pattern',
    surface: 'both',
    group: 'html',
    label: 'Pattern',
    description: 'Regex the text input must match',
    valueType: 'text',
    appliesTo: LEAF,
  },
  {
    key: 'html:maxlength',
    surface: 'both',
    group: 'html',
    label: 'Max length',
    description: 'Maximum number of characters for text inputs',
    valueType: 'number',
    appliesTo: LEAF,
  },
  {
    key: 'html:accept',
    surface: 'both',
    group: 'html',
    label: 'Accept',
    description: 'File input MIME filter',
    valueType: 'select',
    options: [
      'image/*',
      'video/*',
      'audio/*',
      'text/plain',
      'text/csv',
      'application/pdf',
      'application/msword',
      'application/rtf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    appliesTo: LEAF,
  },
  {
    key: 'html:type',
    surface: 'both',
    group: 'html',
    label: 'Input type',
    description: 'Override the HTML input type of a text field',
    valueType: 'select',
    options: ['text', 'email', 'tel', 'url', 'password', 'search'],
    appliesTo: LEAF,
  },
  {
    key: 'html:inputmode',
    surface: 'both',
    group: 'html',
    label: 'Input mode',
    description: 'Virtual keyboard hint on mobile',
    valueType: 'select',
    options: ['text', 'numeric', 'decimal', 'tel', 'email', 'url', 'search'],
    appliesTo: LEAF,
  },
  {
    key: 'html:autocomplete',
    surface: 'both',
    group: 'html',
    label: 'Autocomplete',
    description: 'Browser autocomplete hint',
    valueType: 'select',
    options: ['off', 'on', 'name', 'email', 'tel', 'url', 'street-address', 'postal-code'],
    appliesTo: LEAF,
  },

  // ── ui ────────────────────────────────────────────────────────────────────
  {
    key: 'ui:component',
    surface: 'both',
    group: 'ui',
    label: 'Component',
    description: 'Override the default input widget for this field',
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
      'multi-pills',
      'checkbox-group',
      'radio',
      'segmented',
      'select',
      'color',
    ],
    appliesTo: LEAF,
  },
  {
    key: 'ui:display',
    surface: 'both',
    group: 'ui',
    label: 'Display mode (legacy)',
    description: 'Legacy display hint. Prefer list:display.',
    valueType: 'select',
    options: ['text', 'badge', 'color-swatch', 'image-grid', 'icon'],
    appliesTo: LEAF,
  },
  {
    key: 'ui:multiline',
    surface: 'both',
    group: 'ui',
    label: 'Multiline',
    description: 'Render a text field as a textarea',
    valueType: 'boolean',
    appliesTo: LEAF,
  },
  {
    key: 'ui:rows',
    surface: 'both',
    group: 'ui',
    label: 'Rows',
    description: 'Textarea height in rows (default 3)',
    valueType: 'number',
    appliesTo: LEAF,
  },
  {
    key: 'ui:max',
    surface: 'both',
    group: 'ui',
    label: 'Rating scale',
    description: 'Number of stars (default 5)',
    valueType: 'number',
    showWhen: { key: 'ui:component', equals: 'rating' },
    appliesTo: LEAF,
  },

  // ── style ─────────────────────────────────────────────────────────────────
  {
    key: 'style:options',
    surface: 'both',
    group: 'style',
    label: 'Options',
    description:
      'Comma-separated choices: "Label:value" or "value". Escape a literal comma or colon with a backslash.',
    valueType: 'tags',
    appliesTo: LEAF,
  },
  {
    key: 'style:color-options',
    surface: 'both',
    group: 'style',
    label: 'Color options',
    description: 'Comma-separated color names or hex values shown as swatches',
    valueType: 'tags',
    appliesTo: LEAF,
  },

  // ── form: field ───────────────────────────────────────────────────────────
  {
    key: 'form:size',
    surface: 'form',
    group: 'form',
    label: 'Size',
    description: 'Input size (height, padding, font size)',
    valueType: 'select',
    options: ['sm', 'md', 'lg', 'xl'],
    appliesTo: LEAF,
  },
  {
    key: 'form:variant',
    surface: 'form',
    group: 'form',
    label: 'Variant',
    description: 'Visual style of the input container',
    valueType: 'select',
    options: ['default', 'outline', 'ghost', 'filled', 'underline'],
    appliesTo: LEAF,
  },
  {
    key: 'form:width',
    surface: 'form',
    group: 'form',
    label: 'Width',
    description: 'How wide the input stretches',
    valueType: 'select',
    options: ['full', 'half', 'auto', 'fixed'],
    appliesTo: LEAF,
  },
  {
    key: 'form:layout',
    surface: 'form',
    group: 'form',
    label: 'Layout',
    description: 'Label and input arrangement',
    valueType: 'select',
    options: ['vertical', 'horizontal', 'inline'],
    appliesTo: LEAF,
  },
  {
    key: 'form:label.position',
    surface: 'form',
    group: 'form',
    label: 'Label position',
    description: 'top = above, left = beside, hidden = screen-reader only',
    valueType: 'select',
    options: ['top', 'left', 'hidden'],
    appliesTo: LEAF,
  },
  {
    key: 'form:helper-text',
    surface: 'form',
    group: 'form',
    label: 'Helper text',
    description: 'Hint shown below the field (or below a section header)',
    valueType: 'text',
  },
  {
    key: 'form:prefix',
    surface: 'form',
    group: 'form',
    label: 'Input prefix',
    description: 'Static text before the input, e.g. ₹ or https://',
    valueType: 'text',
    appliesTo: LEAF,
  },
  {
    key: 'form:suffix',
    surface: 'form',
    group: 'form',
    label: 'Input suffix',
    description: 'Static text after the input, e.g. kg or %',
    valueType: 'text',
    appliesTo: LEAF,
  },
  {
    key: 'form:show-count',
    surface: 'form',
    group: 'form',
    label: 'Character count',
    description: 'Show a character counter (uses html:maxlength as the limit)',
    valueType: 'boolean',
    appliesTo: LEAF,
  },
  {
    key: 'form:readonly',
    surface: 'form',
    group: 'form',
    label: 'Read only',
    description: 'Show the field but prevent edits',
    valueType: 'boolean',
  },

  // ── form: composite / list sections ───────────────────────────────────────
  {
    key: 'form:columns',
    surface: 'form',
    group: 'form',
    label: 'Columns',
    description: 'Lay child fields out in 1–4 columns (from md up)',
    valueType: 'select',
    options: ['1', '2', '3', '4'],
    appliesTo: COMPOSITE,
  },
  {
    key: 'form:collapsible',
    surface: 'form',
    group: 'form',
    label: 'Collapsible',
    description: 'Let the section collapse. "collapsed" starts it closed.',
    valueType: 'select',
    options: ['false', 'true', 'collapsed'],
    appliesTo: CONTAINERS,
  },
  {
    key: 'form:min-items',
    surface: 'form',
    group: 'form',
    label: 'Min items',
    description: 'Items that cannot be removed below this count',
    valueType: 'number',
    appliesTo: LISTS,
  },
  {
    key: 'form:max-items',
    surface: 'form',
    group: 'form',
    label: 'Max items',
    description: 'Disable "Add" once this many items exist',
    valueType: 'number',
    appliesTo: LISTS,
  },
  {
    key: 'form:add-label',
    surface: 'form',
    group: 'form',
    label: 'Add button label',
    description: 'Text of the add button (default "Add item")',
    valueType: 'text',
    appliesTo: LISTS,
  },
  {
    key: 'form:item-label',
    surface: 'form',
    group: 'form',
    label: 'Item title',
    description: 'Item header template. {n} = position, {field} = a child value, e.g. "{name}"',
    valueType: 'text',
    appliesTo: LISTS,
  },

  // ── list: common ──────────────────────────────────────────────────────────
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
      'tags',
      'options',
      'color-swatch',
      'image',
      'image-grid',
      'icon',
      'price',
      'rating',
      'truncated',
      'multiline',
      'link',
      'email',
      'phone',
      'boolean',
      'progress',
      'monospace',
    ],
    appliesTo: LEAF,
  },
  {
    key: 'list:prefix',
    surface: 'list',
    group: 'list',
    label: 'Prefix',
    description: 'Static text before the value',
    valueType: 'text',
    appliesTo: LEAF,
  },
  {
    key: 'list:suffix',
    surface: 'list',
    group: 'list',
    label: 'Suffix',
    description: 'Static text after the value',
    valueType: 'text',
    appliesTo: LEAF,
  },
  {
    key: 'list:truncate',
    surface: 'list',
    group: 'list',
    label: 'Truncate',
    description: 'Max characters before "…" (0 = never)',
    valueType: 'number',
    appliesTo: LEAF,
  },
  {
    key: 'list:format',
    surface: 'list',
    group: 'list',
    label: 'Format',
    description: 'Formatting applied to the raw value',
    valueType: 'select',
    options: [
      'raw',
      'number',
      'compact',
      'currency',
      'percentage',
      'bytes',
      'date',
      'datetime',
      'time',
      'relative',
      'uppercase',
      'lowercase',
      'capitalize',
    ],
    appliesTo: LEAF,
  },
  {
    key: 'list:decimals',
    surface: 'list',
    group: 'list',
    label: 'Decimals',
    description: 'Fraction digits for number, currency, percentage and price',
    valueType: 'number',
    appliesTo: LEAF,
  },
  {
    key: 'list:empty',
    surface: 'list',
    group: 'list',
    label: 'Empty text',
    description: 'Shown when the value is blank (default "—")',
    valueType: 'text',
  },
  {
    key: 'list:hidden',
    surface: 'list',
    group: 'list',
    label: 'Hide in listing',
    description: 'Collect the value in the form but never show it in the listing',
    valueType: 'boolean',
  },
  {
    key: 'list:span',
    surface: 'list',
    group: 'list',
    label: 'Span',
    description: 'Take the full row instead of one column',
    valueType: 'select',
    options: ['auto', 'full'],
  },
  {
    key: 'list:hide-label',
    surface: 'list',
    group: 'list',
    label: 'Hide label',
    description: 'Show the value without its label',
    valueType: 'boolean',
  },

  // ── list: badge / pill ────────────────────────────────────────────────────
  {
    key: 'list:badge.color',
    surface: 'list',
    group: 'list',
    label: 'Badge color',
    description: 'Tone used for every value (see color-map for per-value tones)',
    valueType: 'select',
    options: ['primary', 'success', 'warning', 'danger', 'info', 'muted'],
    showWhen: { key: 'list:display', equals: ['badge', 'pill', 'tags'] },
    appliesTo: LEAF,
  },
  {
    key: 'list:badge.color-map',
    surface: 'list',
    group: 'list',
    label: 'Badge color map',
    description: 'Per-value tones, e.g. "active:success,pending:warning,inactive:danger"',
    valueType: 'tags',
    showWhen: { key: 'list:display', equals: ['badge', 'pill', 'tags'] },
    appliesTo: LEAF,
  },
  {
    key: 'list:badge.size',
    surface: 'list',
    group: 'list',
    label: 'Badge size',
    description: 'Badge size',
    valueType: 'select',
    options: ['sm', 'md', 'lg'],
    showWhen: { key: 'list:display', equals: ['badge', 'pill', 'tags'] },
    appliesTo: LEAF,
  },
  {
    key: 'list:badge.variant',
    surface: 'list',
    group: 'list',
    label: 'Badge variant',
    description: 'Fill style',
    valueType: 'select',
    options: ['soft', 'solid', 'outline'],
    showWhen: { key: 'list:display', equals: ['badge', 'pill', 'tags'] },
    appliesTo: LEAF,
  },
  {
    key: 'list:badge.dot',
    surface: 'list',
    group: 'list',
    label: 'Badge dot',
    description: 'Leading status dot',
    valueType: 'boolean',
    showWhen: { key: 'list:display', equals: ['badge', 'pill'] },
    appliesTo: LEAF,
  },

  // ── list: image ───────────────────────────────────────────────────────────
  {
    key: 'list:image.size',
    surface: 'list',
    group: 'list',
    label: 'Image size',
    description: 'Rendered size',
    valueType: 'select',
    options: ['xs', 'sm', 'md', 'lg', 'xl', 'full'],
    showWhen: { key: 'list:display', equals: ['image', 'image-grid'] },
    appliesTo: LEAF,
  },
  {
    key: 'list:image.shape',
    surface: 'list',
    group: 'list',
    label: 'Image shape',
    description: 'Corner radius',
    valueType: 'select',
    options: ['square', 'rounded', 'circle'],
    showWhen: { key: 'list:display', equals: ['image', 'image-grid'] },
    appliesTo: LEAF,
  },
  {
    key: 'list:image.fit',
    surface: 'list',
    group: 'list',
    label: 'Image fit',
    description: 'CSS object-fit',
    valueType: 'select',
    options: ['cover', 'contain', 'fill'],
    showWhen: { key: 'list:display', equals: ['image', 'image-grid'] },
    appliesTo: LEAF,
  },

  // ── list: price ───────────────────────────────────────────────────────────
  {
    key: 'list:price.currency',
    surface: 'list',
    group: 'list',
    label: 'Price currency',
    description:
      'ISO currency for list:display=price and list:format=currency. "custom" shows the number only; add list:prefix / list:suffix.',
    valueType: 'select',
    options: ['INR', 'USD', 'EUR', 'GBP', 'AED', 'AUD', 'CAD', 'SGD', 'JPY', 'custom'],
    appliesTo: LEAF,
  },
  {
    key: 'list:price.format',
    surface: 'list',
    group: 'list',
    label: 'Price format',
    description: 'symbol = ₹1,000 · code = INR 1,000 · name = 1,000 Indian rupees',
    valueType: 'select',
    options: ['symbol', 'code', 'name'],
    showWhen: { key: 'list:display', equals: 'price' },
    appliesTo: LEAF,
  },
  {
    key: 'list:price.size',
    surface: 'list',
    group: 'list',
    label: 'Price size',
    description: 'Text size',
    valueType: 'select',
    options: ['sm', 'md', 'lg', 'xl'],
    showWhen: { key: 'list:display', equals: 'price' },
    appliesTo: LEAF,
  },

  // ── list: rating ──────────────────────────────────────────────────────────
  {
    key: 'list:rating.max',
    surface: 'list',
    group: 'list',
    label: 'Rating scale',
    description: 'Number of stars (default ui:max or 5)',
    valueType: 'number',
    showWhen: { key: 'list:display', equals: 'rating' },
    appliesTo: LEAF,
  },

  // ── list: color swatch ────────────────────────────────────────────────────
  {
    key: 'list:swatch.show-all',
    surface: 'list',
    group: 'list',
    label: 'Show all swatches',
    description: 'Show every color option with the stored one highlighted (default true)',
    valueType: 'boolean',
    showWhen: { key: 'list:display', equals: 'color-swatch' },
    appliesTo: LEAF,
  },

  // ── list: link ────────────────────────────────────────────────────────────
  {
    key: 'list:link.label',
    surface: 'list',
    group: 'list',
    label: 'Link label',
    description: 'Visible text. The stored value is the URL. Blank = show the URL.',
    valueType: 'text',
    showWhen: { key: 'list:display', equals: 'link' },
    appliesTo: LEAF,
  },
  {
    key: 'list:link.new-tab',
    surface: 'list',
    group: 'list',
    label: 'Open in new tab',
    description: 'Default true',
    valueType: 'boolean',
    showWhen: { key: 'list:display', equals: 'link' },
    appliesTo: LEAF,
  },

  // ── list: boolean ─────────────────────────────────────────────────────────
  {
    key: 'list:boolean.true',
    surface: 'list',
    group: 'list',
    label: 'True label',
    description: 'Default "Yes"',
    valueType: 'text',
    showWhen: { key: 'list:display', equals: 'boolean' },
    appliesTo: LEAF,
  },
  {
    key: 'list:boolean.false',
    surface: 'list',
    group: 'list',
    label: 'False label',
    description: 'Default "No"',
    valueType: 'text',
    showWhen: { key: 'list:display', equals: 'boolean' },
    appliesTo: LEAF,
  },
  {
    key: 'list:boolean.style',
    surface: 'list',
    group: 'list',
    label: 'Boolean style',
    description: 'icon = ✓/✕ with label, badge = tinted pill, text = label only',
    valueType: 'select',
    options: ['icon', 'badge', 'text'],
    showWhen: { key: 'list:display', equals: 'boolean' },
    appliesTo: LEAF,
  },

  // ── list: progress ────────────────────────────────────────────────────────
  {
    key: 'list:progress.max',
    surface: 'list',
    group: 'list',
    label: 'Progress max',
    description: 'Value that fills the bar (default 100)',
    valueType: 'number',
    showWhen: { key: 'list:display', equals: 'progress' },
    appliesTo: LEAF,
  },
  {
    key: 'list:progress.label',
    surface: 'list',
    group: 'list',
    label: 'Progress label',
    description: 'percent = 40%, value = 40 / 100, none = bar only',
    valueType: 'select',
    options: ['percent', 'value', 'none'],
    showWhen: { key: 'list:display', equals: 'progress' },
    appliesTo: LEAF,
  },

  // ── list: composite (type-triggered) ──────────────────────────────────────
  {
    key: 'list:composite.layout',
    surface: 'list',
    group: 'list',
    label: 'Composite layout',
    description: 'How child fields are arranged',
    valueType: 'select',
    options: ['table', 'definition', 'grid', 'card', 'inline', 'hidden'],
    appliesTo: COMPOSITE,
  },
  {
    key: 'list:composite.columns',
    surface: 'list',
    group: 'list',
    label: 'Grid columns',
    description: 'Columns for grid / card layout (1–6, default 2)',
    valueType: 'select',
    options: ['1', '2', '3', '4', '5', '6'],
    appliesTo: COMPOSITE,
  },
  {
    key: 'list:composite.gap',
    surface: 'list',
    group: 'list',
    label: 'Gap',
    description: 'Spacing between children',
    valueType: 'select',
    options: ['tight', 'normal', 'loose'],
    appliesTo: COMPOSITE,
  },
  {
    key: 'list:composite.label-width',
    surface: 'list',
    group: 'list',
    label: 'Label width',
    description: 'Label column width for table / definition layout',
    valueType: 'select',
    options: ['sm', 'md', 'lg', 'xl'],
    appliesTo: COMPOSITE,
  },
  {
    key: 'list:composite.icon',
    surface: 'list',
    group: 'list',
    label: 'Section icon',
    description: 'Icon in the section header',
    valueType: 'select',
    options: [...SECTION_ICONS],
    appliesTo: COMPOSITE,
  },
  {
    key: 'list:composite.show-empty',
    surface: 'list',
    group: 'list',
    label: 'Show empty fields',
    description: 'Show blank children as "—" (default true)',
    valueType: 'boolean',
    appliesTo: COMPOSITE,
  },

  // ── list: list / set (type-triggered) ─────────────────────────────────────
  {
    key: 'list:list.layout',
    surface: 'list',
    group: 'list',
    label: 'List layout',
    description: 'How items are arranged',
    valueType: 'select',
    options: ['cards', 'table', 'inline', 'compact', 'bullets', 'numbered'],
    appliesTo: LISTS,
  },
  {
    key: 'list:list.item-style',
    surface: 'list',
    group: 'list',
    label: 'Item style',
    description: 'Item border / background for cards and compact layouts',
    valueType: 'select',
    options: ['flat', 'card', 'bordered', 'separated'],
    appliesTo: LISTS,
  },
];

export const ATTR_PROTOCOL_MAP: Record<string, AttrKeyDef> = Object.fromEntries(
  ATTRIBUTE_PROTOCOL.map((d) => [d.key, d]),
);

export const ATTR_GROUPS: readonly AttrGroup[] = ['html', 'ui', 'style', 'form', 'list'];

export function showWhenMatches(
  showWhen: AttrShowWhen | undefined,
  attrs: Record<string, string> | undefined,
): boolean {
  if (!showWhen) return true;
  const actual = attrs?.[showWhen.key] ?? '';
  return Array.isArray(showWhen.equals)
    ? showWhen.equals.includes(actual)
    : actual === showWhen.equals;
}

export function keyAppliesTo(def: AttrKeyDef, propType: PropertyType | undefined): boolean {
  return !def.appliesTo || !propType || def.appliesTo.includes(propType);
}

/**
 * Attributes a surface should honour: protocol keys for that surface (or `both`) that
 * apply to the property type and whose `showWhen` condition holds. Unknown keys are dropped.
 */
export function resolveAttrs(
  attrs: Record<string, string> | undefined,
  surface: Exclude<AttrSurface, 'both'>,
  propType?: PropertyType,
): Record<string, string> {
  if (!attrs) return {};
  const out: Record<string, string> = {};
  for (const def of ATTRIBUTE_PROTOCOL) {
    if (def.surface !== 'both' && def.surface !== surface) continue;
    if (!keyAppliesTo(def, propType)) continue;
    if (!showWhenMatches(def.showWhen, attrs)) continue;
    const v = attrs[def.key];
    if (v !== undefined && v !== '') out[def.key] = v;
  }
  return out;
}

/** Why a stored attribute is currently ignored, or null when it is active. */
export function inactiveReason(
  key: string,
  attrs: Record<string, string> | undefined,
  propType: PropertyType | undefined,
): string | null {
  const def = ATTR_PROTOCOL_MAP[key];
  if (!def) return key ? 'Custom key: not read by the renderers' : null;
  if (!keyAppliesTo(def, propType)) return 'Does not apply to this property type';
  if (!showWhenMatches(def.showWhen, attrs)) {
    const eq = def.showWhen!.equals;
    return `Active when ${def.showWhen!.key} = ${Array.isArray(eq) ? eq.join(' / ') : eq}`;
  }
  return null;
}
