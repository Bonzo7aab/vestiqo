import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface HousingDirectoryRowProps {
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: ReactNode;
  action?: ReactNode;
  onClick: () => void;
}

export function HousingDirectoryRow({
  title,
  subtitle,
  meta,
  badge,
  action,
  onClick,
}: HousingDirectoryRowProps) {
  return (
    <div className="flex items-stretch gap-2 rounded-xl border bg-card transition-colors hover:bg-muted/40">
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 flex-col gap-2 px-4 py-3 text-left sm:flex-row sm:items-center sm:gap-3"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{title}</span>
          {subtitle ? (
            <span className="mt-0.5 block truncate text-sm text-muted-foreground">{subtitle}</span>
          ) : null}
          {meta ? (
            <span className="mt-1 block text-sm text-muted-foreground">{meta}</span>
          ) : null}
        </span>
        <span className="flex items-center gap-2">
          {badge}
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </span>
      </button>
      {action ? <div className="flex items-center pr-2">{action}</div> : null}
    </div>
  );
}
