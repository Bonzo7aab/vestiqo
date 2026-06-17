import { CircleAlert } from 'lucide-react';
import { cn } from '../ui/utils';

interface AuthFieldErrorProps {
  message: string | null;
  className?: string;
  reserveSpace?: boolean;
  id?: string;
}

export function AuthFieldError({
  message,
  className,
  reserveSpace = true,
  id,
}: AuthFieldErrorProps) {
  if (!message) {
    if (!reserveSpace) {
      return null;
    }

    return <div className={cn('min-h-5', className)} aria-hidden="true" />;
  }

  return (
    <p
      id={id}
      role="alert"
      className={cn(
        'flex items-start gap-1.5 rounded-md border border-destructive/25 bg-destructive/5 px-2.5 py-1.5 text-xs leading-5 text-destructive',
        className,
      )}
    >
      <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{message}</span>
    </p>
  );
}
