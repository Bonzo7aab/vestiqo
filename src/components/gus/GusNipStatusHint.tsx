import { Loader2 } from 'lucide-react';
import { cn } from '../ui/utils';
import type { GusLookupStatus } from '../../lib/gus/use-gus-nip-lookup';

interface GusNipStatusHintProps {
  status: GusLookupStatus;
  validationError: string | null;
  message: string | null;
}

export function GusNipStatusHint({ status, validationError, message }: GusNipStatusHintProps) {
  if (status === 'loading') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5"
      >
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium text-foreground">Wyszukiwanie w rejestrze GUS</p>
          <p className="text-xs text-muted-foreground">Pobieramy dane podmiotu dla podanego NIP…</p>
        </div>
      </div>
    );
  }

  const displayMessage = validationError ?? message;
  if (!displayMessage) {
    return null;
  }

  return (
    <p
      className={cn(
        'text-xs',
        !validationError && status === 'success' && 'text-emerald-600',
        (validationError || status === 'error') && 'text-destructive',
      )}
    >
      {displayMessage}
    </p>
  );
}
