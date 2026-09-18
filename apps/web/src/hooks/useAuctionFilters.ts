import { useState, useMemo } from 'react';
import { AuctionVM } from '@repo/api';
import { resolveStr } from '../app/(admin)/admin/auctions/_components/PolicyShared';

export function useAuctionFilters(auctions: AuctionVM[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const filteredAuctions = useMemo(() => {
    return auctions.filter((auction) => {
      const query = searchQuery.toLowerCase().trim();
      const titleMatch = (auction.title ?? '').toLowerCase().includes(query);
      const refMatch = (auction.referenceId ?? '').toLowerCase().includes(query);
      const matchesQuery = query === '' || titleMatch || refMatch;

      const auctionStatus = resolveStr(auction.status).toUpperCase();
      const matchesStatus = statusFilter === 'ALL' || auctionStatus === statusFilter.toUpperCase();

      const auctionType = resolveStr(auction.type).toUpperCase();
      const matchesType = typeFilter === 'ALL' || auctionType === typeFilter.toUpperCase();

      return matchesQuery && matchesStatus && matchesType;
    });
  }, [auctions, searchQuery, statusFilter, typeFilter]);

  const counts = useMemo(() => {
    return {
      all: auctions.length,
      draft: auctions.filter((a) => resolveStr(a.status).toUpperCase() === 'DRAFT').length,
      published: auctions.filter((a) => resolveStr(a.status).toUpperCase() === 'PUBLISHED').length,
      live: auctions.filter((a) => {
        const st = resolveStr(a.status).toUpperCase();
        return st === 'LIVE' || st === 'RUNNING';
      }).length,
      completed: auctions.filter((a) => resolveStr(a.status).toUpperCase() === 'COMPLETED').length,
      cancelled: auctions.filter((a) => resolveStr(a.status).toUpperCase() === 'CANCELLED').length,
    };
  }, [auctions]);

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    filteredAuctions,
    counts,
  };
}
