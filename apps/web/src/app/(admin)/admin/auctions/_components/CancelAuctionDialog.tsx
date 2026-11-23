'use client';

import { useId, useState } from 'react';
import { Label, Textarea } from '@oxneer/ui';
import { TypeToConfirmDialog } from '@/components/common/admin/TypeToConfirmDialog';

/** Length the API accepts for a cancellation reason (`AuctionCancellationRQ`). */
const REASON_MIN = 5;
const REASON_MAX = 255;

interface CancelAuctionDialogProps {
  open: boolean;
  /** The auction's title, which the admin types to confirm. */
  name: string;
  onCancel: () => void;
  /** Resolves true when cancelled, which closes the dialog. */
  onConfirm: (reason: string) => Promise<boolean>;
}

/** Cancelling ends the auction for everyone, so it asks for the title and a reason
 *  the API keeps with the auction. */
export function CancelAuctionDialog({ open, name, onCancel, onConfirm }: CancelAuctionDialogProps) {
  const reasonId = useId();
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();
  const reasonValid = trimmed.length >= REASON_MIN && trimmed.length <= REASON_MAX;

  const close = () => {
    setReason('');
    onCancel();
  };

  return (
    <TypeToConfirmDialog
      open={open}
      title={`Cancel auction “${name}”?`}
      description="Nobody will be able to bid, and everyone taking part is told it is cancelled. This can’t be undone."
      confirmText={name}
      confirmLabel="Cancel auction"
      canConfirm={reasonValid}
      onCancel={close}
      onConfirm={() => onConfirm(trimmed)}
    >
      <div className="space-y-1.5">
        <Label htmlFor={reasonId}>Reason</Label>
        <Textarea
          id={reasonId}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={REASON_MAX}
          rows={3}
          placeholder="For example: the listed item is no longer available"
        />
        <p className="text-xs text-muted-foreground">
          Kept with the auction. At least {REASON_MIN} characters.
        </p>
      </div>
    </TypeToConfirmDialog>
  );
}
