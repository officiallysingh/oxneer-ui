'use client';

import { useEffect, useState } from 'react';
import { Search, Puzzle, Loader2 } from 'lucide-react';
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  cn,
} from '@oxneer/ui';
import { metadataApi, type ComponentVM, type PropertyDef } from '@oxneer/api';
import { normalizeProperties } from './types';

interface ComponentPickerProps {
  open: boolean;
  onClose: () => void;
  onInsert: (properties: PropertyDef[]) => void;
}

function deepCopy(properties: PropertyDef[]): PropertyDef[] {
  return properties.map((p) => {
    const copy: PropertyDef = { ...p };
    if (copy.value?.length) copy.value = deepCopy(copy.value);
    if (copy.subProperties) copy.subProperties = deepCopy([copy.subProperties])[0]!;
    return copy;
  });
}

// ── Content (mounts only when open, so state resets naturally on re-open) ─────

function ComponentPickerContent({
  onClose,
  onInsert,
}: {
  onClose: () => void;
  onInsert: (properties: PropertyDef[]) => void;
}) {
  const [components, setComponents] = useState<ComponentVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ComponentVM | null>(null);

  useEffect(() => {
    metadataApi
      .getComponents()
      .then((res) => setComponents(res.content ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = components.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.tags?.some((t) => t.toLowerCase().includes(q))
    );
  });

  const handleInsert = () => {
    if (!selected?.properties?.length) return;
    onInsert(normalizeProperties(deepCopy(selected.properties)));
    onClose();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Insert component</DialogTitle>
      </DialogHeader>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search components…"
          className="pl-8 h-8 text-sm"
          autoFocus
        />
      </div>

      <div className="max-h-72 overflow-y-auto -mx-6 px-6 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {search ? 'No components match your search.' : 'No components found.'}
          </p>
        ) : (
          filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelected(c)}
              className={cn(
                'w-full text-left rounded-lg px-3 py-2.5 transition-colors flex items-start gap-3 border',
                selected?.id === c.id
                  ? 'bg-primary/10 border-primary/30'
                  : 'border-transparent hover:bg-muted',
              )}
            >
              <div className="h-7 w-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <Puzzle className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {c.properties?.length ?? 0}{' '}
                    {c.properties?.length === 1 ? 'property' : 'properties'}
                  </span>
                </div>
                {c.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {c.description}
                  </p>
                )}
                {!!c.properties?.length && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {c.properties.slice(0, 4).map((p) => (
                      <span
                        key={p.name}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                      >
                        {p.label || p.name}
                      </span>
                    ))}
                    {c.properties.length > 4 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        +{c.properties.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleInsert} disabled={!selected}>
          Insert
        </Button>
      </DialogFooter>
    </>
  );
}

// ── Shell ──────────────────────────────────────────────────────────────────────

export function ComponentPicker({ open, onClose, onInsert }: ComponentPickerProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        {open && <ComponentPickerContent onClose={onClose} onInsert={onInsert} />}
      </DialogContent>
    </Dialog>
  );
}
