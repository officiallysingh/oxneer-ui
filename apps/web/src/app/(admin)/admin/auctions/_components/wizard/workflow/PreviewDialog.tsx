'use client';

import type { ReactNode } from 'react';
import { Eye } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui';

/** A one-line summary of what participants will see, with a Preview button
 *  that opens the full view in a dialog. Keeps step editors short: the
 *  preview is there when wanted, not always. */
export function PreviewDialog({
  summary,
  title,
  description,
  disabled,
  children,
}: {
  /** e.g. "8 fields · 3 required". */
  summary: ReactNode;
  /** Dialog title, e.g. "What participants fill in". */
  title: string;
  description?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-md border border-dashed border-input bg-muted/20 px-3 py-2">
      <p className="min-w-0 text-[11px] text-muted-foreground">{summary}</p>
      <Dialog>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-7 gap-1.5 px-2.5 text-xs"
          >
            <Eye className="h-3.5 w-3.5" aria-hidden />
            Preview
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="pt-1">{children}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
