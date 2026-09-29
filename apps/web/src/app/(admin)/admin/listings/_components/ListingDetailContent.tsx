'use client';

import { useEffect, useState } from 'react';
import {
  blobsApi,
  ListingVM,
  ListingBlobRef,
  ManagedTypeVM,
  PropertyDef,
  PropertyType,
} from '@repo/api';
import { Star, CheckCircle2, XCircle, Tag, Play, FileText, Download } from 'lucide-react';
import { Badge } from '@repo/ui';
import { ICON_REGISTRY } from '@/components/common/iconRegistry';
import { resolveAttrs } from '../../metadata/_components/attribute-protocol';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isImageBlob(blob: ListingBlobRef) {
  return (blob.mediaType ?? '').startsWith('image/');
}

function isVideoBlob(blob: ListingBlobRef) {
  return (blob.mediaType ?? '').startsWith('video/');
}

function isDocBlob(blob: ListingBlobRef) {
  return !isImageBlob(blob) && !isVideoBlob(blob);
}

function getThumbnail(blobs: ListingBlobRef[]): ListingBlobRef | undefined {
  const images = blobs.filter(isImageBlob);
  return images.find((b) => b.metadata?.['thumbnail'] === 'true') ?? images[0];
}

function findPropDef(defs: PropertyDef[], name: string): PropertyDef | undefined {
  for (const d of defs) {
    if (d.name === name) return d;
    if (d.value) {
      const found = findPropDef(d.value, name);
      if (found) return found;
    }
  }
}

interface EmbeddedProp {
  type?: string;
  name?: string;
  label?: string;
  value?: unknown;
}

function resolveLabel(raw: string, options?: string): string {
  if (!options) return raw;
  for (const opt of options.split(',')) {
    const [label, val] = opt.trim().split(':');
    if ((val?.trim() ?? label?.trim()) === raw) return label?.trim() ?? raw;
  }
  return raw;
}

// ── Property value renderer ───────────────────────────────────────────────────

