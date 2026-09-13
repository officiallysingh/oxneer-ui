'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auctionsApi, masterApi, AuctionVM, CategoryVM } from '@repo/api';
import {
  Loader2,
  Trash2,
  RefreshCw,
  Plus,
  Eye,
  Pencil,
  ArrowUp,
  ArrowDown,
  Lock,
  Globe,
  Users,
  TrendingUp,
  DollarSign,
  Info,
  Search,
  X,
  CalendarClock,
  Send,
  Ban,
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { Button, Label, DateTimePicker, Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui';
import Select from 'react-select';
import type { MultiValue } from 'react-select';
import { DataTable } from '@/components/common/data-table';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import Tip from '@/components/common/admin/Tip';
import { StatusBadge } from '@/components/common/admin/AuctionStatusBadge';
import { PhrasesInput } from '@/components/common/admin/PhrasesInput';
import {
  GroupedSubcategorySelect,
  makeReactSelectStyles,
} from '@/components/common/admin/GroupedSubcategorySelect';
import { formatLabel, resolveStr } from '@/components/common/admin/format';

interface SelectOption {
  label: string;
  value: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const reactSelectStyles = makeReactSelectStyles<true>() as any;

function toIsoOrUndefined(localValue: string): string | undefined {
  if (!localValue) return undefined;
  const date = new Date(localValue);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

// ── Direction icon with tooltip ───────────────────────────────────────────────

function DirectionCell({ value }: { value?: unknown }) {
  const str = resolveStr(value);
  if (!str) return <span className="text-xs text-muted-foreground">—</span>;
  const isForward = str === 'FORWARD';
  const Icon = isForward ? ArrowUp : ArrowDown;
  const label = formatLabel(str);
  const detail = isForward
    ? 'Buyers bid upward — highest price wins'
    : 'Sellers bid downward — lowest price wins';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center gap-1.5 cursor-default rounded-full px-2 py-0.5 text-xs font-medium border ${
            isForward
              ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-700 border-amber-500/30'
          }`}
        >
          <Icon className="h-3 w-3 shrink-0" />
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[180px] text-xs text-center">
        {detail}
      </TooltipContent>
    </Tooltip>
  );
}

// ── Accessibility icon with tooltip ──────────────────────────────────────────

function AccessibilityCell({ value }: { value?: unknown }) {
  const str = resolveStr(value);
  if (!str) return <span className="text-xs text-muted-foreground">—</span>;
  const isPublic = str === 'PUBLIC';
  const Icon = isPublic ? Globe : Lock;
  const label = formatLabel(str);
  const detail = isPublic
    ? 'Open to all participants — no invite required'
    : 'Restricted access — participants must be invited';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center gap-1.5 cursor-default rounded-full px-2 py-0.5 text-xs font-medium border ${
            isPublic
              ? 'bg-blue-500/10 text-blue-700 border-blue-500/30'
              : 'bg-violet-500/10 text-violet-700 border-violet-500/30'
          }`}
        >
          <Icon className="h-3 w-3 shrink-0" />
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px] text-xs text-center">
        {detail}
      </TooltipContent>
    </Tooltip>
  );
}

// ── Protocol details cell (participant + offer visibility) ────────────────────

function ProtocolDetailsCell({ auction }: { auction: AuctionVM }) {
  const participantVis = resolveStr(auction.protocol?.participantVisibility);
  const offerVis = resolveStr(auction.protocol?.offerVisibility);
  if (!participantVis && !offerVis) return <span className="text-xs text-muted-foreground">—</span>;

  const participantLabel = participantVis ? formatLabel(participantVis) : null;
  const offerLabel = offerVis ? formatLabel(offerVis) : null;

  const tooltipContent = (
    <div className="space-y-2 text-xs min-w-[180px]">
      {participantLabel && (
        <div>
          <p className="font-semibold text-foreground/80 flex items-center gap-1">
            <Users className="h-3 w-3" /> Participant Visibility
          </p>
          <p className="text-muted-foreground mt-0.5">Identity visible to everyone</p>
          <p className="font-medium">{participantLabel}</p>
        </div>
      )}
      {offerLabel && (
        <div className={participantLabel ? 'pt-1.5 border-t border-border/40' : ''}>
          <p className="font-semibold text-foreground/80 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Offer Visibility
          </p>
          <p className="text-muted-foreground mt-0.5">Both price and rank visible to everyone</p>
          <p className="font-medium">{offerLabel}</p>
        </div>
      )}
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="p-3">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AuctionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [auctions, setAuctions] = useState<AuctionVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [confirmPublishId, setConfirmPublishId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const PAGE_SIZE = 20;
  const [pageIndex, setPageIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filter state — initialised from URL params
  const [phrases, setPhrases] = useState<string[]>(() => searchParams.getAll('phrases'));
  const [selectedCategories, setSelectedCategories] = useState<SelectOption[]>([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState<SelectOption[]>([]);
  const [categories, setCategories] = useState<CategoryVM[]>([]);
  const [fromTime, setFromTime] = useState(() => searchParams.get('fromTime') ?? '');
  const [tillTime, setTillTime] = useState(() => searchParams.get('tillTime') ?? '');
  const [accessibility, setAccessibility] = useState<string>(
    () => searchParams.get('accessibility') ?? '',
  );
  const [direction, setDirection] = useState<string>(() => searchParams.get('direction') ?? '');
  const [status, setStatus] = useState<string>(() => searchParams.get('status') ?? '');

  useEffect(() => {
    const catIds = searchParams.getAll('categories');
    const subCatIds = searchParams.getAll('subCategories');
    masterApi
      .getCategories(true)
      .then((cats) => {
        setCategories(cats);
        if (catIds.length) {
          setSelectedCategories(
            cats.filter((c) => catIds.includes(c.id)).map((c) => ({ label: c.name, value: c.id })),
          );
        }
        if (subCatIds.length) {
          const allSubs = cats.flatMap((c) => c.subCategories ?? []);
          setSelectedSubCategories(
            allSubs
              .filter((s) => subCatIds.includes(s.id))
              .map((s) => ({ label: s.name, value: s.id })),
          );
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const categoryOptions: SelectOption[] = categories.map((c) => ({
    label: c.name,
    value: c.id,
  }));

  const fetchAuctions = async (opts?: {
    phrases?: string[];
    categories?: string[];
    subCategories?: string[];
    statuses?: string[];
    accessibility?: string;
    direction?: string;
    fromTime?: string;
    tillTime?: string;
    page?: number;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const page = opts?.page ?? 0;
      const result = await auctionsApi.getAuctions({
        phrases: opts?.phrases?.length ? opts.phrases : undefined,
        categories: opts?.categories?.length ? opts.categories : undefined,
        subCategories: opts?.subCategories?.length ? opts.subCategories : undefined,
        statuses: opts?.statuses?.length ? opts.statuses : undefined,
        accessibility: opts?.accessibility || undefined,
        direction: opts?.direction || undefined,
        fromTime: opts?.fromTime,
        tillTime: opts?.tillTime,
        page,
        size: PAGE_SIZE,
      });
      setAuctions(result.content ?? []);
      setPageIndex(page);
      setTotalPages(result.page?.totalPages ?? 0);
      setTotalRecords(result.page?.totalRecords ?? 0);
    } catch {
      setError('Failed to load auctions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch on mount using any pre-existing URL params
    fetchAuctions({
      phrases: searchParams.getAll('phrases'),
      categories: searchParams.getAll('categories'),
      subCategories: searchParams.getAll('subCategories'),
      statuses: searchParams.get('status') ? [searchParams.get('status')!] : undefined,
      accessibility: searchParams.get('accessibility') ?? '',
      direction: searchParams.get('direction') ?? '',
      fromTime: toIsoOrUndefined(searchParams.get('fromTime') ?? ''),
      tillTime: toIsoOrUndefined(searchParams.get('tillTime') ?? ''),
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const buildFilterUrl = (
    ph: string[],
    cats: SelectOption[],
    subs: SelectOption[],
    from: string,
    till: string,
    acc: string,
    dir: string,
    st: string,
  ) => {
    const params = new URLSearchParams();
    ph.forEach((p) => params.append('phrases', p));
    cats.forEach((c) => params.append('categories', c.value));
    subs.forEach((s) => params.append('subCategories', s.value));
    if (from) params.set('fromTime', from);
    if (till) params.set('tillTime', till);
    if (acc) params.set('accessibility', acc);
    if (dir) params.set('direction', dir);
    if (st) params.set('status', st);
    return params.toString() ? `?${params.toString()}` : '';
  };

  const handleSearch = () => {
    router.replace(
      buildFilterUrl(
        phrases,
        selectedCategories,
        selectedSubCategories,
        fromTime,
        tillTime,
        accessibility,
        direction,
        status,
      ),
      { scroll: false },
    );
    fetchAuctions({
      phrases,
      categories: selectedCategories.map((o) => o.value),
      subCategories: selectedSubCategories.map((o) => o.value),
      statuses: status ? [status] : undefined,
      accessibility,
      direction,
      fromTime: toIsoOrUndefined(fromTime),
      tillTime: toIsoOrUndefined(tillTime),
      page: 0,
    });
  };

  const handleReset = () => {
    setPhrases([]);
    setSelectedCategories([]);
    setSelectedSubCategories([]);
    setFromTime('');
    setTillTime('');
    setAccessibility('');
    setDirection('');
    setStatus('');
    router.replace('', { scroll: false });
    fetchAuctions({ page: 0 });
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmId(null);
    try {
      await auctionsApi.deleteAuction(id);
      setAuctions((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setError('Failed to delete auction.');
    } finally {
      setDeletingId(null);
    }
  };

  const handlePublish = async (auction: AuctionVM) => {
    setPublishingId(auction.id);
    setConfirmPublishId(null);
    try {
      await auctionsApi.publishAuction(auction.id);
      setAuctions((prev) =>
        prev.map((a) => (a.id === auction.id ? { ...a, status: 'PUBLISHED' } : a)),
      );
    } catch {
      setError('Failed to publish auction.');
    } finally {
      setPublishingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    setConfirmCancelId(null);
    try {
      await auctionsApi.cancelAuction(id);
      setAuctions((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'CANCELLED' } : a)));
    } catch {
      setError('Failed to cancel auction.');
    } finally {
      setCancellingId(null);
    }
  };

  const columns: ColumnDef<AuctionVM>[] = [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => router.push(`/admin/auctions/${row.original.id}/view`)}
            className="font-medium text-sm text-foreground hover:text-primary hover:underline text-left truncate max-w-[200px] block"
          >
            {row.original.title}
          </button>
          {row.original.referenceId && (
            <span className="font-mono text-[10px] text-muted-foreground">
              {row.original.referenceId}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'format',
      header: 'Format / Type',
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <div className="text-sm text-foreground">{formatLabel(row.original.format)}</div>
          {row.original.type && (
            <div className="text-[11px] text-muted-foreground">
              {formatLabel(row.original.type)}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'accessibility',
      header: 'Access',
      cell: ({ row }) => <AccessibilityCell value={row.original.protocol?.accessibility} />,
    },
    {
      id: 'direction',
      header: 'Direction',
      cell: ({ row }) => <DirectionCell value={row.original.protocol?.direction} />,
    },
    {
      id: 'protocol',
      header: () => (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex items-center gap-1 cursor-default">
              Protocol <Info className="h-3 w-3 text-muted-foreground/60" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Participant &amp; offer visibility details
          </TooltipContent>
        </Tooltip>
      ),
      cell: ({ row }) => <ProtocolDetailsCell auction={row.original} />,
    },
    // {
    //   id: 'schedule',
    //   header: 'Schedule',
    //   cell: ({ row }) => {
    //     const start = row.original.schedule?.startTime;
    //     const end = row.original.schedule?.endTime;
    //     if (!start && !end) return <span className="text-xs text-muted-foreground">—</span>;
    //     return (
    //       <div className="space-y-0.5 text-xs">
    //         {start && (
    //           <div className="flex items-center gap-1 text-foreground">
    //             <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
    //             {formatDate(start)}
    //           </div>
    //         )}
    //         {end && <div className="text-muted-foreground pl-4">{formatDate(end)}</div>}
    //       </div>
    //     );
    //   },
    // },
    {
      id: 'currency',
      header: 'Currency',
      cell: ({ row }) => {
        const curr = resolveStr(row.original.monetaryOptions?.currencyUnit);
        if (!curr) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <span className="inline-flex items-center gap-1 font-mono text-xs font-medium text-foreground">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            {curr}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge value={row.original.status} size="sm" showIcon={false} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const status = resolveStr(row.original.status);
        // Delete stops being offered once the auction goes public — DRAFT and
        // SCHEDULED are the only pre-publish states.
        const canDelete = status === 'DRAFT' || status === 'SCHEDULED';
        // Cancellation only makes sense once an auction has a schedule/is public,
        // and before it reaches a terminal state.
        const canCancel = status === 'SCHEDULED' || status === 'PUBLISHED' || status === 'LIVE';
        return (
          <div className="flex items-center gap-0.5 justify-end">
            <Tip label="View">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => router.push(`/admin/auctions/${row.original.id}/view`)}
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </Tip>
            <Tip label="Edit">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => router.push(`/admin/auctions/${row.original.id}/edit`)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </Tip>
            {status === 'DRAFT' && (
              <Tip label="Schedule">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
                  onClick={() => router.push(`/admin/auctions/${row.original.id}/edit?step=5`)}
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                </Button>
              </Tip>
            )}
            {status === 'SCHEDULED' && (
              <Tip label="Publish">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10"
                  onClick={() => setConfirmPublishId(row.original.id)}
                  disabled={publishingId === row.original.id}
                >
                  {publishingId === row.original.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </Button>
              </Tip>
            )}
            {canCancel && (
              <Tip label="Cancel">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmCancelId(row.original.id)}
                  disabled={cancellingId === row.original.id}
                >
                  {cancellingId === row.original.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Ban className="h-3.5 w-3.5" />
                  )}
                </Button>
              </Tip>
            )}
            {canDelete && (
              <Tip label="Delete">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmId(row.original.id)}
                  disabled={deletingId === row.original.id}
                >
                  {deletingId === row.original.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </Tip>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auctions"
        description="Manage auctions"
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => router.push('/admin/auctions/new')}>
              <Plus className="h-4 w-4 mr-1" />
              New auction
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                fetchAuctions({
                  phrases,
                  categories: selectedCategories.map((o) => o.value),
                  subCategories: selectedSubCategories.map((o) => o.value),
                  statuses: status ? [status] : undefined,
                  accessibility,
                  direction,
                  fromTime: toIsoOrUndefined(fromTime),
                  tillTime: toIsoOrUndefined(tillTime),
                  page: pageIndex,
                })
              }
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {error && <ErrorAlert message={error} />}

      {/* Filter panel */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Phrases search */}
          <div className="flex-1 min-w-[220px] space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Search phrases</Label>
            <PhrasesInput
              value={phrases}
              onChange={setPhrases}
              placeholder="Type phrase and press Enter..."
            />
          </div>

          {/* Categories */}
          <div className="min-w-[220px] space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Categories</Label>
            <Select<SelectOption, true>
              isMulti
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

          {/* Subcategories */}
          <div className="min-w-[220px] space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Sub-categories</Label>
            <GroupedSubcategorySelect
              isMulti
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

          {/* Schedule from */}
          <div className="min-w-[200px] space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">From schedule time</Label>
            <DateTimePicker value={fromTime} onChange={setFromTime} placeholder="Any" />
          </div>

          {/* Schedule till */}
          <div className="min-w-[200px] space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Till schedule time</Label>
            <DateTimePicker value={tillTime} onChange={setTillTime} placeholder="Any" />
          </div>

          {/* Accessibility */}
          <div className="min-w-[160px] space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Accessibility</Label>
            <select
              value={accessibility}
              onChange={(e) => setAccessibility(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All</option>
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
            </select>
          </div>

          {/* Direction */}
          <div className="min-w-[160px] space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Direction</Label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All</option>
              <option value="FORWARD">Forward</option>
              <option value="REVERSE">Reverse</option>
            </select>
          </div>

          {/* Status */}
          <div className="min-w-[160px] space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All</option>
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="PUBLISHED">Published</option>
              <option value="LIVE">Live</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="COMPLETED">Completed</option>
              <option value="AWARDED">Awarded</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pb-0.5">
            <Button size="sm" onClick={handleSearch} className="gap-1.5">
              <Search className="h-3.5 w-3.5" />
              Search
            </Button>
            <Button size="sm" variant="outline" onClick={handleReset} className="gap-1.5">
              <X className="h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </div>
      </div>

      <DataTable
        data={auctions}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No auctions found."
        hideSearch
        manualPagination
        pageIndex={pageIndex}
        pageCount={totalPages}
        rowCount={totalRecords}
        pageSize={PAGE_SIZE}
        onPageChange={(page) =>
          fetchAuctions({
            phrases,
            categories: selectedCategories.map((o) => o.value),
            subCategories: selectedSubCategories.map((o) => o.value),
            statuses: status ? [status] : undefined,
            accessibility,
            direction,
            fromTime: toIsoOrUndefined(fromTime),
            tillTime: toIsoOrUndefined(tillTime),
            page,
          })
        }
      />

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete auction?"
        description="This will permanently remove the auction."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmId) handleDelete(confirmId);
        }}
        onCancel={() => setConfirmId(null)}
      />

      <ConfirmDialog
        open={confirmPublishId !== null}
        title="Publish auction?"
        description="This makes the auction publicly visible ahead of its scheduled start time."
        confirmLabel="Publish"
        onConfirm={() => {
          const auction = auctions.find((a) => a.id === confirmPublishId);
          if (auction) handlePublish(auction);
        }}
        onCancel={() => setConfirmPublishId(null)}
      />

      <ConfirmDialog
        open={confirmCancelId !== null}
        title="Cancel auction?"
        description="This will cancel the auction. Participants will no longer be able to place offers."
        confirmLabel="Cancel auction"
        onConfirm={() => {
          if (confirmCancelId) handleCancel(confirmCancelId);
        }}
        onCancel={() => setConfirmCancelId(null)}
      />
    </div>
  );
}
