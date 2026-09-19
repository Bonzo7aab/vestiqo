import { Building2, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';

interface HousingSectionHeaderProps {
  title: string;
  description: string;
  count: number;
  countOne: string;
  countMany: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  showSearch: boolean;
  action: ReactNode;
}

export function HousingSectionHeader({
  title,
  description,
  count,
  countOne,
  countMany,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  showSearch,
  action,
}: HousingSectionHeaderProps) {
  return (
    <div className="border-b pb-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-card shadow-sm">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
              {count > 0 ? (
                <Badge variant="secondary" className="font-normal">
                  {count} {count === 1 ? countOne : countMany}
                </Badge>
              ) : null}
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto lg:pt-0.5">
          {showSearch ? (
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          ) : null}
          {action}
        </div>
      </div>
    </div>
  );
}
