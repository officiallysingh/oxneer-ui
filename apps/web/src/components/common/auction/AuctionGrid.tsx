'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  auctionsApi,
  masterApi,
  type AuctionVM,
  type PublicAuctionsFilter,
  type CategoryVM,
} from '@repo/api';
import { resolveStr, formatLabel } from '@/components/common/admin/format';
import { formatDateTime } from '@/components/common/admin/format';
import {
  Loader2,
  Search,
  X,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Gavel,
  ChevronLeft,
  ChevronRight,
  Globe,
  Lock,
} from 'lucide-react';
import { Button, Input, Badge } from '@repo/ui';
import Select from 'react-select';
import type { MultiValue } from 'react-select';
import {
  GroupedSubcategorySelect,
  makeReactSelectStyles,
} from '@/components/common/admin/GroupedSubcategorySelect';

interface SelectOption {
  label: string;
  value: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const reactSelectStyles = makeReactSelectStyles<true>() as any;

// ── Helpers ───────────────────────────────────────────────────────────────────

function auctionStatusColor(status?: unknown): string {
  const s = resolveStr(status);
  const map: Record<string, string> = {
    LIVE: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    PUBLISHED: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    SCHEDULED: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    COMPLETED: 'bg-violet-500/10 text-violet-600 border-violet-500/30',
    CANCELLED: 'bg-red-500/10 text-red-600 border-red-500/30',
  };
  return map[s] ?? 'bg-muted text-muted-foreground border-border';
}

function CountdownOrSchedule({ startIso, endIso }: { startIso?: string; endIso?: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!startIso) return <span className="text-muted-foreground text-xs">Not scheduled</span>;

  const startMs = new Date(startIso).getTime();
  const endMs = endIso ? new Date(endIso).getTime() : null;

  if (now < startMs) {
    const diff = startMs - now;
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    if (diff < 86_400_000) {
      return (
        <span className="text-amber-600 dark:text-amber-400 font-medium text-xs tabular-nums">
          Starts in {h}h {m}m {s}s
        </span>
      );
    }
    return <span className="text-muted-foreground text-xs">{formatDateTime(startIso)}</span>;
  }

  if (endMs && now < endMs) {
    const diff = endMs - now;
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    return (
      <span className="text-emerald-600 dark:text-emerald-400 font-medium text-xs tabular-nums">
        Ends in {h}h {m}m {s}s
      </span>
    );
  }

  if (endMs && now >= endMs) {
    return <span className="text-muted-foreground text-xs">Ended</span>;
  }

  return <span className="text-muted-foreground text-xs">{formatDateTime(startIso)}</span>;
}

// ── Auction card for the public grid ─────────────────────────────────────────

function PublicAuctionCard({ auction, index }: { auction: AuctionVM; index: number }) {
  const router = useRouter();
  const status = resolveStr(auction.status);
  const direction = resolveStr(auction.protocol?.direction);
  const accessibility = resolveStr(auction.protocol?.accessibility);
  const currency = resolveStr(auction.monetaryOptions?.currencyUnit);
  const statusColor = auctionStatusColor(auction.status);
  const DirectionIcon = direction === 'REVERSE' ? TrendingDown : TrendingUp;
  const AccessIcon = accessibility === 'PUBLIC' ? Globe : Lock;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      role="link"
      tabIndex={0}
      aria-label={`View details for ${auction.title}`}
      className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      onClick={() => router.push(`/auctions/${auction.id}`)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          router.push(`/auctions/${auction.id}`);
        }
      }}
    >
      {/* Status bar */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColor}`}
        >
          {status === 'LIVE' && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          )}
          {formatLabel(auction.status)}
        </span>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <AccessIcon className="h-3 w-3" />
          <DirectionIcon className="h-3 w-3" />
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Gavel className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {auction.title}
            </h3>
            {auction.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {auction.description}
              </p>
            )}
          </div>
        </div>

        {/* Schedule */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {status === 'LIVE' ? (
            <Clock className="h-3 w-3 shrink-0" />
          ) : (
            <Calendar className="h-3 w-3 shrink-0" />
          )}
          <CountdownOrSchedule
            startIso={auction.schedule?.startTime}
            endIso={auction.schedule?.endTime}
          />
        </div>

        {/* Price + format */}
        <div className="flex items-end justify-between border-t border-border/50 pt-3">
          <div>
            {auction.unit?.openingPrice != null ? (
              <>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Opening
                </p>
                <p className="text-base font-bold text-primary">
                  {currency} {auction.unit.openingPrice.toLocaleString()}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">—</p>
            )}
          </div>
          {auction.format && (
            <Badge variant="secondary" className="text-[10px]">
              {formatLabel(auction.format)}
            </Badge>
          )}
        </div>
      </div>

      {/* Keep the primary action visible on touch devices as well as hover. */}
      <div className="px-4 pb-4">
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-1.5 border-primary/40 text-primary hover:border-primary hover:bg-primary hover:text-primary-foreground"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/auctions/${auction.id}`);
          }}
        >
          <Gavel className="h-3.5 w-3.5" />
          View &amp; Join
        </Button>
      </div>
    </motion.div>
  );
}

