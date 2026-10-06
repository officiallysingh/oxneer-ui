'use client';

import { useMemo, useState } from 'react';
import { masterApi, BankVM } from '@repo/api';
import { Landmark } from 'lucide-react';
import { Button } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import { SearchInput } from '@/components/common/admin/SearchInput';
import { ListToolbarActions } from '@/components/common/admin/ListToolbarActions';
import { LoadingBlock, EmptyState } from '@/components/common/admin/ListState';
import { RowActions } from '@/components/common/admin/RowActions';
import { useFetchList } from '@/hooks/admin/useFetchList';
import { AddBankDialog, EditBankDialog } from './_components/BankFormDialog';

export default function BanksPage() {
  const {
    data: banks,
    setData: setBanks,
    isLoading,
    error,
    setError,
    refresh,
  } = useFetchList<BankVM>(() => masterApi.getBanks(), { errorMessage: 'Failed to load banks.' });
  const [search, setSearch] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BankVM | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return banks;
    return banks.filter(
      (b) => b.name.toLowerCase().includes(q) || b.ifscPrefix.toLowerCase().includes(q),
    );
  }, [banks, search]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmId(null);
    try {
      await masterApi.deleteBank(id);
      setBanks((prev) => prev.filter((b) => b.id !== id));
    } catch {
      setError('Failed to delete bank.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Banks"
        description="Manage bank accounts"
        actions={
          <ListToolbarActions
            onAdd={() => setAddOpen(true)}
            addLabel="Add bank"
            onRefresh={refresh}
            refreshing={isLoading}
          />
        }
      />

      {error && <ErrorAlert message={error} />}

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search banks..."
        className="max-w-sm"
      />

      {isLoading ? (
        <LoadingBlock message="Loading banks..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Landmark}
          message={search.trim() ? 'No banks match your search.' : 'No banks yet.'}
          hint={search.trim() ? 'Try a different search term.' : 'Add a bank to get started.'}
          action={
            !search.trim() ? (
              <Button variant="gold" size="sm" onClick={() => setAddOpen(true)}>
                Add bank
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
          {filtered.map((bank) => (
            <div
              key={bank.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <Landmark className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-foreground text-sm">{bank.name}</span>
                <span className="font-mono text-xs text-muted-foreground ml-2">
                  {bank.ifscPrefix}
                </span>
              </div>
              <RowActions
                size="sm"
                editLabel="Edit bank"
                deleteLabel="Delete bank"
                deleting={deletingId === bank.id}
                onEdit={() => setEditTarget(bank)}
                onDelete={() => setConfirmId(bank.id)}
              />
            </div>
          ))}
        </div>
      )}

      <AddBankDialog open={addOpen} onOpenChange={setAddOpen} onCreated={refresh} />

      <EditBankDialog bank={editTarget} onClose={() => setEditTarget(null)} onUpdated={refresh} />

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete bank?"
        description="This will permanently remove the bank."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmId) handleDelete(confirmId);
        }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
