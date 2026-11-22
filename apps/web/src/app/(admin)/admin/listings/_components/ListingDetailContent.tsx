'use client';

import { useEffect, useState } from 'react';
import { blobsApi, ListingVM, ListingBlobRef, ManagedTypeVM } from '@repo/api';
import { Tag, Play, FileText, Download } from 'lucide-react';
import { Badge } from '@repo/ui';
import { ICON_REGISTRY } from '@/components/common/iconRegistry';
import { AttrPropertySections } from '@/components/common/attributes/AttrValue';
import { embeddedToValues, mergeDefs, type EmbeddedProp } from '@/lib/attributes/values';

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
  const propDefs = embeddedProps.length
    ? mergeDefs(managedType?.properties ?? [], embeddedProps)
    : [];
  const values = embeddedToValues(embeddedProps);

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
              <Badge className="bg-success/15 text-success border-success/30">
                In Stock
                {listing.quantity?.available != null &&
                  ` — ${listing.quantity.available} available`}
              </Badge>
            ) : listing.available === false ? (
              <Badge
                variant="destructive"
                className="bg-destructive/15 text-destructive border-destructive/30"
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
        <AttrPropertySections defs={propDefs} values={values} title={managedType?.name} />
      </div>
    </div>
  );
}