// ── Main grid ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12;

const AuctionGrid = () => {
  const [auctions, setAuctions] = useState<AuctionVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);

  // Search state
  const [phrase, setPhrase] = useState('');
  const [pendingPhrase, setPendingPhrase] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [tillDate, setTillDate] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<SelectOption[]>([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState<SelectOption[]>([]);
  const [categories, setCategories] = useState<CategoryVM[]>([]);
  const catInstanceId = useId();
  const subInstanceId = useId();

  // Fetch categories on mount
  useEffect(() => {
    masterApi
      .getCategories(true)
      .then((cats) => setCategories(cats))
      .catch(() => {});
  }, []);

  const categoryOptions: SelectOption[] = categories.map((c) => ({
    label: c.name,
    value: c.id,
  }));

  const fetchAuctions = useCallback(
    async (opts: PublicAuctionsFilter & { pageOverride?: number } = {}) => {
      setLoading(true);
      try {
        const result = await auctionsApi.getPublicAuctions({
          phrases: opts.phrases,
          categories: opts.categories,
          subCategories: opts.subCategories,
          fromTime: opts.fromTime,
          tillTime: opts.tillTime,
          page: opts.pageOverride ?? page,
        });
        setAuctions(result.content ?? []);
        setHasNext(result.page?.hasNext ?? false);
        setTotalRecords(result.page?.totalRecords ?? 0);
      } catch {
        // Non-fatal — show empty state
        setAuctions([]);
      } finally {
        setLoading(false);
      }
    },
    [page],
  );

  // Initial load
  useEffect(() => {
    fetchAuctions({ pageOverride: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    const newPhrase = pendingPhrase.trim();
    setPhrase(newPhrase);
    setPage(0);
    fetchAuctions({
      phrases: newPhrase ? [newPhrase] : undefined,
      categories: selectedCategories.map((o) => o.value),
      subCategories: selectedSubCategories.map((o) => o.value),
      fromTime: fromDate ? new Date(fromDate).toISOString() : undefined,
      tillTime: tillDate ? new Date(`${tillDate}T23:59:59`).toISOString() : undefined,
      pageOverride: 0,
    });
  };

  const handleReset = () => {
    setPendingPhrase('');
    setPhrase('');
    setFromDate('');
    setTillDate('');
    setSelectedCategories([]);
    setSelectedSubCategories([]);
    setPage(0);
    fetchAuctions({ pageOverride: 0 });
  };

  const handlePageChange = (delta: number) => {
    const next = page + delta;
    if (next < 0) return;
    setPage(next);
    fetchAuctions({
      phrases: phrase ? [phrase] : undefined,
      categories: selectedCategories.map((o) => o.value),
      subCategories: selectedSubCategories.map((o) => o.value),
      fromTime: fromDate ? new Date(fromDate).toISOString() : undefined,
      tillTime: tillDate ? new Date(`${tillDate}T23:59:59`).toISOString() : undefined,
      pageOverride: next,
    });
  };

  return (
    <section id="auctions" className="py-20">
      <div className="container mx-auto px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            Featured <span className="text-gradient-gold">Auctions</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md font-body text-muted-foreground">
            Browse live and upcoming auctions open for participation.
          </p>
        </motion.div>

        {/* Search / filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mt-10  rounded-2xl border border-border bg-card/60 p-4 shadow-sm backdrop-blur"
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1 space-y-1.5">
              <label className="font-body text-xs uppercase tracking-wider text-muted-foreground">
                Search
              </label>
              <Input
                value={pendingPhrase}
                onChange={(e) => setPendingPhrase(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search auctions..."
              />
            </div>

            <div className="min-w-[150px] space-y-1.5">
              <label className="font-body text-xs uppercase tracking-wider text-muted-foreground">
                From
              </label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>

            <div className="min-w-[150px] space-y-1.5">
              <label className="font-body text-xs uppercase tracking-wider text-muted-foreground">
                Till
              </label>
              <Input type="date" value={tillDate} onChange={(e) => setTillDate(e.target.value)} />
            </div>

            <div className="min-w-[200px] space-y-1.5">
              <label className="font-body text-xs uppercase tracking-wider text-muted-foreground">
                Categories
              </label>
              <Select<SelectOption, true>
                isMulti
                instanceId={catInstanceId}
                options={categoryOptions}
                value={selectedCategories}
                onChange={(vals: MultiValue<SelectOption>) => {
                  setSelectedCategories([...vals]);
                  // Clear subcategories that no longer belong to selected cats
                  const catIds = new Set(vals.map((v) => v.value));
                  setSelectedSubCategories((prev) =>
                    prev.filter((s) => {
                      const ownerCat = categories.find((c) =>
                        c.subCategories?.some((sc) => sc.id === s.value),
                      );
                      return ownerCat && catIds.has(ownerCat.id);
                    }),
                  );
                }}
                placeholder="All categories"
                styles={reactSelectStyles}
              />
            </div>

            <div className="min-w-[200px] space-y-1.5">
              <label className="font-body text-xs uppercase tracking-wider text-muted-foreground">
                Sub-categories
              </label>
              <GroupedSubcategorySelect
                isMulti
                instanceId={subInstanceId}
                categories={
                  selectedCategories.length > 0
                    ? categories.filter((c) => selectedCategories.some((s) => s.value === c.id))
                    : categories
                }
                value={selectedSubCategories.map((o) => o.value)}
                onChange={(ids) => {
                  const allSubs = categories.flatMap((c) => c.subCategories ?? []);
                  setSelectedSubCategories(
                    ids
                      .map((id) => allSubs.find((s) => s.id === id))
                      .filter(Boolean)
                      .map((s) => ({ label: s!.name, value: s!.id })),
                  );
                }}
                placeholder="All sub-categories"
              />
            </div>

            <div className="flex gap-2 pb-0.5">
              <Button variant="gold" size="sm" onClick={handleSearch} className="gap-1.5">
                <Search className="h-3.5 w-3.5" />
                Search
              </Button>
              <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5">
                <X className="h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Grid */}
        {loading ? (
          <div className="mt-16 flex justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Loading auctions...</p>
            </div>
          </div>
        ) : auctions.length === 0 ? (
          <div className="mt-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Gavel className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-body text-muted-foreground text-sm">
              No public auctions available right now. Check back soon.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {auctions.map((auction, i) => (
                <PublicAuctionCard key={auction.id} auction={auction} index={i} />
              ))}
            </div>

            {/* Pagination */}
            {totalRecords > PAGE_SIZE && (
              <div className="mt-10 flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(-1)}
                  disabled={page === 0 || loading}
                  className="gap-1.5"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <span className="text-sm text-muted-foreground">Page {page + 1}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={!hasNext || loading}
                  className="gap-1.5"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default AuctionGrid;
