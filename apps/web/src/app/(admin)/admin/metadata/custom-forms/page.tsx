'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { metadataApi, ManagedTypeVM } from '@oxneer/api';
import { Loader2, Trash2, RefreshCw, Plus, Pencil, Eye, Copy } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Label } from '@oxneer/ui';
import { DataTable } from '@/components/common/data-table';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import Tip from '@/components/common/admin/Tip';
import { TagList } from '@/components/common/admin/TagList';
import { PhraseSearchBar } from '@/components/common/admin/PhraseSearchBar';
import { ManagedTypeViewDialog } from '../_components/ManagedTypeViewDialog';
import { prepareManagedTypeForCreate } from '../_components/types';

const TYPE = 'CUSTOM_FORM' as const;

export default function CustomFormsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [types, setTypes] = useState<ManagedTypeVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicating, setDuplicating] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
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
      setError('Failed to load custom forms.');
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
      setError('Failed to delete custom form.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenDuplicate = (t: ManagedTypeVM) => {
    setDuplicateId(t.id);
    setDuplicateName(`Copy of ${t.name}`);
    setDuplicateError(null);
  };

  const handleDuplicate = async () => {
    if (!duplicateId) return;
    const orig = types.find((t) => t.id === duplicateId);
    if (!orig) return;
    if (!duplicateName.trim()) {
      setDuplicateError('Name is required.');
      return;
    }
    setDuplicating(true);
    setDuplicateError(null);
    try {
      const nextDescription = (orig.description ?? '').trim();
      const uniqueDescription = nextDescription
        ? `${nextDescription} (Copy ${Date.now().toString(36)})`
        : `Copy ${Date.now().toString(36)}`;

      await metadataApi.createManagedType(
        prepareManagedTypeForCreate({
          ...orig,
          name: duplicateName.trim(),
          description: uniqueDescription,
          type: TYPE,
        }),
      );
      setDuplicateId(null);
      setDuplicateName('');
      // refresh list
      fetchTypes(phrases.length ? phrases : undefined, pageIndex);
    } catch {
      setDuplicateError('Failed to duplicate custom form.');
    } finally {
      setDuplicating(false);
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
          <Tip label="View form">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => setViewId(row.original.id)}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </Tip>
          <Tip label="Edit form">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => router.push(`/admin/metadata/custom-forms/${row.original.id}/edit`)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Tip>
          <Tip label="Duplicate form">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => handleOpenDuplicate(row.original)}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </Tip>
          <Tip label="Delete form">
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
        title="Custom Forms"
        description="Manage auction workflow step form templates"
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => router.push('/admin/metadata/custom-forms/new')}>
              <Plus className="h-4 w-4 mr-1" />
              New form
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchTypes(phrases.length ? phrases : undefined, pageIndex)}
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
        placeholder="Search custom forms..."
      />

      <DataTable
        data={types}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No custom forms found."
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
        title="Delete custom form?"
        description="This will permanently remove the form template."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmId) handleDelete(confirmId);
        }}
        onCancel={() => setConfirmId(null)}
      />

      {/* Duplicate dialog */}
      <Dialog
        open={duplicateId !== null}
        onOpenChange={(o) => {
          if (!o) setDuplicateId(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Duplicate custom form</DialogTitle>
            <div className="text-sm text-muted-foreground">
              Provide a name for the duplicated form.
            </div>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="dup-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dup-name"
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                placeholder="New form name"
                autoFocus
              />
              {duplicateError && <p className="text-xs text-destructive">{duplicateError}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDuplicateId(null)}
                disabled={duplicating}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleDuplicate} disabled={duplicating}>
                {duplicating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Duplicate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ManagedTypeViewDialog typeId={viewId} onClose={() => setViewId(null)} />
    </div>
  );
}
