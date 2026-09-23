import Link from 'next/link';
import { Button } from '@repo/ui';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <div className="space-y-2">
        <p className="font-display text-6xl font-bold text-primary/40">404</p>
        <h1 className="font-display text-2xl font-semibold text-foreground">Page not found</h1>
        <p className="font-body text-sm text-muted-foreground max-w-sm mx-auto">
          The page you are looking for does not exist or may have been moved.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="gold" asChild className="gap-2">
          <Link href="/">
            <Home className="h-4 w-4" />
            Go home
          </Link>
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <Link href="/#auctions">
            <ArrowLeft className="h-4 w-4" />
            Browse auctions
          </Link>
        </Button>
      </div>
    </div>
  );
}
