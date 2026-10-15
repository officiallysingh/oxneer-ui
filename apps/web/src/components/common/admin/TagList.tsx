'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

type TagVariant = 'primary' | 'muted' | 'info' | 'outline';

interface Tag {
  id: string;
  label: string;
  mono?: boolean;
  /** Overrides the list-level variant for this tag. */
  variant?: TagVariant;
}

interface TagListProps {
  tags: Tag[];
  max?: number;
  variant?: TagVariant;
}

const TAG_CLASSES: Record<TagVariant, string> = {
  primary: 'bg-primary/10 text-primary border border-primary/20',
  muted: 'bg-muted text-muted-foreground border border-border',
  info: 'bg-info/10 text-info border border-transparent',
  outline: 'bg-transparent text-foreground border border-border',
};

interface PopoverPos {
  top: number;
  left: number;
}

export function TagList({ tags, max = 2, variant = 'primary' }: TagListProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PopoverPos | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const openPopover = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, left: rect.left });
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if ('key' in e && e.key !== 'Escape') return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  if (!tags.length) return <span className="text-xs text-muted-foreground">—</span>;

  const visible = tags.slice(0, max);
  const hidden = tags.slice(max);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((t) => (
        <TagChip key={t.id} tag={t} fallback={variant} />
      ))}

      {hidden.length > 0 && (
        <>
          <button
            ref={btnRef}
            type="button"
            onClick={openPopover}
            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors border border-border"
          >
            +{hidden.length} more
          </button>

          {open &&
            pos &&
            typeof document !== 'undefined' &&
            createPortal(
              <>
                {/* backdrop to close; stop propagation so React doesn't bubble the click to a clickable parent row */}
                <div
                  className="fixed inset-0 z-[9998]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                  }}
                />
                <div
                  className="fixed z-[9999] min-w-[160px] max-w-[280px] rounded-lg border border-border bg-card shadow-xl p-2.5"
                  style={{ top: pos.top, left: pos.left }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-wrap gap-1">
                    {hidden.map((t) => (
                      <TagChip key={t.id} tag={t} fallback={variant} />
                    ))}
                  </div>
                </div>
              </>,
              document.body,
            )}
        </>
      )}
    </div>
  );
}

function TagChip({ tag, fallback }: { tag: Tag; fallback: TagVariant }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${tag.mono ? 'font-mono' : ''} ${TAG_CLASSES[tag.variant ?? fallback]}`}
    >
      {tag.label}
    </span>
  );
}
