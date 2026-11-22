'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { usePageErrorBanner } from '@/components/common/admin/PageErrorBanner';

interface ErrorAlertProps {
  message: string;
}

const ErrorAlert = ({ message }: ErrorAlertProps) => {
  const banner = usePageErrorBanner();
  const [insideDialog, setInsideDialog] = useState(false);

  // Dialogs show the error inline; everything else reports to the page banner.
  // The DOM check runs from the ref callback rather than an effect so that the
  // initial measurement does not write state synchronously inside an effect.
  const markerRef = useCallback((node: HTMLSpanElement | null) => {
    if (!node) return;
    setInsideDialog(!!node.closest('[role="dialog"], [role="alertdialog"]'));
  }, []);

  const inline = insideDialog || !banner;

  useEffect(() => {
    if (inline || !banner) return;
    const id = banner.report(message);
    return () => banner.clear(id);
  }, [inline, banner, message]);

  return (
    <>
      <span ref={markerRef} hidden />
      {inline && (
        <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          <span className="font-body">{message}</span>
        </div>
      )}
    </>
  );
};

export default ErrorAlert;
