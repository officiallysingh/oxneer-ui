'use client';

import { AuctionVM } from '@repo/api';
import { Calendar, IndianRupee, Building2, FileText } from 'lucide-react';
import { formatDateTime, formatLabel } from '@/components/common/admin/format';
import { DetailRow, SectionCard } from '@/components/common/admin/SectionCard';

interface AuctionOverviewTabProps {
  auction: AuctionVM;
}

export function AuctionOverviewTab({ auction }: AuctionOverviewTabProps) {
  const monetary = auction.monetaryOptions;
  const schedule = auction.schedule;
  const primaryUnit = auction.units?.[0] ?? auction.unit;
  const standingPrice = (primaryUnit as { standingPrice?: number })?.standingPrice;
  const startTime = schedule?.startTime ?? auction.startTime;
  const endTime = schedule?.endTime ?? auction.endTime;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* General Details */}
      <SectionCard title="General Information" icon={Building2}>
        <DetailRow label="Title">{auction.title ?? 'N/A'}</DetailRow>
        <DetailRow label="Reference ID">{auction.referenceId ?? 'N/A'}</DetailRow>
        <DetailRow label="Auction Type">{formatLabel(auction.type) || 'N/A'}</DetailRow>
        <DetailRow label="Auction Format">{formatLabel(auction.format) || 'N/A'}</DetailRow>
        <DetailRow label="Status">{formatLabel(auction.status) || 'N/A'}</DetailRow>
        <DetailRow label="Created At">{formatDateTime(auction.createdAt)}</DetailRow>
        <DetailRow label="Last Updated">{formatDateTime(auction.updatedAt)}</DetailRow>
      </SectionCard>

      {/* Schedule & Timing */}
      <SectionCard title="Schedule & Timing" icon={Calendar}>
        <DetailRow label="Start Time">{formatDateTime(startTime)}</DetailRow>
        <DetailRow label="End Time">{formatDateTime(endTime)}</DetailRow>
      </SectionCard>

      {/* Financials & Pricing */}
      <SectionCard title="Financial Configuration" icon={IndianRupee}>
        <DetailRow label="Opening Price">
          {primaryUnit?.openingPrice != null
            ? `₹${primaryUnit.openingPrice.toLocaleString()}`
            : 'N/A'}
        </DetailRow>
        <DetailRow label="Standing Price">
          {standingPrice != null ? `₹${standingPrice.toLocaleString()}` : 'N/A'}
        </DetailRow>
        <DetailRow label="Currency Unit">{monetary?.currencyUnit ?? 'INR'}</DetailRow>
        <DetailRow label="Rounding Mode">{formatLabel(monetary?.roundingMode) || 'N/A'}</DetailRow>
      </SectionCard>

      {/* Additional Metadata */}
      <SectionCard title="Description & Details" icon={FileText}>
        <div className="space-y-3 py-2 px-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Description
          </p>
          <p className="text-sm text-foreground/90 leading-relaxed bg-muted/30 p-3.5 rounded-xl border border-border/50">
            {auction.description || 'No description provided for this auction.'}
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
