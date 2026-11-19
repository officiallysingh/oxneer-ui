'use client';

import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { blobsApi } from '@repo/api';
import { cn } from '@repo/ui';

/** Fetches a listing's thumbnail via GET /api/v1/blobs/listing/{id}/thumbnail and renders it.
 *  40px by default; pass `className` to size it differently. */
export function ListingThumbnail({
  listingId,
  className,
}: {
  listingId: string;
  className?: string;
}) {
  const [loadedListingId, setLoadedListingId] = useState(listingId);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  if (listingId !== loadedListingId) {
    setLoadedListingId(listingId);
    setUrl(null);
    setFailed(false);
  }

  useEffect(() => {
    let cancelled = false;
    blobsApi
      .getListingThumbnail(listingId)
      .then((blob) => {
        if (!cancelled) setUrl(blobsApi.getDownloadUrl(blob.id));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  return (
    <div
      className={cn(
        'w-10 h-10 rounded-lg overflow-hidden border border-border bg-muted shrink-0 flex items-center justify-center',
        className,
      )}
    >
      {url && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Package className="h-4 w-4 text-muted-foreground/40" aria-hidden />
      )}
    </div>
  );
}
