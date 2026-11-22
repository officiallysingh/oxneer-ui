'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { listingsApi, metadataApi, ListingVM, ManagedTypeVM } from '@oxneer/api';
import { ArrowLeft, Loader2, Pencil } from 'lucide-react';
import { Button } from '@oxneer/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import { ListingDetailContent } from '../../_components/ListingDetailContent';

export default function ListingViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<ListingVM | null>(null);
  const [managedType, setManagedType] = useState<ManagedTypeVM | null>(null);

  useEffect(() => {
    listingsApi
      .getListingById(id)
      .then(async (l) => {
        setListing(l);
        const embedded = l.embedded as Record<string, unknown> | undefined;
        if (embedded?.typeId) {
          try {
            setManagedType(await metadataApi.getManagedTypeById(String(embedded.typeId)));
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-muted-foreground">Listing not found.</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/admin/listings')}>
          Back to listings
        </Button>
      </div>
    );
  }

  const subCat = listing.subCategory;
  const subCatName =
    typeof subCat === 'object' && subCat !== null
      ? (subCat as { name?: string }).name
      : (subCat as string | undefined);

  return (
    <div className="space-y-6">
      <PageHeader
        title={listing.name}
        description={subCatName ?? 'Listing details'}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/admin/listings')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button size="sm" onClick={() => router.push(`/admin/listings/${id}/edit`)}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
        }
      />

      <ListingDetailContent listing={listing} managedType={managedType} />
    </div>
  );
}
