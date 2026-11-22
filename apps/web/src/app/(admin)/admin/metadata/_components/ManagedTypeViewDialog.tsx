'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { metadataApi, ManagedTypeVM } from '@oxneer/api';
import { Dialog, DialogContent, DialogTitle } from '@oxneer/ui';
import { TagList } from '@/components/common/admin/TagList';
import { PropertyFormPreview, ListingViewPreview } from './PropertyFormPreview';

interface ManagedTypeViewDialogProps {
  typeId: string | null;
  onClose: () => void;
}

export function ManagedTypeViewDialog({ typeId, onClose }: ManagedTypeViewDialogProps) {
  const [result, setResult] = useState<{ id: string; type: ManagedTypeVM | null } | null>(null);
  const [previewTab, setPreviewTab] = useState<'form' | 'preview'>('form');
  const [tabResetId, setTabResetId] = useState(typeId);

  if (typeId !== tabResetId) {
    setTabResetId(typeId);
    setPreviewTab('form');
  }

  useEffect(() => {
    if (!typeId) return;
    let cancelled = false;

    metadataApi
      .getManagedTypeById(typeId)
      .then((t) => {
        if (!cancelled) setResult({ id: typeId, type: t });
      })
      .catch(() => {
        if (!cancelled) setResult({ id: typeId, type: null });
      });

    return () => {
      cancelled = true;
    };
  }, [typeId]);

  const loading = !!typeId && result?.id !== typeId;
  const managedType = result?.id === typeId ? result.type : null;

  return (
    <Dialog
      open={!!typeId}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogTitle className="sr-only">{managedType?.name ?? 'Details'}</DialogTitle>
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : managedType ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{managedType.name}</h2>
                {managedType.description && (
                  <p className="text-sm text-muted-foreground mt-1">{managedType.description}</p>
                )}
                {managedType.tags && managedType.tags.length > 0 && (
                  <div className="mt-2">
                    <TagList tags={managedType.tags.map((t) => ({ id: t, label: t }))} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5 shrink-0">
                {(
                  [
                    { key: 'form', label: 'Form preview' },
                    { key: 'preview', label: 'Listing preview' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setPreviewTab(tab.key)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      previewTab === tab.key
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            {previewTab === 'form' ? (
              <PropertyFormPreview key="form" properties={managedType.properties ?? []} />
            ) : (
              <ListingViewPreview
                key="preview"
                properties={managedType.properties ?? []}
                title={managedType.name}
              />
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-20 text-center">Not found.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
