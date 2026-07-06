'use client';

import { Bookmark, Eye, FileStack } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ContestStatusBadge } from '../manager-dashboard/ContestStatusBadge';
import { cn } from '../ui/utils';

interface ContestDetailStatsBarProps {
  visits: number;
  offers: number;
  bookmarks: number;
  status?: string;
  className?: string;
}

function StatItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}): React.ReactElement {
  return (
    <span className="inline-flex shrink-0 items-center gap-1" title={label}>
      <Icon className="h-3 w-3 text-primary/70" aria-hidden />
      <span className="font-medium tabular-nums text-foreground">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

function StatSeparator(): React.ReactElement {
  return (
    <span aria-hidden className="shrink-0 text-muted-foreground/50">
      ·
    </span>
  );
}

export function ContestDetailStatsBar({
  visits,
  offers,
  bookmarks,
  status,
  className,
}: ContestDetailStatsBarProps): React.ReactElement {
  return (
    <div
      className={cn(
        'flex flex-nowrap items-center gap-x-2.5 overflow-x-auto text-[11px] leading-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
        className,
      )}
    >
      {status ? (
        <>
          <ContestStatusBadge status={status} prominent />
          <StatSeparator />
        </>
      ) : null}
      <StatItem icon={Eye} label="wyśw." value={visits} />
      <StatSeparator />
      <StatItem icon={FileStack} label="ofert" value={offers} />
      <StatSeparator />
      <StatItem icon={Bookmark} label="zapis." value={bookmarks} />
    </div>
  );
}
