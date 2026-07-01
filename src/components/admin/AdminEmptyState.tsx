import { Inbox } from 'lucide-react';

interface AdminEmptyStateProps {
  message: string;
}

export function AdminEmptyState({ message }: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Inbox className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
