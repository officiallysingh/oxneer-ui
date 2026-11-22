'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@oxneer/ui';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { useAuctionView } from './_hooks/useAuctionView';
import { AuctionViewContent } from './_components/AuctionViewContent';
import { AuctionViewSkeleton } from './_components/AuctionViewSkeleton';

export default function AuctionViewPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, participants, reload } = useAuctionView(id);

  if (loading) return <AuctionViewSkeleton />;

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16">
        <ErrorAlert message={error ?? 'Could not load the auction.'} />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reload}>
            Try again
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/auctions">
              <ArrowLeft />
              Back to auctions
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return <AuctionViewContent data={data} participants={participants} reload={reload} />;
}
