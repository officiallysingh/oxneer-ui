'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Loader2, Pencil, Trash2 } from 'lucide-react';
import type { ListingVM } from '@oxneer/api';
import { Button } from '@oxneer/ui';
import Tip from '@/components/common/admin/Tip';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { ListingThumbnail } from '@/components/common/admin/ListingThumbnail';
import { MediaCountBadge, type MediaModalState } from './ListingMediaComponents';

interface ListingColumnHandlers {
  deletingId: string | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onShowMedia: (modal: MediaModalState) => void;
}

const viewHref = (id: string) => `/admin/listings/${id}/view`;

function EmptyCell() {
  return <span className="text-xs text-muted-foreground">—</span>;
}

function CategoryCell({ icon, name }: { icon?: string; name: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-foreground">
      {icon && (
        <CategoryIcon
          value={icon}
          size={14}
          className="text-muted-foreground shrink-0"
          fallback={null}
        />
      )}
      {name}
    </div>
  );
}

function AvailableCell({ listing }: { listing: ListingVM }) {
  const { available, quantity } = listing;
  if (available === undefined || available === null) return <EmptyCell />;
  if (!available) return <span className="text-sm font-medium text-destructive">No</span>;
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-success">Yes</span>
      {quantity?.available != null && (
        <span className="text-xs text-muted-foreground tabular-nums">({quantity.available})</span>
      )}
    </div>
  );
}

function SubCategoryCell({ listing }: { listing: ListingVM }) {
  const sub = listing.subCategory;
  if (!sub) return <EmptyCell />;
  // Older listings store the sub-category as a bare id string instead of a ref.
  if (typeof sub === 'object') return <CategoryCell icon={sub.icon} name={sub.name} />;
  return <span className="text-sm text-foreground">{sub}</span>;
}

function TagsCell({ tags }: { tags: string[] }) {
  if (!tags.length) return <EmptyCell />;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span key={tag} className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-xs">
          {tag}
        </span>
      ))}
    </div>
  );
}

function MediaCell({
  listing,
  onShowMedia,
}: {
  listing: ListingVM;
  onShowMedia: ListingColumnHandlers['onShowMedia'];
}) {
  const blobs = listing.blobs ?? [];
  if (!blobs.length) return <EmptyCell />;
  return (
    <div className="flex flex-col gap-1">
      {(['image', 'video', 'doc'] as const).map((mediaType) => (
        <MediaCountBadge
          key={mediaType}
          blobs={blobs}
          type={mediaType}
          onClick={() => onShowMedia({ blobs, mediaType })}
        />
      ))}
    </div>
  );
}

function RowActions({
  listing,
  deletingId,
  onEdit,
  onDelete,
}: { listing: ListingVM } & Omit<ListingColumnHandlers, 'onShowMedia'>) {
  const isDeleting = deletingId === listing.id;
  const iconButton = 'h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted';
  return (
    <div className="flex items-center gap-0.5">
      <Tip label="View listing">
        <Button asChild variant="ghost" size="sm" className={iconButton}>
          <Link href={viewHref(listing.id)} aria-label="View listing">
            <Eye className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </Tip>
      <Tip label="Edit listing">
        <Button
          variant="ghost"
          size="sm"
          className={iconButton}
          onClick={() => onEdit(listing.id)}
          aria-label="Edit listing"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </Tip>
      <Tip label="Delete listing">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(listing.id)}
          disabled={isDeleting}
          aria-label="Delete listing"
        >
          {isDeleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </Tip>
    </div>
  );
}

export function buildListingColumns(handlers: ListingColumnHandlers): ColumnDef<ListingVM>[] {
  return [
    {
      id: 'thumbnail',
      header: '',
      cell: ({ row }) => <ListingThumbnail listingId={row.original.id} />,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <Link
          href={viewHref(row.original.id)}
          className="font-medium text-primary hover:underline text-sm text-left"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm line-clamp-1">
          {row.original.description ?? '—'}
        </span>
      ),
    },
    {
      id: 'available',
      header: 'Available',
      cell: ({ row }) => <AvailableCell listing={row.original} />,
    },
    {
      id: 'category',
      header: 'Category',
      cell: ({ row }) => {
        const category = row.original.category;
        return category ? (
          <CategoryCell icon={category.icon} name={category.name} />
        ) : (
          <EmptyCell />
        );
      },
    },
    {
      id: 'subCategory',
      header: 'Sub-category',
      cell: ({ row }) => <SubCategoryCell listing={row.original} />,
    },
    {
      id: 'tags',
      header: 'Tags',
      cell: ({ row }) => <TagsCell tags={row.original.tags ?? []} />,
    },
    {
      id: 'media',
      header: 'Media',
      cell: ({ row }) => <MediaCell listing={row.original} onShowMedia={handlers.onShowMedia} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <RowActions
          listing={row.original}
          deletingId={handlers.deletingId}
          onEdit={handlers.onEdit}
          onDelete={handlers.onDelete}
        />
      ),
    },
  ];
}
