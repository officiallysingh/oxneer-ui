'use client';

import { Loader2 } from 'lucide-react';
import { Button, type ButtonProps } from '@oxneer/ui';

interface SaveButtonProps extends Omit<ButtonProps, 'children'> {
  saving: boolean;
  label?: string;
  savingLabel?: string;
}

/**
 * Submit button that shows a spinner while `saving` is true.
 */
export function SaveButton({
  saving,
  label = 'Save',
  savingLabel = 'Saving...',
  disabled,
  ...rest
}: SaveButtonProps) {
  return (
    <Button type="submit" disabled={saving || disabled} {...rest}>
      {saving ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
          {savingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  );
}
