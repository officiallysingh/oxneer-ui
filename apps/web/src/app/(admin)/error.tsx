'use client';

import { useEffect } from 'react';
import { Button } from '@repo/ui';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 px-6 text-center">
      <div className="p-4 rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-8 w-8" aria-hidden />
      </div>
      <div className="space-y-1">
        <h2 className="font-display text-xl font-semibold text-foreground">Something went wrong</h2>
        <p className="font-body text-sm text-muted-foreground max-w-md">
          An unexpected error occurred while loading this page. You can try again.
        </p>
      </div>
      <Button onClick={reset} variant="gold" className="gap-2 mt-2">
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
