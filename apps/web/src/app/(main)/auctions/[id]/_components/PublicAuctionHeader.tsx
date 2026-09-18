'use client';

import { useRouter } from 'next/navigation';
import { AuctionVM } from '@repo/api';
import { Button } from '@repo/ui';
import { ArrowLeft, Building2, Globe, Lock, TrendingUp, TrendingDown, Hash } from 'lucide-react';
import { StatusBadge } from '@/components/common/admin/AuctionStatusBadge';
import { formatLabel, resolveStr } from '@/components/common/admin/format';

interface PublicAuctionHeaderProps {
  auction: AuctionVM;
}

export function PublicAuctionHeader({ auction }: PublicAuctionHeaderProps) {
  const router = useRouter();
  const isPublic = resolveStr(auction.protocol?.accessibility) === 'PUBLIC';
  const isReverse = resolveStr(auction.protocol?.direction) === 'REVERSE';
  const AccessIcon = isPublic ? Globe : Lock;
  const DirIcon = isReverse ? TrendingDown : TrendingUp;
  const typeStr = resolveStr(auction.type);

  return (
    <div className="space-y-4 bg-card border border-border rounded-3xl p-6 shadow-xs">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/auctions')}
        className="gap-2 text-muted-foreground hover:text-foreground -ml-2 rounded-xl"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Auctions
      </Button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div className="space-y-2.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {auction.title || 'Untitled Auction'}
            </h1>
            <StatusBadge value={auction.status} size="md" />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {auction.referenceId && (
              <span className="flex items-center gap-1.5 font-medium text-foreground bg-muted/60 px-2.5 py-1 rounded-lg">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                Ref: {auction.referenceId}
              </span>
            )}

            {typeStr && (
              <span className="flex items-center gap-1.5 bg-primary/10 text-primary font-medium px-2.5 py-1 rounded-lg">
                <Building2 className="h-3.5 w-3.5" />
                {formatLabel(typeStr)}
              </span>
            )}

            <span className="flex items-center gap-1.5 bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium px-2.5 py-1 rounded-lg">
              <AccessIcon className="h-3.5 w-3.5" />
              {isPublic ? 'Public Auction' : 'Invite Only'}
            </span>

            <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium px-2.5 py-1 rounded-lg">
              <DirIcon className="h-3.5 w-3.5" />
              {isReverse ? 'Reverse Auction' : 'Forward Auction'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
