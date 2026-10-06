import { Loader2 } from 'lucide-react';

export default function MainLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      <p className="text-sm font-medium">Loading...</p>
    </div>
  );
}
