'use client';

import { Loader2 } from 'lucide-react';

/** Full-viewport loading used while auth gates hydrate or routes redirect. */
export function PageLoadingScreen({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
