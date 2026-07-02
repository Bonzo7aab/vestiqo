import type { ReactElement } from 'react';
import { Loader2 } from 'lucide-react';

export function ContestDetailsLoader(): ReactElement {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
        <p className="text-sm font-medium text-foreground">Ładowanie konkursu…</p>
        <p className="text-xs text-muted-foreground">Proszę czekać</p>
      </div>
    </div>
  );
}
