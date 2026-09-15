'use client';

import { Search, X, Plus } from 'lucide-react';
import { Button } from '@repo/ui';

interface AuctionsTableToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClearFilters: () => void;
  onCreateAuction: () => void;
  hasActiveFilters: boolean;
}

export function AuctionsTableToolbar({
  searchQuery,
  onSearchChange,
  onClearFilters,
  onCreateAuction,
  hasActiveFilters,
}: AuctionsTableToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-xs">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search auctions by title, reference code..."
          className="w-full pl-10 pr-9 py-2 text-sm bg-background border border-border rounded-xl placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 justify-end">
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground rounded-xl"
          >
            <X className="h-3.5 w-3.5" />
            Clear Filters
          </Button>
        )}

        <Button
          size="sm"
          onClick={onCreateAuction}
          className="gap-2 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
        >
          <Plus className="h-4 w-4" />
          New Auction
        </Button>
      </div>
    </div>
  );
}
