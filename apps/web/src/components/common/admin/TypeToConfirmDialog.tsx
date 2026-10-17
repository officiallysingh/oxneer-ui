'use client';

import { useId, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  cn,
  Input,
  Label,
} from '@repo/ui';

interface TypeToConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  /** Extra content between the description and the input, e.g. affected items. */
  children?: ReactNode;
  /** The exact text the user must type, e.g. a username or permission name. */
  confirmText: string;
  /** Renders the confirm text (and input) in a monospace font, for code-like names. */
  monospace?: boolean;
  confirmLabel: string;
  onCancel: () => void;
  /** Resolves true when the action succeeded, which closes the dialog. */
  onConfirm: () => Promise<boolean>;
}

/** Destructive confirmation that only enables once the user types `confirmText`. */
export function TypeToConfirmDialog({
  open,
  title,
  description,
  children,
  confirmText,
  monospace,
  confirmLabel,
  onCancel,
  onConfirm,
}: TypeToConfirmDialogProps) {
  const inputId = useId();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const matches = typed.trim() === confirmText;

  const close = () => {
    setTyped('');
    onCancel();
  };

  const confirm = async () => {
    if (!matches) return;
    setBusy(true);
    const done = await onConfirm();
    setBusy(false);
    if (done) close();
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && !busy && close()}>
      <AlertDialogContent className="max-w-[460px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-lg">{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            confirm();
          }}
          className="space-y-1.5"
        >
          <Label htmlFor={inputId}>
            Type <b className={cn(monospace && 'font-mono')}>{confirmText}</b> to confirm
          </Label>
          <Input
            id={inputId}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoFocus
            className={cn(monospace && 'font-mono text-[13px]')}
          />
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={!matches || busy}>
            {busy && <Loader2 className="animate-spin" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
