'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { usePageErrorBanner } from '@/components/common/admin/PageErrorBanner';

interface ErrorAlertProps {
  message: string;
}

const ErrorAlert = ({ message }: ErrorAlertProps) => {
  const markerRef = useRef<HTMLSpanElement>(null);
  const banner = usePageErrorBanner();
  const [inline, setInline] = useState<boolean | null>(null);

  useLayoutEffect(() => {
    const node = markerRef.current;
    const inDialog = !!node?.closest('[role="dialog"], [role="alertdialog"]');
    setInline(inDialog || !banner);
  }, [banner]);

  useEffect(() => {
    if (inline !== false || !banner) return;
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
