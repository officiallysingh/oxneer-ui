'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { listingsApi, metadataApi, ListingVM, ManagedTypeVM } from '@oxneer/api';
import { Dialog, DialogContent, DialogTitle } from '@oxneer/ui';
import { ListingDetailContent } from './ListingDetailContent';

interface ListingViewDialogProps {
  listingId: string | null;
  onClose: () => void;
}

interface LoadedListing {
  id: string;
  listing: ListingVM | null;
  managedType: ManagedTypeVM | null;
}

export function ListingViewDialog({ listingId, onClose }: ListingViewDialogProps) {
  const [result, setResult] = useState<LoadedListing | null>(null);

  useEffect(() => {
    if (!listingId) return;
    let cancelled = false;

    listingsApi
      .getListingById(listingId)
      .then(async (l) => {
        if (cancelled) return;
        const embedded = l.embedded as Record<string, unknown> | undefined;
        let managedType: ManagedTypeVM | null = null;
        if (embedded?.typeId) {
          try {
            managedType = await metadataApi.getManagedTypeById(String(embedded.typeId));
          } catch {}
        }
        if (!cancelled) setResult({ id: listingId, listing: l, managedType });
      })
      .catch(() => {
        if (!cancelled) setResult({ id: listingId, listing: null, managedType: null });
      });

    return () => {
      cancelled = true;
    };
  }, [listingId]);

  const loading = !!listingId && result?.id !== listingId;
  const listing = result?.id === listingId ? result.listing : null;
  const managedType = result?.id === listingId ? result.managedType : null;

  return (
    <Dialog
      open={!!listingId}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogTitle className="sr-only">{listing?.name ?? 'Listing details'}</DialogTitle>
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : listing ? (
          <ListingDetailContent listing={listing} managedType={managedType} />
        ) : (
          <p className="text-sm text-muted-foreground py-20 text-center">Listing not found.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
