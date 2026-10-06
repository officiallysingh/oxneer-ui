'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@repo/ui';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';

export default function MainError({
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
          We could not load this page. Please try again or return home.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
        <Button onClick={reset} variant="gold" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <Link href="/">
            <Home className="h-4 w-4" />
            Go home
          </Link>
        </Button>
      </div>
    </div>
  );
}
