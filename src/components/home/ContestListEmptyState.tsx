import type { LucideIcon } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

interface ContestListEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function ContestListEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: ContestListEmptyStateProps): ReactElement {
  return (
    <div className="rounded-xl border border-dashed bg-card/40 px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border bg-card shadow-sm">
        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
      </div>
      <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
