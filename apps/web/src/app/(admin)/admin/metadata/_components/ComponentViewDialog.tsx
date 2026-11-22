'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { metadataApi, ComponentVM } from '@oxneer/api';
import { Dialog, DialogContent, DialogTitle } from '@oxneer/ui';
import { TagList } from '@/components/common/admin/TagList';
import { PropertyFormPreview, ListingViewPreview } from './PropertyFormPreview';

interface ComponentViewDialogProps {
  componentId: string | null;
  onClose: () => void;
}

export function ComponentViewDialog({ componentId, onClose }: ComponentViewDialogProps) {
  const [result, setResult] = useState<{ id: string; component: ComponentVM | null } | null>(null);
  const [previewTab, setPreviewTab] = useState<'form' | 'preview'>('form');
  const [tabResetId, setTabResetId] = useState(componentId);

  if (componentId !== tabResetId) {
    setTabResetId(componentId);
    setPreviewTab('form');
  }

  useEffect(() => {
    if (!componentId) return;
    let cancelled = false;

    metadataApi
      .getComponentById(componentId)
      .then((c) => {
        if (!cancelled) setResult({ id: componentId, component: c });
      })
      .catch(() => {
        if (!cancelled) setResult({ id: componentId, component: null });
      });

    return () => {
      cancelled = true;
    };
  }, [componentId]);

  const loading = !!componentId && result?.id !== componentId;
  const component = result?.id === componentId ? result.component : null;

  return (
    <Dialog
      open={!!componentId}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogTitle className="sr-only">{component?.name ?? 'Component Preview'}</DialogTitle>
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : component ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{component.name}</h2>
                {component.description && (
                  <p className="text-sm text-muted-foreground mt-1">{component.description}</p>
                )}
                {component.tags && component.tags.length > 0 && (
                  <div className="mt-2">
                    <TagList tags={component.tags.map((t) => ({ id: t, label: t }))} />
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
              <PropertyFormPreview key="form" properties={component.properties ?? []} />
            ) : (
              <ListingViewPreview
                key="preview"
                properties={component.properties ?? []}
                title={component.name}
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
