'use client';

import type { ReactNode } from 'react';
import {
  Battery,
  Calendar,
  Camera,
  Car,
  CheckCircle2,
  Cpu,
  ExternalLink,
  FileText,
  HardDrive,
  Home,
  Image as ImageIcon,
  Info,
  MapPin,
  Monitor,
  Package,
  Palette,
  Ruler,
  Settings,
  Shield,
  Smartphone,
  Star,
  Tag,
  Truck,
  Wifi,
  Wrench,
  XCircle,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@repo/ui';
import type { PropertyDef, PropertyType } from '@repo/api';
import { ICON_REGISTRY } from '@/components/common/iconRegistry';
import { resolveAttrs } from '@/lib/attributes/protocol';
import {
  formatByDataType,
  formatPrice,
  formatValue,
  isEmptyValue,
  isListType,
  optionLabel,
  parseList,
  parseOptions,
  parseToneMap,
  resolveDataType,
  safeHref,
  splitMulti,
  truncate,
  type AttrOption,
  type AttrTone,
} from '@/lib/attributes/values';

/**
 * Renders stored property values for the listing view, driven by `list:*` attributes
 * (plus `style:*` / `ui:*` hints). Used by the listing detail page and the template previews.
 */

const LUCIDE_ICONS: Record<string, LucideIcon> = {
  info: Info,
  monitor: Monitor,
  smartphone: Smartphone,
  camera: Camera,
  battery: Battery,
  cpu: Cpu,
  'hard-drive': HardDrive,
  wifi: Wifi,
  ruler: Ruler,
  package: Package,
  truck: Truck,
  shield: Shield,
  zap: Zap,
  palette: Palette,
  settings: Settings,
  tag: Tag,
  calendar: Calendar,
  'map-pin': MapPin,
  'file-text': FileText,
  image: ImageIcon,
  car: Car,
  home: Home,
  star: Star,
  wrench: Wrench,
};

function num(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function listAttrsOf(def: PropertyDef | undefined): Record<string, string> {
  return resolveAttrs(def?.attributes, 'list', def?.type);
}

function isHidden(def: PropertyDef): boolean {
  return listAttrsOf(def)['list:hidden'] === 'true';
}

function Empty({ text }: { text?: string }) {
  return <span className="text-sm text-muted-foreground">{text || '—'}</span>;
}

// ── Public API ───────────────────────────────────────────────────────────────

export function AttrValue({ def, value }: { def?: PropertyDef; value: unknown }) {
  const attrs = listAttrsOf(def);
  if (def?.type === 'COMPOSITE_PROPERTY')
    return <CompositeView def={def} value={value} attrs={attrs} />;
  if (isListType(def?.type) || (!def && Array.isArray(value)))
    return <ListView def={def} value={value} attrs={attrs} />;
  if (isEmptyValue(value)) return <Empty text={attrs['list:empty']} />;
  return <ScalarValue def={def} value={value} attrs={attrs} />;
}

/**
 * Listing detail layout: leaf fields in a two-column card, then one section per composite.
 * Values are keyed by property name (see `embeddedToValues`).
 */
export function AttrPropertySections({
  defs,
  values,
  title,
}: {
  defs: PropertyDef[];
  values: Record<string, unknown>;
  title?: string;
}) {
  const visible = defs.filter((d) => !isHidden(d));
  const fields = visible.filter((d) => d.type !== 'COMPOSITE_PROPERTY');
  const sections = visible.filter(
    (d) => d.type === 'COMPOSITE_PROPERTY' && listAttrsOf(d)['list:composite.layout'] !== 'hidden',
  );
  if (!fields.length && !sections.length) return null;

  return (
    <div className="space-y-4">
      {fields.length > 0 && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          {title && (
            <h2 className="border-b border-border pb-2 text-sm font-semibold text-foreground">
              {title}
            </h2>
          )}
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {fields.map((def) => (
              <FieldBlock key={def.name} def={def} value={values[def.name]} />
            ))}
          </div>
        </div>
      )}

      {sections.map((def) => (
        <CompositeSection key={def.name} def={def} value={values[def.name]} />
      ))}
    </div>
  );
}

function spansFullRow(def: PropertyDef): boolean {
  const attrs = listAttrsOf(def);
  if (attrs['list:span'] === 'full') return true;
  if (attrs['list:span'] === 'auto') return false;
  if (isListType(def.type) && (def.value?.length ?? 0) > 0) return true;
  const raw = def.attributes ?? {};
  return (
    raw['ui:multiline'] === 'true' ||
    raw['ui:component'] === 'textarea' ||
    attrs['list:display'] === 'multiline' ||
    attrs['list:display'] === 'image-grid'
  );
}

function FieldBlock({ def, value }: { def: PropertyDef; value: unknown }) {
  const hideLabel = listAttrsOf(def)['list:hide-label'] === 'true';
  return (
    <div className={cn('min-w-0', spansFullRow(def) && 'sm:col-span-2')}>
      <p className={cn('mb-1 text-xs font-medium text-muted-foreground', hideLabel && 'sr-only')}>
        {def.label}
      </p>
      <AttrValue def={def} value={value} />
    </div>
  );
}

function CompositeSection({ def, value }: { def: PropertyDef; value: unknown }) {
  const attrs = listAttrsOf(def);
  const Icon = attrs['list:composite.icon'] ? LUCIDE_ICONS[attrs['list:composite.icon']] : null;
  const obj = asRecord(value);
  const filled = (def.value ?? []).filter((c) => !isHidden(c) && !isEmptyValue(obj[c.name])).length;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-5 py-3">
        {Icon && (
          <span className="rounded-lg bg-primary/10 p-1.5 text-primary">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <h3 className="text-sm font-semibold text-foreground">{def.label}</h3>
        <span className="text-xs text-muted-foreground">
          · {filled} {filled === 1 ? 'field' : 'fields'}
        </span>
      </div>
      <CompositeView def={def} value={value} attrs={attrs} bare />
    </section>
  );
}

// ── Composite ────────────────────────────────────────────────────────────────

const LABEL_WIDTH: Record<string, string> = {
  sm: 'sm:w-24',
  md: 'sm:w-32',
  lg: 'sm:w-40',
  xl: 'sm:w-48',
  // legacy free-form Tailwind classes
  'w-20': 'sm:w-20',
  'w-24': 'sm:w-24',
  'w-28': 'sm:w-28',
  'w-32': 'sm:w-32',
  'w-36': 'sm:w-36',
  'w-40': 'sm:w-40',
  'w-44': 'sm:w-44',
  'w-48': 'sm:w-48',
};

const GAP: Record<string, string> = {
  tight: 'gap-2',
  normal: 'gap-3',
  loose: 'gap-5',
};

const GRID_COLUMNS: Record<string, string> = {
  '1': '',
  '2': 'sm:grid-cols-2',
  '3': 'sm:grid-cols-2 lg:grid-cols-3',
  '4': 'sm:grid-cols-2 lg:grid-cols-4',
  '5': 'sm:grid-cols-3 lg:grid-cols-5',
  '6': 'sm:grid-cols-3 lg:grid-cols-6',
};

function compositeChildren(def: PropertyDef, value: unknown): PropertyDef[] {
  if (def.value?.length) return def.value;
  // No definition (e.g. the managed type failed to load): derive from the stored keys.
  return Object.keys(asRecord(value)).map((name) => ({
    type: 'SIMPLE_PROPERTY' as PropertyType,
    name,
    label: name,
    dataType: 'STRING' as PropertyDef['dataType'],
  }));
}

function CompositeView({
  def,
  value,
  attrs,
  bare,
}: {
  def: PropertyDef;
  value: unknown;
  attrs: Record<string, string>;
  /** Inside a section card: no outer border, section padding. */
  bare?: boolean;
}) {
  const layout = attrs['list:composite.layout'] ?? 'table';
  if (layout === 'hidden') return null;

  const obj = asRecord(value);
  const showEmpty = attrs['list:composite.show-empty'] !== 'false';
  const children = compositeChildren(def, value).filter(
    (c) => !isHidden(c) && (showEmpty || !isEmptyValue(obj[c.name])),
  );
  if (!children.length) {
    return (
      <div className={cn(bare && 'px-5 py-3')}>
        <Empty text={attrs['list:empty']} />
      </div>
    );
  }

  const labelW = LABEL_WIDTH[attrs['list:composite.label-width'] ?? 'md'] ?? LABEL_WIDTH.md;
  const gap = GAP[attrs['list:composite.gap'] ?? 'normal'] ?? GAP.normal;
  const childLabel = (c: PropertyDef) =>
    listAttrsOf(c)['list:hide-label'] === 'true' ? null : c.label;

  if (layout === 'inline') {
    return (
      <p
        className={cn('flex flex-wrap items-baseline gap-x-1 gap-y-1 text-sm', bare && 'px-5 py-3')}
      >
        {children
          .filter((c) => !isEmptyValue(obj[c.name]))
          .map((c, i) => (
            <span key={c.name} className="inline-flex items-baseline gap-1">
              {i > 0 && (
                <span className="text-muted-foreground" aria-hidden>
                  ·
                </span>
              )}
              {childLabel(c) && (
                <span className="font-medium text-muted-foreground">{childLabel(c)}:</span>
              )}
              <AttrValue def={c} value={obj[c.name]} />
            </span>
          ))}
      </p>
    );
  }

  if (layout === 'grid' || layout === 'card') {
    const cols = GRID_COLUMNS[attrs['list:composite.columns'] ?? '2'] ?? GRID_COLUMNS['2'];
    return (
      <div className={cn('grid grid-cols-1', cols, gap, bare && 'p-5')}>
        {children.map((c) => (
          <div
            key={c.name}
            className={cn(
              'min-w-0 space-y-1',
              layout === 'card' && 'rounded-lg border border-border/60 bg-muted/20 p-3',
              (c.type === 'COMPOSITE_PROPERTY' || isListType(c.type)) && 'col-span-full',
            )}
          >
            {childLabel(c) && (
              <span className="block text-xs font-medium text-muted-foreground">
                {childLabel(c)}
              </span>
            )}
            <AttrValue def={c} value={obj[c.name]} />
          </div>
        ))}
      </div>
    );
  }

  if (layout === 'definition') {
    return (
      <dl className={cn('space-y-2', bare && 'px-5 py-3')}>
        {children.map((c) => (
          <div
            key={c.name}
            className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3"
          >
            <dt className={cn('text-xs font-medium text-muted-foreground sm:shrink-0', labelW)}>
              {childLabel(c)}
            </dt>
            <dd className="min-w-0 flex-1">
              <AttrValue def={c} value={obj[c.name]} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  // table (default)
  return (
    <dl
      className={cn(
        'divide-y divide-border/50',
        !bare && 'overflow-hidden rounded-lg border border-border/60',
      )}
    >
      {children.map((c) => (
        <div
          key={c.name}
          className={cn(
            'flex flex-col gap-0.5 transition-colors hover:bg-muted/20 sm:flex-row sm:items-start sm:gap-4',
            bare ? 'px-5 py-2.5' : 'px-3 py-2',
          )}
        >
          <dt
            className={cn(
              'text-xs font-medium text-muted-foreground sm:shrink-0 sm:pt-0.5',
              labelW,
            )}
          >
            {childLabel(c)}
          </dt>
          <dd className="min-w-0 flex-1">
            <AttrValue def={c} value={obj[c.name]} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

// ── List / set ───────────────────────────────────────────────────────────────

const ITEM_STYLE: Record<string, string> = {
  flat: '',
  card: 'rounded-lg bg-muted/30 p-3',
  bordered: 'rounded-lg border border-border/60 p-3',
  separated: 'py-2 first:pt-0 last:pb-0',
};

function ListView({
  def,
  value,
  attrs,
}: {
  def?: PropertyDef;
  value: unknown;
  attrs: Record<string, string>;
}) {
  const items = (Array.isArray(value) ? value : isEmptyValue(value) ? [] : [value]).filter(
    (v) => !isEmptyValue(v),
  );
  if (!items.length) return <Empty text={attrs['list:empty']} />;

  const children = (def?.value ?? []).filter((c) => !isHidden(c));
  const hasChildren = children.length > 0;
  const layout = attrs['list:list.layout'] ?? (hasChildren ? 'cards' : 'inline');
  const itemStyle = attrs['list:list.item-style'] ?? (hasChildren ? 'bordered' : 'flat');
  // Each scalar item renders with the list's own leaf attributes.
  const itemDef: PropertyDef | undefined = def
    ? { ...def, type: 'COMPLEX_PROPERTY', value: undefined }
    : undefined;
  const itemAttrs = listAttrsOf(itemDef);

  const renderScalar = (item: unknown, chip: boolean) => {
    if (chip && !itemAttrs['list:display']) {
      return (
        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs text-foreground">
          <AttrValue def={itemDef} value={item} />
        </span>
      );
    }
    return <AttrValue def={itemDef} value={item} />;
  };

  const renderFields = (item: unknown, inline: boolean) => {
    const rec = asRecord(item);
    if (inline) {
      return (
        <span className="inline-flex flex-wrap items-baseline gap-x-1">
          {children
            .filter((c) => !isEmptyValue(rec[c.name]))
            .map((c, i) => (
              <span key={c.name} className="inline-flex items-baseline gap-1">
                {i > 0 && (
                  <span className="text-muted-foreground" aria-hidden>
                    ·
                  </span>
                )}
                <span className="text-muted-foreground">{c.label}:</span>
                <AttrValue def={c} value={rec[c.name]} />
              </span>
            ))}
        </span>
      );
    }
    return (
      <dl className="space-y-1.5">
        {children.map((c) => (
          <div
            key={c.name}
            className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2"
          >
            <dt className="text-xs text-muted-foreground sm:w-28 sm:shrink-0">{c.label}</dt>
            <dd className="min-w-0 flex-1">
              <AttrValue def={c} value={rec[c.name]} />
            </dd>
          </div>
        ))}
      </dl>
    );
  };

  const renderItem = (item: unknown, inline = false, chip = false) =>
    hasChildren && typeof item === 'object' ? renderFields(item, inline) : renderScalar(item, chip);

  if (layout === 'table' && hasChildren) {
    return (
      <>
        <div className="hidden overflow-x-auto rounded-lg border border-border/60 sm:block">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                {children.map((c) => (
                  <th
                    key={c.name}
                    scope="col"
                    className="px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {items.map((item, i) => (
                <tr key={i}>
                  {children.map((c) => (
                    <td key={c.name} className="px-3 py-2 align-top">
                      <AttrValue def={c} value={asRecord(item)[c.name]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-2 sm:hidden">
          {items.map((item, i) => (
            <div key={i} className={ITEM_STYLE.bordered}>
              {renderFields(item, false)}
            </div>
          ))}
        </div>
      </>
    );
  }

  if (layout === 'bullets' || layout === 'numbered') {
    const ListTag = layout === 'numbered' ? 'ol' : 'ul';
    return (
      <ListTag
        className={cn(
          'space-y-1 pl-5 text-sm marker:text-muted-foreground',
          layout === 'numbered' ? 'list-decimal' : 'list-disc',
        )}
      >
        {items.map((item, i) => (
          <li key={i}>{renderItem(item, true)}</li>
        ))}
      </ListTag>
    );
  }

  if (layout === 'inline') {
    return (
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={i} className="min-w-0">
            {renderItem(item, true, true)}
          </span>
        ))}
      </div>
    );
  }

  // cards / compact
  return (
    <div
      className={cn(
        layout === 'compact' ? 'space-y-1' : 'space-y-2',
        itemStyle === 'separated' && 'space-y-0 divide-y divide-border/50',
      )}
    >
      {items.map((item, i) => (
        <div key={i} className={cn('min-w-0', ITEM_STYLE[itemStyle])}>
          {renderItem(item, layout === 'compact')}
        </div>
      ))}
    </div>
  );
}

// ── Scalar ───────────────────────────────────────────────────────────────────

const SOFT: Record<AttrTone, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
  muted: 'bg-muted text-muted-foreground',
};

const SOLID: Record<AttrTone, string> = {
  primary: 'bg-primary text-primary-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
  danger: 'bg-destructive text-destructive-foreground',
  info: 'bg-info text-info-foreground',
  muted: 'bg-secondary text-secondary-foreground',
};

const OUTLINE: Record<AttrTone, string> = {
  primary: 'border-primary/50 text-primary',
  success: 'border-success/50 text-success',
  warning: 'border-warning/50 text-warning',
  danger: 'border-destructive/50 text-destructive',
  info: 'border-info/50 text-info',
  muted: 'border-border text-muted-foreground',
};

const BADGE_SIZE: Record<string, string> = {
  sm: 'h-5 px-1.5 text-[10px]',
  md: 'h-[22px] px-2.5 text-xs',
  lg: 'h-7 px-3 text-sm',
};

const IMAGE_SIZE: Record<string, string> = {
  xs: 'h-8 w-8',
  sm: 'h-12 w-12',
  md: 'h-16 w-16',
  lg: 'h-24 w-24',
  xl: 'h-40 w-40',
  full: 'h-auto w-full',
};

const IMAGE_SHAPE: Record<string, string> = {
  square: 'rounded-none',
  rounded: 'rounded-md',
  circle: 'rounded-full',
};

const IMAGE_FIT: Record<string, string> = {
  cover: 'object-cover',
  contain: 'object-contain',
  fill: 'object-fill',
};

const PRICE_SIZE: Record<string, string> = {
  sm: 'text-sm font-medium',
  md: 'text-base font-semibold',
  lg: 'text-xl font-semibold',
  xl: 'font-display text-2xl font-semibold',
};

const TRUTHY = new Set(['true', '1', 'yes', 'y', 'on']);

function inferDisplay(
  attrs: Record<string, string>,
  dataType: string,
  options: AttrOption[] | null,
  colors: string[],
): string {
  const component = attrs['ui:component'];
  if (component === 'rating') return 'rating';
  if (component === 'tag-input' || component === 'multi-pills' || component === 'checkbox-group')
    return 'tags';
  if (component === 'option-pills' && options) return 'options';
  if (colors.length) return 'color-swatch';
  if (dataType === 'BOOLEAN') return 'boolean';
  if (attrs['ui:multiline'] === 'true' || component === 'textarea') return 'multiline';
  return 'text';
}

function ScalarValue({
  def,
  value,
  attrs,
}: {
  def?: PropertyDef;
  value: unknown;
  attrs: Record<string, string>;
}) {
  const dataType = resolveDataType(def?.dataType as unknown);
  const options = parseOptions(attrs['style:options']);
  const colors = parseList(attrs['style:color-options']);
  const display =
    attrs['list:display'] || attrs['ui:display'] || inferDisplay(attrs, dataType, options, colors);
  const decimals = num(attrs['list:decimals']);
  const currency = attrs['list:price.currency'];
  const raw = typeof value === 'object' ? '' : String(value);

  /** Option label → list:format → list:truncate. */
  const text = (v: string, max = num(attrs['list:truncate'])) =>
    truncate(
      formatValue(optionLabel(v, options), attrs['list:format'], {
        decimals,
        currency: currency === 'custom' ? undefined : currency,
      }),
      max,
    );

  const affix = (content: ReactNode) => {
    const prefix = attrs['list:prefix'];
    const suffix = attrs['list:suffix'];
    if (!prefix && !suffix) return content;
    return (
      <span className="inline-flex items-baseline gap-0.5">
        {prefix && <span className="text-muted-foreground">{prefix}</span>}
        {content}
        {suffix && <span className="text-muted-foreground">{suffix}</span>}
      </span>
    );
  };

  // Structured data types (address, coordinates, duration, …) unless a display overrides them.
  if (display === 'text' && !attrs['list:format']) {
    const structured = formatByDataType(dataType, value);
    if (structured !== null)
      return affix(<span className="text-sm text-foreground">{structured}</span>);
  }
  if (typeof value === 'object') {
    return (
      <span className="text-sm text-foreground">{formatByDataType(dataType, value) ?? '—'}</span>
    );
  }

  switch (display) {
    case 'badge':
    case 'pill':
    case 'tags': {
      const values = display === 'tags' ? splitMulti(value) : [raw];
      const toneMap = parseToneMap(attrs['list:badge.color-map']);
      const fallback =
        (attrs['list:badge.color'] as AttrTone | undefined) ??
        (display === 'tags' ? 'muted' : 'primary');
      const variant = attrs['list:badge.variant'] ?? 'soft';
      const palette = variant === 'solid' ? SOLID : variant === 'outline' ? OUTLINE : SOFT;
      const dot = attrs['list:badge.dot'] === 'true';
      return (
        <span className="inline-flex flex-wrap gap-1.5">
          {values.map((v) => {
            const tone = toneMap[v] ?? (SOFT[fallback] ? fallback : 'primary');
            return (
              <span
                key={v}
                className={cn(
                  'inline-flex items-center gap-1.5 whitespace-nowrap border font-semibold',
                  display === 'badge' ? 'rounded-md' : 'rounded-full',
                  variant === 'outline' ? 'bg-transparent' : 'border-transparent',
                  BADGE_SIZE[attrs['list:badge.size'] ?? 'md'] ?? BADGE_SIZE.md,
                  palette[tone],
                )}
              >
                {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
                {attrs['list:prefix']}
                {text(v)}
                {attrs['list:suffix']}
              </span>
            );
          })}
        </span>
      );
    }

    case 'options': {
      if (!options) break;
      const selected = new Set(splitMulti(value));
      return (
        <span className="inline-flex flex-wrap gap-1.5">
          {options.map((o) => (
            <span
              key={o.value}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium',
                selected.has(o.value)
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border text-muted-foreground',
              )}
            >
              {selected.has(o.value) && <span className="sr-only">Selected: </span>}
              {o.label}
            </span>
          ))}
        </span>
      );
    }

    case 'color-swatch': {
      const showAll = colors.length > 0 && attrs['list:swatch.show-all'] !== 'false';
      const swatches = showAll ? colors : [raw];
      return (
        <span className="inline-flex flex-wrap gap-2">
          {swatches.map((color) => {
            const selected = color === raw;
            return (
              <span
                key={color}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg border-2 p-1',
                  showAll && (selected ? 'border-primary' : 'border-transparent opacity-50'),
                  !showAll && 'border-transparent',
                )}
              >
                <span
                  className="block h-5 w-5 rounded-full border border-border/40"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
                <span className="text-xs capitalize text-muted-foreground">
                  {showAll && selected && <span className="sr-only">Selected: </span>}
                  {color}
                </span>
              </span>
            );
          })}
        </span>
      );
    }

    case 'image':
    case 'image-grid': {
      const srcs = (display === 'image-grid' ? splitMulti(value) : [raw]).filter(
        (s) => safeHref(s) || s.startsWith('data:image/'),
      );
      if (!srcs.length) return <span className="text-sm text-foreground">{raw}</span>;
      const cls = cn(
        'border border-border/40 bg-muted',
        IMAGE_SIZE[attrs['list:image.size'] ?? 'md'] ?? IMAGE_SIZE.md,
        IMAGE_SHAPE[attrs['list:image.shape'] ?? 'rounded'] ?? IMAGE_SHAPE.rounded,
        IMAGE_FIT[attrs['list:image.fit'] ?? 'cover'] ?? IMAGE_FIT.cover,
      );
      return (
        <span className="flex flex-wrap gap-2">
          {srcs.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src + i}
              src={src.startsWith('data:') ? src : safeHref(src)!}
              alt={def?.label ?? ''}
              loading="lazy"
              className={cls}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ))}
        </span>
      );
    }

    case 'icon': {
      const Lucide = LUCIDE_ICONS[raw];
      const ReactIcon = ICON_REGISTRY[raw];
      const Icon = Lucide ?? ReactIcon;
      return Icon ? (
        <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
          <Icon className="h-5 w-5" aria-hidden />
          <span className="sr-only">{raw}</span>
        </span>
      ) : (
        <span className="text-sm text-foreground">{raw}</span>
      );
    }

    case 'price':
      return affix(
        <span
          className={cn(
            'tabular-nums text-foreground',
            PRICE_SIZE[attrs['list:price.size'] ?? 'md'] ?? PRICE_SIZE.md,
          )}
        >
          {formatPrice(raw, {
            currency: currency ?? 'USD',
            display: attrs['list:price.format'],
            decimals,
          })}
        </span>,
      );

    case 'rating': {
      const scale = Math.max(
        1,
        Math.min(10, num(attrs['list:rating.max']) ?? num(attrs['ui:max']) ?? 5),
      );
      const n = Math.max(0, Math.min(scale, Math.round(Number(raw) || 0)));
      return (
        <span className="inline-flex items-center gap-0.5" aria-label={`${n} out of ${scale}`}>
          {Array.from({ length: scale }, (_, i) => (
            <Star
              key={i}
              aria-hidden
              className={cn(
                'h-4 w-4',
                i < n ? 'fill-warning text-warning' : 'text-muted-foreground/30',
              )}
            />
          ))}
          <span className="ml-1 text-sm tabular-nums text-muted-foreground" aria-hidden>
            {n}/{scale}
          </span>
        </span>
      );
    }

    case 'link':
    case 'email':
    case 'phone': {
      const href =
        display === 'email'
          ? `mailto:${raw.trim()}`
          : display === 'phone'
            ? `tel:${raw.replace(/[^\d+]/g, '')}`
            : safeHref(raw);
      if (!href) return <span className="text-sm text-foreground">{raw}</span>;
      const newTab = display === 'link' && attrs['list:link.new-tab'] !== 'false';
      const label = (display === 'link' && attrs['list:link.label']) || text(raw);
      return affix(
        <a
          href={href}
          target={newTab ? '_blank' : undefined}
          rel={newTab ? 'noopener noreferrer' : undefined}
          className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {label}
          {newTab && <ExternalLink className="h-3 w-3" aria-hidden />}
          {newTab && <span className="sr-only">(opens in a new tab)</span>}
        </a>,
      );
    }

    case 'boolean': {
      const on = TRUTHY.has(raw.trim().toLowerCase());
      const label = on ? attrs['list:boolean.true'] || 'Yes' : attrs['list:boolean.false'] || 'No';
      const style = attrs['list:boolean.style'] ?? 'icon';
      if (style === 'text') return <span className="text-sm text-foreground">{label}</span>;
      if (style === 'badge') {
        return (
          <span
            className={cn(
              'inline-flex h-[22px] items-center rounded-full px-2.5 text-xs font-semibold',
              on ? SOFT.success : SOFT.muted,
            )}
          >
            {label}
          </span>
        );
      }
      const Icon = on ? CheckCircle2 : XCircle;
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 text-sm',
            on ? 'font-medium text-success' : 'text-muted-foreground',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
          {label}
        </span>
      );
    }

    case 'progress': {
      const max = num(attrs['list:progress.max']) || 100;
      const n = Number(raw);
      const pct = Number.isFinite(n) ? Math.max(0, Math.min(100, (n / max) * 100)) : 0;
      const labelMode = attrs['list:progress.label'] ?? 'percent';
      return (
        <span className="flex min-w-[8rem] items-center gap-2">
          <span
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={Number.isFinite(n) ? n : 0}
            aria-label={def?.label}
            className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
          >
            <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </span>
          {labelMode !== 'none' && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {labelMode === 'value' ? `${raw} / ${max}` : `${Math.round(pct)}%`}
            </span>
          )}
        </span>
      );
    }

    case 'monospace':
      return affix(<span className="font-mono text-sm text-foreground">{text(raw)}</span>);

    case 'multiline':
      return affix(
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{text(raw)}</p>,
      );

    case 'truncated': {
      const short = text(raw, num(attrs['list:truncate']) ?? 80);
      return affix(
        <span className="text-sm text-foreground" title={short !== raw ? raw : undefined}>
          {short}
        </span>,
      );
    }
  }

  const shown = text(raw);
  return affix(
    <span className="text-sm text-foreground" title={shown.endsWith('…') ? raw : undefined}>
      {shown}
    </span>,
  );
}
