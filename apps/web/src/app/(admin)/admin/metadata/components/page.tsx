'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { metadataApi, ComponentVM } from '@oxneer/api';
import { Eye, Loader2, Trash2, RefreshCw, Plus, Pencil, Puzzle } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@oxneer/ui';
import { DataTable } from '@/components/common/data-table';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import Tip from '@/components/common/admin/Tip';
import { TagList } from '@/components/common/admin/TagList';
import { PhraseSearchBar } from '@/components/common/admin/PhraseSearchBar';
import { ComponentViewDialog } from '../_components/ComponentViewDialog';

export default function ComponentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [components, setComponents] = useState<ComponentVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const PAGE_SIZE = 16;
  const [pageIndex, setPageIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filter state — initialised from URL
  const [phrases, setPhrases] = useState<string[]>(() => searchParams.getAll('phrases'));

  const fetchComponents = async (ph?: string[], page = 0) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await metadataApi.getComponents({
        phrases: ph?.length ? ph : undefined,
        page,
        size: PAGE_SIZE,
      });
      setComponents(result.content ?? []);
      setPageIndex(page);
      setTotalPages(result.page?.totalPages ?? 0);
      setTotalRecords(result.page?.totalRecords ?? 0);
    } catch {
      setError('Failed to load components.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComponents(searchParams.getAll('phrases'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const buildUrl = (ph: string[]) => {
    const params = new URLSearchParams();
    ph.forEach((p) => params.append('phrases', p));
    return params.toString() ? `?${params.toString()}` : '';
  };

  const handleSearch = () => {
    router.replace(buildUrl(phrases), { scroll: false });
    fetchComponents(phrases.length ? phrases : undefined, 0);
  };

  const handleReset = () => {
    setPhrases([]);
    router.replace('', { scroll: false });
    fetchComponents([], 0);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmId(null);
    try {
      await metadataApi.deleteComponent(id);
      setComponents((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError('Failed to delete component.');
    } finally {
      setDeletingId(null);
    }
  };

  const columns: ColumnDef<ComponentVM>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
            <Puzzle className="h-3.5 w-3.5 text-violet-500" />
          </div>
          <span className="font-medium text-foreground text-sm">{row.original.name}</span>
        </div>
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
            const dataTypeLabel =
              typeof p.dataType === 'string'
                ? p.dataType
                : (Object.keys(p.dataType as object)[0] ?? '');

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
          max={3}
        />
      ),
    },
    {
      id: 'tags',
      header: 'Tags',
      cell: ({ row }) => (
        <TagList
          tags={(row.original.tags ?? []).map((t) => ({ id: t, label: t }))}
          variant="muted"
          max={3}
        />
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5">
          <Tip label="Preview component">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => setPreviewId(row.original.id)}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </Tip>
          <Tip label="Edit component">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => router.push(`/admin/metadata/components/${row.original.id}/edit`)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Tip>
          <Tip label="Delete component">
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
        title="Components"
        description="Reusable property groups for managed type definitions"
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => router.push('/admin/metadata/components/new')}>
              <Plus className="h-4 w-4 mr-1" />
              New component
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchComponents(phrases.length ? phrases : undefined, pageIndex)}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
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
        placeholder="Search components..."
      />

      <DataTable
        data={components}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No components found."
        hideSearch
        manualPagination
        pageIndex={pageIndex}
        pageCount={totalPages}
        rowCount={totalRecords}
        pageSize={PAGE_SIZE}
        onPageChange={(page) => fetchComponents(phrases.length ? phrases : undefined, page)}
      />

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete component?"
        description="This will permanently remove the component definition."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmId) handleDelete(confirmId);
        }}
        onCancel={() => setConfirmId(null)}
      />

      <ComponentViewDialog componentId={previewId} onClose={() => setPreviewId(null)} />
    </div>
  );
}
