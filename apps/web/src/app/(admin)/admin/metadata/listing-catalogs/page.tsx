'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { metadataApi, ManagedTypeVM } from '@oxneer/api';
import { Loader2, Trash2, RefreshCw, Plus, Pencil, Eye } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { Button, cn } from '@oxneer/ui';
import { DataTable } from '@/components/common/data-table';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import Tip from '@/components/common/admin/Tip';
import { TagList } from '@/components/common/admin/TagList';
import { PhraseSearchBar } from '@/components/common/admin/PhraseSearchBar';
import { ManagedTypeViewDialog } from '../_components/ManagedTypeViewDialog';

const TYPE = 'CATALOGUE' as const;

export default function ListingCatalogsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [types, setTypes] = useState<ManagedTypeVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const PAGE_SIZE = 16;
  const [pageIndex, setPageIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  const [phrases, setPhrases] = useState<string[]>(() => searchParams.getAll('phrases'));

  const fetchTypes = async (ph?: string[], page = 0) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await metadataApi.getManagedTypes({
        phrases: ph?.length ? ph : undefined,
        type: TYPE,
        expand: true,
        page,
        size: PAGE_SIZE,
      });
      setTypes(result.content ?? []);
      setPageIndex(page);
      setTotalPages(result.page?.totalPages ?? 0);
      setTotalRecords(result.page?.totalRecords ?? 0);
    } catch {
      setError('Failed to load listing catalogs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes(searchParams.getAll('phrases'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const buildUrl = (ph: string[]) => {
    const params = new URLSearchParams();
    ph.forEach((p) => params.append('phrases', p));
    return params.toString() ? `?${params.toString()}` : '';
  };

  const handleSearch = () => {
    router.replace(buildUrl(phrases), { scroll: false });
    fetchTypes(phrases.length ? phrases : undefined, 0);
  };

  const handleReset = () => {
    setPhrases([]);
    router.replace('', { scroll: false });
    fetchTypes([], 0);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmId(null);
    try {
      await metadataApi.deleteManagedType(id);
      setTypes((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setError('Failed to delete listing catalog.');
    } finally {
      setDeletingId(null);
    }
  };

  const columns: ColumnDef<ManagedTypeVM>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium text-foreground text-sm">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm line-clamp-1">
          {row.original.description ?? '—'}
        </span>
      ),
    },
    {
      id: 'properties',
      header: 'Properties',
      cell: ({ row }) => (
        <TagList
          tags={(row.original.properties ?? []).map((p) => {
            const dataTypeLabel = Object.keys(p.dataType)[0] || '';

            const formattedLabel = dataTypeLabel
              .replace(/_/g, ' ')
              .toLowerCase()
              .replace(/\b\w/g, (char) => char.toUpperCase());

            return {
              id: p.name,
              label: `${p.label} (${formattedLabel})`,
            };
          })}
          variant="muted"
          max={2}
        />
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5">
          <Tip label="View catalog">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => setViewId(row.original.id)}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </Tip>
          <Tip label="Edit catalog">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() =>
                router.push(`/admin/metadata/listing-catalogs/${row.original.id}/edit`)
              }
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Tip>
          <Tip label="Delete catalog">
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
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Listing Catalogs"
        description="Manage property templates used by listings"
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => router.push('/admin/metadata/listing-catalogs/new')}>
              <Plus className="h-4 w-4 mr-1" />
              New catalog
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchTypes(phrases.length ? phrases : undefined, pageIndex)}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-4 w-4 mr-1', isLoading ? 'animate-spin' : '')} />
              Refresh
            </Button>
          </div>
        }
      />

      {error && <ErrorAlert message={error} />}

      <PhraseSearchBar
        phrases={phrases}
        onPhrasesChange={setPhrases}
        onSearch={handleSearch}
        onReset={handleReset}
        placeholder="Search listing catalogs..."
      />

      <DataTable
        data={types}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No listing catalogs found."
        hideSearch
        manualPagination
        pageIndex={pageIndex}
        pageCount={totalPages}
        rowCount={totalRecords}
        pageSize={PAGE_SIZE}
        onPageChange={(page) => fetchTypes(phrases.length ? phrases : undefined, page)}
      />

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete listing catalog?"
        description="This will permanently remove the catalog template."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmId) handleDelete(confirmId);
        }}
        onCancel={() => setConfirmId(null)}
      />

      <ManagedTypeViewDialog typeId={viewId} onClose={() => setViewId(null)} />
    </div>
  );
}