function PropValue({ prop, def }: { prop: EmbeddedProp; def?: PropertyDef }) {
  const val = prop.value;
  const attrs = def?.attributes ?? {};
  const uiDisplay = attrs['ui:display'];
  const uiComponent = attrs['ui:component'];
  const colorOptionsRaw = attrs['style:color-options'];
  const optionsRaw = attrs['style:options'];
  const dataType = def?.dataType;

  if (val === undefined || val === null || val === '') {
    const emptyText = attrs['list:empty'];
    return <span className="text-muted-foreground text-sm">{emptyText || '—'}</span>;
  }

  const strVal = String(val);
  const listAttrs = resolveAttrs(attrs, 'list', def?.type as PropertyType | undefined);
  const listPrefix = listAttrs['list:prefix'];
  const listSuffix = listAttrs['list:suffix'];
  const listTruncate = listAttrs['list:truncate'];
  const listFormat = listAttrs['list:format'];
  const listDisplay = listAttrs['list:display'] || uiDisplay;
  const displayValue =
    listTruncate && Number(listTruncate) > 0 && strVal.length > Number(listTruncate)
      ? strVal.slice(0, Number(listTruncate)) + '…'
      : strVal;

  function withModifiers(content: React.ReactNode): React.ReactNode {
    if (!listPrefix && !listSuffix) return content;
    return (
      <span className="inline-flex items-center gap-0.5">
        {listPrefix && <span className="text-muted-foreground text-xs">{listPrefix}</span>}
        {content}
        {listSuffix && <span className="text-muted-foreground text-xs">{listSuffix}</span>}
      </span>
    );
  }

  function applyFormat(raw: string, format?: string): string {
    if (!format || format === 'raw') return raw;
    try {
      if (format === 'date') return new Date(raw).toLocaleDateString();
      if (format === 'datetime') return new Date(raw).toLocaleString();
    } catch {}
    if (format === 'currency') {
      const num = Number(raw);
      return isNaN(num) ? raw : `$${num.toLocaleString()}`;
    }
    if (format === 'percentage') {
      const num = Number(raw);
      return isNaN(num) ? raw : `${num}%`;
    }
    if (format === 'number') {
      const num = Number(raw);
      return isNaN(num) ? raw : num.toLocaleString();
    }
    if (format === 'uppercase') return raw.toUpperCase();
    if (format === 'lowercase') return raw.toLowerCase();
    return raw;
  }

  // COMPOSITE — supports list:composite.layout block
  if (prop.type === 'COMPOSITE_PROPERTY' && Array.isArray(val)) {
    const children = val as EmbeddedProp[];
    const compositeLayout = listAttrs['list:composite.layout'] ?? 'table';
    const compositeGap = listAttrs['list:composite.gap'] ?? 'normal';
    const compositeLabelWidth = listAttrs['list:composite.label-width'] ?? 'w-28';

    // hidden — skip rendering entirely
    if (compositeLayout === 'hidden') return null;

    // inline — comma-separated label: value
    if (compositeLayout === 'inline') {
      return withModifiers(
        <span className="text-sm text-foreground">
          {children
            .filter((c) => c.value !== undefined && c.value !== null && c.value !== '')
            .map((c, i) => {
              const childDef = def?.value ? findPropDef(def.value, c.name ?? '') : undefined;
              return (
                <span key={c.name}>
                  {i > 0 && <span className="text-muted-foreground mx-1">·</span>}
                  <span className="font-medium">{c.label ?? c.name}: </span>
                  <PropValue prop={c} def={childDef} />
                </span>
              );
            })}
        </span>,
      );
    }

    // card — each child as a standalone card
    if (compositeLayout === 'card') {
      return (
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 gap-${compositeGap === 'tight' ? '2' : compositeGap === 'loose' ? '4' : '3'}`}
        >
          {children.map((child) => {
            const childDef = def?.value ? findPropDef(def.value, child.name ?? '') : undefined;
            const isEmpty = child.value === undefined || child.value === null || child.value === '';
            return (
              <div
                key={child.name}
                className="rounded-lg border border-border/60 p-3 bg-card space-y-1"
              >
                <span className="text-xs font-medium text-muted-foreground block">
                  {child.label ?? child.name}
                </span>
                {isEmpty ? (
                  <span className="text-sm text-muted-foreground">—</span>
                ) : (
                  <PropValue prop={child} def={childDef} />
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // grid — items laid out in CSS grid
    if (compositeLayout === 'grid') {
      const columns = listAttrs['list:composite.columns'] ?? '2';
      return (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {children.map((child) => {
            const childDef = def?.value ? findPropDef(def.value, child.name ?? '') : undefined;
            const isEmpty = child.value === undefined || child.value === null || child.value === '';
            return (
              <div key={child.name} className="space-y-0.5">
                <span className="text-xs font-medium text-muted-foreground block">
                  {child.label ?? child.name}
                </span>
                {isEmpty ? (
                  <span className="text-sm text-muted-foreground">—</span>
                ) : (
                  <PropValue prop={child} def={childDef} />
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // definition — definition list style (dt/dd)
    if (compositeLayout === 'definition') {
      return (
        <dl className="space-y-1.5">
          {children.map((child) => {
            const childDef = def?.value ? findPropDef(def.value, child.name ?? '') : undefined;
            const isEmpty = child.value === undefined || child.value === null || child.value === '';
            return (
              <div key={child.name} className="flex items-baseline gap-2">
                <dt
                  className={`text-xs font-medium text-muted-foreground ${compositeLabelWidth} shrink-0`}
                >
                  {child.label ?? child.name}
                </dt>
                <dd className="text-sm text-foreground">
                  {isEmpty ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <PropValue prop={child} def={childDef} />
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      );
    }

    // table — default: rows with alternating background
    return (
      <div className="rounded-lg border border-border/60 overflow-hidden">
        {children.map((child, i) => {
          const childDef = def?.value ? findPropDef(def.value, child.name ?? '') : undefined;
          return (
            <div
              key={child.name}
              className={`flex items-start gap-4 px-3 py-2 ${i % 2 === 0 ? 'bg-muted/30' : 'bg-transparent'}`}
            >
              <span
                className={`text-xs text-muted-foreground ${compositeLabelWidth} shrink-0 pt-0.5`}
              >
                {child.label ?? child.name}
              </span>
              <PropValue prop={child} def={childDef} />
            </div>
          );
        })}
      </div>
    );
  }

  if ((prop.type === 'LIST_PROPERTY' || prop.type === 'SET_PROPERTY') && Array.isArray(val)) {
    return (
      <div className="flex flex-wrap gap-1">
        {(val as unknown[]).map((item, i) => (
          <span key={i} className="px-2 py-0.5 rounded-full bg-muted text-xs text-foreground">
            {String(item)}
          </span>
        ))}
      </div>
    );
  }

  // BOOLEAN
  if (dataType === 'BOOLEAN' || strVal === 'true' || strVal === 'false') {
    const isTrue = strVal === 'true';
    if (uiDisplay === 'badge' || uiComponent === 'toggle' || uiComponent === 'checkbox') {
      return isTrue ? (
        <span className="inline-flex items-center gap-1 text-emerald-600 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4" /> Yes
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-muted-foreground text-sm">
          <XCircle className="h-4 w-4" /> No
        </span>
      );
    }
  }

  // ui:display = badge (or list:display = badge)
  if (listDisplay === 'badge' || listDisplay === 'pill' || uiDisplay === 'badge') {
    const badgeColor = listAttrs['list:badge.color'];
    const badgeSize = listAttrs['list:badge.size'];
    const badgeVariant = listAttrs['list:badge.variant'] ?? 'soft';
    const sizeCls =
      badgeSize === 'sm'
        ? 'text-[10px] px-1.5'
        : badgeSize === 'lg'
          ? 'text-sm px-3'
          : 'text-xs px-2';
    const colorCls =
      badgeColor === 'success'
        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
        : badgeColor === 'warning'
          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
          : badgeColor === 'danger'
            ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
            : badgeColor === 'info'
              ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30'
              : badgeColor === 'muted'
                ? 'bg-muted text-muted-foreground border-border'
                : 'bg-primary/10 text-primary border-primary/30';
    const variantCls =
      badgeVariant === 'solid'
        ? badgeColor === 'success'
          ? 'bg-emerald-500 text-white'
          : badgeColor === 'warning'
            ? 'bg-amber-500 text-white'
            : badgeColor === 'danger'
              ? 'bg-red-500 text-white'
              : 'bg-primary text-primary-foreground'
        : badgeVariant === 'outline'
          ? 'bg-transparent border'
          : `${colorCls} border`;
    return withModifiers(
      <span
        className={`inline-flex items-center rounded-full ${variantCls} ${sizeCls} py-0.5 font-medium`}
      >
        {resolveLabel(displayValue, optionsRaw)}
      </span>,
    );
  }

  if (listDisplay === 'link') {
    const label = listAttrs['list:link.label'] || displayValue;
    const newTab = listAttrs['list:link.new-tab'] !== 'false';
    return withModifiers(
      <a
        href={displayValue}
        target={newTab ? '_blank' : undefined}
        rel={newTab ? 'noreferrer' : undefined}
        className="text-sm font-medium text-primary underline-offset-2 hover:underline"
      >
        {label}
      </a>,
    );
  }

  if (listDisplay === 'boolean') {
    const on = strVal === 'true' || strVal === '1' || strVal === 'yes';
    return (
      <span className={on ? 'text-sm font-medium text-emerald-600' : 'text-sm text-muted-foreground'}>
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

  if (listDisplay === 'monospace') {
    return withModifiers(
      <span className="font-mono text-sm text-foreground">{applyFormat(displayValue, listFormat)}</span>,
    );
  }

  // list:display = image — render as image thumbnail
  if (listDisplay === 'image') {
    const imgSize = listAttrs['list:image.size'] ?? 'md';
    const imgShape = listAttrs['list:image.shape'] ?? 'rounded';
    const imgFit = listAttrs['list:image.fit'] ?? 'cover';
    const sizeCls =
      imgSize === 'xs'
        ? 'w-8 h-8'
        : imgSize === 'sm'
          ? 'w-12 h-12'
          : imgSize === 'lg'
            ? 'w-24 h-24'
            : imgSize === 'full'
              ? 'w-full h-auto'
              : 'w-16 h-16';
    const shapeCls =
      imgShape === 'circle'
        ? 'rounded-full'
        : imgShape === 'square'
          ? 'rounded-none'
          : 'rounded-md';
    const fitCls =
      imgFit === 'contain' ? 'object-contain' : imgFit === 'fill' ? 'object-fill' : 'object-cover';
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={displayValue}
        alt=""
        className={`${sizeCls} ${shapeCls} ${fitCls} border border-border/40`}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  // list:display = price — render as formatted price
  if (listDisplay === 'price') {
    const currency = listAttrs['list:price.currency'] ?? 'USD';
    const priceFormat = listAttrs['list:price.format'] ?? 'symbol';
    const priceSize = listAttrs['list:price.size'] ?? 'md';
    const currencySymbol: Record<string, string> = {
      USD: '$',
      GBP: '£',
      EUR: '€',
      INR: '₹',
      custom: '',
    };
    const symbol = priceFormat === 'symbol' ? (currencySymbol[currency] ?? currency) : '';
    const code = priceFormat === 'code' ? ` ${currency}` : '';
    const name = priceFormat === 'name' ? ` ${currency}` : '';
    const textSize =
      priceSize === 'sm'
        ? 'text-sm'
        : priceSize === 'lg'
          ? 'text-xl font-semibold'
          : 'text-base font-medium';
    return withModifiers(
      <span className={`${textSize} text-foreground tabular-nums`}>
        {symbol}
        {displayValue}
        {code}
        {name}
      </span>,
    );
  }

  // ui:display = color-swatch or style:color-options — show all swatches, highlight selected
  if (uiDisplay === 'color-swatch' || colorOptionsRaw) {
    if (colorOptionsRaw) {
      const colors = colorOptionsRaw
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      return (
        <div className="flex flex-wrap gap-2">
          {colors.map((color) => {
            const selected = strVal === color;
            return (
              <div
                key={color}
                title={color}
                className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border-2 transition-all select-none ${
                  selected ? 'border-primary scale-105' : 'border-transparent opacity-60'
                }`}
              >
                <span
                  className="w-6 h-6 rounded-full border border-border/40 block"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[10px] text-muted-foreground capitalize leading-none">
                  {color}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <span
          className="w-5 h-5 rounded-full border border-border inline-block"
          style={{ backgroundColor: strVal }}
        />
        <span className="text-sm capitalize">{strVal}</span>
      </div>
    );
  }

  // ui:display = icon
  if (uiDisplay === 'icon') {
    const IconComp = ICON_REGISTRY[strVal] ?? null;
    return IconComp ? (
      <IconComp className="h-5 w-5 text-foreground" />
    ) : (
      <span className="text-sm">{strVal}</span>
    );
  }

  // ui:component = rating → stars
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

  // option-pills / style:options → show all options, highlight selected (Amazon-style)
  if ((uiComponent === 'option-pills' || optionsRaw) && optionsRaw) {
    const options = optionsRaw.split(',').map((o) => {
      const [label, val] = o.trim().split(':');
      return { label: label?.trim() ?? '', value: val?.trim() ?? label?.trim() ?? '' };
    });
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = strVal === opt.value;
          return (
            <span
              key={opt.value}
              className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors select-none ${
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground'
              }`}
            >
              {opt.label}
            </span>
          );
        })}
      </div>
    );
  }

  // tag-input → comma-separated chips
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

  // multiline text
  if (attrs['ui:multiline'] === 'true') {
    return withModifiers(
      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{displayValue}</p>,
    );
  }

  // dataType-specific rendering for structured values
  if (dataType === 'COORDINATES' && typeof val === 'object' && val !== null) {
    const c = val as Record<string, unknown>;
    const lat = c['latitude'] != null ? String(c['latitude']) : '—';
    const lng = c['longitude'] != null ? String(c['longitude']) : '—';
    return (
      <span className="text-sm font-mono text-foreground">
        {lat}, {lng}
      </span>
    );
  }

  if (dataType === 'ADDRESS' && typeof val === 'object' && val !== null) {
    const a = val as Record<string, unknown>;
    const parts = [
      a['addressLine1'],
      a['addressLine2'],
      a['area'],
      a['city'],
      a['state'],
      a['country'],
      a['pinCode'],
    ].filter(Boolean);
    return <span className="text-sm text-foreground">{parts.join(', ') || '—'}</span>;
  }

  if (dataType === 'DURATION' && typeof strVal === 'string') {
    const m = strVal.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/);
    if (m) {
      const parts: string[] = [];
      if (m[1]) parts.push(`${m[1]}h`);
      if (m[2]) parts.push(`${m[2]}m`);
      if (m[3]) parts.push(`${Math.floor(Number(m[3]))}s`);
      return <span className="text-sm text-foreground">{parts.join(' ') || '0s'}</span>;
    }
  }

  if (dataType === 'PERIOD' && typeof strVal === 'string') {
    const m = strVal.match(/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?$/);
    if (m) {
      const parts: string[] = [];
      if (m[1]) parts.push(`${m[1]}y`);
      if (m[2]) parts.push(`${m[2]}mo`);
      if (m[3]) parts.push(`${m[3]}d`);
      return <span className="text-sm text-foreground">{parts.join(' ') || '0d'}</span>;
    }
  }

  return withModifiers(
    <span className="text-sm text-foreground">{applyFormat(displayValue, listFormat)}</span>,
  );
}

// ── Media Gallery ─────────────────────────────────────────────────────────────

function MediaGallery({ blobs }: { blobs: ListingBlobRef[] }) {
  const images = blobs.filter(isImageBlob);
  const videos = blobs.filter(isVideoBlob);
  const mediaItems = [...images, ...videos];

  const [activeId, setActiveId] = useState<string>(
    () => getThumbnail(blobs)?.id ?? mediaItems[0]?.id ?? '',
  );
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // Collect unique colors from blob metadata (images only)
  const colorMap: Record<string, string[]> = {};
  images.forEach((b) => {
    const c = b.metadata?.['color'];
    if (c) {
      if (!colorMap[c]) colorMap[c] = [];
      colorMap[c].push(b.id);
    }
  });
  const colors = Object.keys(colorMap);
  const hasColors = colors.length > 0;

  // Color filter applies to images; videos always show
  const visibleMedia = selectedColor
    ? [...images.filter((b) => b.metadata?.['color'] === selectedColor), ...videos]
    : mediaItems;

  const effectiveActiveId = visibleMedia.find((b) => b.id === activeId)
    ? activeId
    : (visibleMedia[0]?.id ?? '');

  const activeBlob = mediaItems.find((b) => b.id === effectiveActiveId) ?? visibleMedia[0];
  const isActiveVideo = activeBlob ? isVideoBlob(activeBlob) : false;

  if (!mediaItems.length) {
    return (
      <div className="w-full aspect-square rounded-2xl bg-muted flex items-center justify-center">
        <span className="text-muted-foreground text-sm">No images</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Color swatches */}
      {hasColors && (
        <div className="flex flex-wrap gap-2">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              title={color}
              onClick={() => setSelectedColor(selectedColor === color ? null : color)}
              className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border-2 transition-all ${
                selectedColor === color
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
          {selectedColor && (
            <button
              type="button"
              onClick={() => setSelectedColor(null)}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Main display */}
      {activeBlob && (
        <div className="relative rounded-2xl overflow-hidden border border-border bg-muted aspect-square">
          {isActiveVideo ? (
            <video
              key={activeBlob.id}
              src={blobsApi.getDownloadUrl(activeBlob.id)}
              controls
              className="w-full h-full object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={blobsApi.getDownloadUrl(activeBlob.id)}
              alt={activeBlob.fileName ?? 'image'}
              className="w-full h-full object-contain"
            />
          )}
        </div>
      )}

      {/* Thumbnail strip — scrollable */}
      {visibleMedia.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {visibleMedia.map((blob) => {
            const isVideo = isVideoBlob(blob);
            return (
              <button
                key={blob.id}
                type="button"
                onClick={() => setActiveId(blob.id)}
                className={`shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-all relative ${
                  blob.id === effectiveActiveId
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                {isVideo ? (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Play className="h-6 w-6 text-muted-foreground fill-muted-foreground" />
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={blobsApi.getDownloadUrl(blob.id)}
                    alt={blob.fileName ?? ''}
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Document Attachments ──────────────────────────────────────────────────────

function DocAttachments({ blobs }: { blobs: ListingBlobRef[] }) {
  const docs = blobs.filter(isDocBlob);
  const [docNames, setDocNames] = useState<Record<string, string>>({});
  const docIds = docs.map((blob) => blob.id).join('|');

  useEffect(() => {
    let active = true;

    const loadMissingNames = async () => {
      const missing = docs.filter((blob) => !blob.fileName && !docNames[blob.id]);
      if (!missing.length) return;

      const resolved = await Promise.all(
        missing.map(async (blob) => {
          try {
            const detail = await blobsApi.getBlobById(blob.id);
            return [blob.id, detail.fileName ?? blob.id] as const;
          } catch {
            return [blob.id, blob.id] as const;
          }
        }),
      );

      if (!active) return;
      setDocNames((prev) => {
        const next = { ...prev };
        resolved.forEach(([id, name]) => {
          next[id] = name;
        });
        return next;
      });
    };

    void loadMissingNames();
    return () => {
      active = false;
    };
  }, [docIds, docs, docNames]);

  if (!docs.length) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <h2 className="text-sm font-semibold text-foreground">Documents</h2>
      <div className="space-y-1.5">
        {docs.map((blob) => {
          const displayName = blob.fileName ?? docNames[blob.id] ?? blob.id;
          return (
            <div
              key={blob.id}
              className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/30 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-foreground truncate" title={displayName}>
                  {displayName}
                </span>
              </div>
              <a
                href={blobsApi.getDownloadUrl(blob.id)}
                download={blob.fileName ?? displayName}
                className="shrink-0 ml-3 inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-border bg-background hover:bg-muted transition-colors"
              >
                <Download className="h-3 w-3" />
                Download
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main content ──────────────────────────────────────────────────────────────

export function ListingDetailContent({
  listing,
  managedType,
}: {
  listing: ListingVM;
  managedType: ManagedTypeVM | null;
}) {
  const blobs = listing.blobs ?? [];
  const embedded = listing.embedded as Record<string, unknown> | undefined;
  const embeddedProps = Array.isArray(embedded?.properties)
    ? (embedded!.properties as EmbeddedProp[])
    : [];
  const propDefs = managedType?.properties ?? [];

  const subCat = listing.subCategory;
  const subCatName =
    typeof subCat === 'object' && subCat !== null
      ? (subCat as { name?: string }).name
      : (subCat as string | undefined);

  const cat = listing.category;
  const CatIcon = cat?.icon ? (ICON_REGISTRY[cat.icon] ?? null) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* Left — media gallery + documents */}
      <div className="lg:col-span-2 space-y-4">
        <MediaGallery blobs={blobs} />
        <DocAttachments blobs={blobs} />
      </div>

      {/* Right — details */}
      <div className="lg:col-span-3 space-y-6">
        {/* Title & meta */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-foreground leading-tight">{listing.name}</h1>

          {/* Category breadcrumb */}
          {(cat || subCatName) && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {CatIcon && <CatIcon className="h-3.5 w-3.5" />}
              {cat && <span>{cat.name}</span>}
              {cat && subCatName && <span>›</span>}
              {subCatName && <span>{subCatName}</span>}
            </div>
          )}

          {/* Availability */}
          <div className="flex items-center gap-2">
            {listing.available === true ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                In Stock
                {listing.quantity?.available != null &&
                  ` — ${listing.quantity.available} available`}
              </Badge>
            ) : listing.available === false ? (
              <Badge
                variant="destructive"
                className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30"
              >
                Out of Stock
              </Badge>
            ) : null}
            {listing.status && (
              <Badge variant="secondary" className="text-xs capitalize">
                {listing.status}
              </Badge>
            )}
          </div>

          {/* Tags */}
          {listing.tags && listing.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {listing.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground"
                >
                  <Tag className="h-2.5 w-2.5" />
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {listing.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{listing.description}</p>
          )}
        </div>

        {/* Embedded catalog properties */}
        {embeddedProps.length > 0 &&
          (() => {
            const scalarProps = embeddedProps.filter(
              (p) => !(p.type === 'COMPOSITE_PROPERTY' && Array.isArray(p.value)),
            );
            const compositeProps = embeddedProps.filter(
              (p) => p.type === 'COMPOSITE_PROPERTY' && Array.isArray(p.value),
            );
            return (
              <div className="space-y-4">
                {/* Scalar fields card */}
                {scalarProps.length > 0 && (
                  <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                    {managedType && (
                      <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">
                        {managedType.name}
                      </h2>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                      {scalarProps.map((prop) => {
                        if (!prop.name) return null;
                        const def = findPropDef(propDefs, prop.name);
                        const labelText = prop.label ?? def?.label ?? prop.name;
                        return (
                          <div key={prop.name}>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              {labelText}
                            </p>
                            <PropValue prop={prop} def={def} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Composite spec cards */}
                {compositeProps.map((prop) => {
                  if (!prop.name) return null;
                  const def = findPropDef(propDefs, prop.name);
                  const labelText = prop.label ?? def?.label ?? prop.name;
                  const children = prop.value as EmbeddedProp[];
                  return (
                    <div
                      key={prop.name}
                      className="rounded-xl border border-border bg-card overflow-hidden"
                    >
                      {/* Card header */}
                      <div className="px-5 py-3 bg-muted/40 border-b border-border flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{labelText}</span>
                        <span className="text-xs text-muted-foreground">
                          ·{' '}
                          {
                            children.filter(
                              (c) => c.value !== undefined && c.value !== null && c.value !== '',
                            ).length
                          }{' '}
                          fields
                        </span>
                      </div>
                      {/* Spec table */}
                      <div className="divide-y divide-border/50">
                        {children.map((child) => {
                          if (!child.name) return null;
                          const childDef = def?.value
                            ? findPropDef(def.value, child.name)
                            : undefined;
                          const childLabel = child.label ?? childDef?.label ?? child.name;
                          const isEmpty =
                            child.value === undefined || child.value === null || child.value === '';
                          return (
                            <div
                              key={child.name}
                              className="flex items-start gap-4 px-5 py-2.5 hover:bg-muted/20 transition-colors"
                            >
                              <span className="text-xs font-medium text-muted-foreground w-32 shrink-0 pt-0.5">
                                {childLabel}
                              </span>
                              {isEmpty ? (
                                <span className="text-xs text-muted-foreground/50">—</span>
                              ) : (
                                <PropValue prop={child} def={childDef} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
      </div>
    </div>
  );
}
