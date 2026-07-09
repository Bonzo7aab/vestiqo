import { CircleAlert } from 'lucide-react';
import { cn } from '../ui/utils';

interface AuthFormErrorProps {
  message: string;
  className?: string;
  testId?: string;
}

export function AuthFormError({ message, className, testId }: AuthFormErrorProps) {
  return (
    <div
      role="alert"
      data-testid={testId}
      className={cn(
        'mb-4 flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/[0.04] px-3.5 py-3 text-sm leading-snug text-destructive',
        className,
      )}
    >
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>{message}</p>
    </div>
  );
}
