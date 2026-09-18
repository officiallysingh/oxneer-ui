'use client';

import { blobsApi, type ListingBlobRef, type ListingVM } from '@repo/api';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/ui';
import {
  ImageIcon,
  Film,
  FileText,
  Download,
  Package,
  Loader2,
  Trash2,
  Pencil,
  Eye,
} from 'lucide-react';
import Tip from '@/components/common/admin/Tip';

// ── Helpers ───────────────────────────────────────────────────────────────────

export type MediaType = 'image' | 'video' | 'doc';

export function classifyBlob(blob: ListingBlobRef): MediaType {
  const mt = blob.mediaType ?? '';
  if (mt.startsWith('image/')) return 'image';
  if (mt.startsWith('video/')) return 'video';
  return 'doc';
}

// ── MediaCountBadge ───────────────────────────────────────────────────────────

interface MediaCountBadgeProps {
  blobs: ListingBlobRef[];
  type: MediaType;
  onClick: () => void;
}

export function MediaCountBadge({ blobs, type, onClick }: MediaCountBadgeProps) {
  const filtered = blobs.filter((b) => classifyBlob(b) === type);
  if (!filtered.length) return null;

  const Icon = type === 'image' ? ImageIcon : type === 'video' ? Film : FileText;
  const label = type === 'image' ? 'Images' : type === 'video' ? 'Videos' : 'Docs';
  const colorClass =
    type === 'image'
      ? 'text-blue-600 hover:text-blue-700'
      : type === 'video'
        ? 'text-purple-600 hover:text-purple-700'
        : 'text-amber-600 hover:text-amber-700';

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 text-xs font-medium ${colorClass} hover:underline`}
    >
      <Icon className="h-3 w-3" />
      {label}: {filtered.length}
    </button>
  );
}

// ── MediaModal ────────────────────────────────────────────────────────────────

export interface MediaModalState {
  blobs: ListingBlobRef[];
  mediaType: MediaType;
}

interface MediaModalProps {
  modal: MediaModalState;
  onClose: () => void;
}

export function MediaModal({ modal, onClose }: MediaModalProps) {
  const { blobs, mediaType } = modal;
  const filtered = blobs.filter((b) => classifyBlob(b) === mediaType);
  const title = mediaType === 'image' ? 'Images' : mediaType === 'video' ? 'Videos' : 'Documents';

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {mediaType === 'image' && (
          <div className="grid grid-cols-2 gap-4">
            {filtered.map((blob) => (
              <div
                key={blob.id}
                className="rounded-lg overflow-hidden border border-border group relative"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={blobsApi.getDownloadUrl(blob.id)}
                  alt={blob.fileName ?? blob.id}
                  className="w-full h-48 object-cover"
                />
                <div className="p-2 flex items-center justify-between bg-muted/50">
                  <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                    {blob.fileName ?? blob.id}
                  </span>
                  <a
                    href={blobsApi.getDownloadUrl(blob.id)}
                    download={blob.fileName ?? true}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {mediaType === 'video' && (
          <div className="space-y-3">
            {filtered.map((blob) => (
              <div key={blob.id} className="rounded-lg overflow-hidden border border-border">
                <video
                  controls
                  className="w-full max-h-64 bg-black"
                  src={blobsApi.getDownloadUrl(blob.id)}
                />
                <div className="p-2 flex items-center justify-between bg-muted/50">
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {blob.fileName ?? blob.id}
                  </span>
                  <a
                    href={blobsApi.getDownloadUrl(blob.id)}
                    download={blob.fileName ?? true}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {mediaType === 'doc' && (
          <div className="space-y-2">
            {filtered.map((blob) => (
              <div
                key={blob.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-muted/30"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-sm text-foreground truncate">
                    {blob.fileName ?? blob.id}
                  </span>
                  {blob.size && (
                    <span className="text-xs text-muted-foreground shrink-0">({blob.size})</span>
                  )}
                </div>
                <a
                  href={blobsApi.getDownloadUrl(blob.id)}
                  download={blob.fileName ?? true}
                  className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0 ml-3"
                >
                  <Download className="h-3 w-3" />
                  Download
                </a>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── ListingCardGrid ───────────────────────────────────────────────────────────

interface ListingCardGridProps {
  listings: ListingVM[];
  isLoading: boolean;
  deletingId: string | null;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ListingCardGrid({
  listings,
  isLoading,
  deletingId,
  onView,
  onEdit,
  onDelete,
}: ListingCardGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card animate-pulse h-52" />
        ))}
      </div>
    );
  }

  if (!listings.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
        <Package className="h-10 w-10 opacity-30" />
        <p className="text-sm">No listings found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {listings.map((listing) => {
        const thumb = (listing.blobs ?? []).find((b) => b.mediaType?.startsWith('image/'));
        const cat = listing.category;
        const sub = typeof listing.subCategory === 'object' ? listing.subCategory : null;
        const tags = listing.tags ?? [];

        return (
          <div
            key={listing.id}
            className="rounded-xl border border-border bg-card overflow-hidden flex flex-col hover:shadow-md transition-shadow"
          >
            {/* Thumbnail */}
            <div className="h-36 bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={blobsApi.getDownloadUrl(thumb.id)}
                  alt={listing.name || 'Listing image'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="h-10 w-10 text-muted-foreground/30" />
              )}
            </div>

            {/* Body */}
            <div className="p-3 flex flex-col gap-2 flex-1">
              <div>
                <button
                  type="button"
                  onClick={() => onView(listing.id)}
                  className="font-semibold text-sm text-foreground hover:text-primary hover:underline text-left line-clamp-1 w-full"
                >
                  {listing.name}
                </button>
                {listing.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {listing.description}
                  </p>
                )}
              </div>

              {(cat || sub) && (
                <div className="flex flex-wrap gap-1">
                  {cat && (
                    <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {cat.icon && <span>{cat.icon}</span>}
                      {cat.name}
                    </span>
                  )}
                  {sub && (
                    <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      {sub.icon && <span>{sub.icon}</span>}
                      {sub.name}
                    </span>
                  )}
                </div>
              )}

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-auto pt-1 border-t border-border">
                <span
                  className={`text-xs font-medium ${listing.available === false ? 'text-red-500' : listing.available ? 'text-emerald-500' : 'text-muted-foreground'}`}
                >
                  {listing.available === false
                    ? 'Unavailable'
                    : listing.available
                      ? `Available${listing.quantity?.available != null ? ` (${listing.quantity.available})` : ''}`
                      : '—'}
                </span>
                <div className="flex items-center gap-0.5">
                  <Tip label="View">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`View ${listing.name}`}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => onView(listing.id)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </Tip>
                  <Tip label="Edit">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Edit ${listing.name}`}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => onEdit(listing.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </Tip>
                  <Tip label="Delete">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete ${listing.name}`}
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                      onClick={() => onDelete(listing.id)}
                      disabled={deletingId === listing.id}
                    >
                      {deletingId === listing.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </Tip>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
