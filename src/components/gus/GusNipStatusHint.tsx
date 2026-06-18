import { cn } from '../ui/utils';
import type { GusLookupStatus } from '../../lib/gus/use-gus-nip-lookup';

interface GusNipStatusHintProps {
  status: GusLookupStatus;
  validationError: string | null;
  message: string | null;
}

export function GusNipStatusHint({ status, validationError, message }: GusNipStatusHintProps) {
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
