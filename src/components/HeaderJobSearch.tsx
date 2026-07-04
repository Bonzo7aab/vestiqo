'use client';

import React, { useCallback, useState } from 'react';
import { Search, MapPin } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useFilterContext } from '../contexts/FilterContext';
import { WARSAW_CITY, type FilterState } from '../lib/filters/filter-state';
import { getFiltersUrl } from '../utils/filterUrlSync';
import { Input } from './ui/input';
import { cn } from './ui/utils';

const innerInputClassName =
  'h-full min-h-0 rounded-none border-0 bg-transparent shadow-none focus-visible:border-transparent focus-visible:ring-0';

export function HeaderJobSearch({ className }: { className?: string }) {
  const { filters, setFilters } = useFilterContext();
  const pathname = usePathname();
  const router = useRouter();
  const [searchDraft, setSearchDraft] = useState(filters.searchQuery ?? '');
  const [syncedSearchQuery, setSyncedSearchQuery] = useState(filters.searchQuery ?? '');

  if ((filters.searchQuery ?? '') !== syncedSearchQuery) {
    const next = filters.searchQuery ?? '';
    setSyncedSearchQuery(next);
    setSearchDraft(next);
  }

  const applySearch = useCallback(
    (nextSearch: string) => {
      const next: FilterState = {
        ...filters,
        searchQuery: nextSearch,
        cities: [WARSAW_CITY],
        sublocalities: [],
      };
      setFilters(next);
      if (pathname !== '/') {
        router.push(getFiltersUrl('/', next));
      }
    },
    [filters, pathname, router, setFilters],
  );

  const commitSearch = () => {
    applySearch(searchDraft.trim());
  };

  return (
    <div
      className={cn(
        'flex h-10 w-full items-stretch overflow-hidden rounded-lg border border-brand-navy/10 bg-card',
        'shadow-[0_1px_2px_hsl(var(--brand-navy)/0.06),0_3px_10px_hsl(var(--brand-navy)/0.04)]',
        'ring-1 ring-inset ring-white/75',
        'transition-[border-color,box-shadow]',
        'focus-within:border-primary/20 focus-within:shadow-[0_1px_3px_hsl(var(--primary)/0.1),0_4px_14px_hsl(var(--brand-navy)/0.06)] focus-within:ring-primary/10',
        className,
      )}
    >
      <div className="relative flex min-w-0 flex-1 items-center">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={searchDraft}
          onChange={(e) => {
            const next = e.target.value;
            setSearchDraft(next);
            if (next === '' && (filters.searchQuery ?? '').trim() !== '') {
              applySearch('');
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitSearch();
          }}
          onBlur={commitSearch}
          placeholder="Szukaj po tytule, kategorii…"
          className={cn(innerInputClassName, 'w-full pl-9 pr-2')}
          aria-label="Szukaj konkursów"
        />
      </div>

      <div
        className="flex shrink-0 items-center px-2 text-sm font-light text-muted-foreground/50 select-none"
        aria-hidden
      >
        |
      </div>

      <div className="flex w-[8.5rem] shrink-0 items-center gap-1.5 pl-1 pr-3">
        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <Input
          readOnly
          value={WARSAW_CITY}
          tabIndex={-1}
          className={cn(innerInputClassName, 'cursor-default px-0 text-muted-foreground')}
          aria-label="Lokalizacja"
        />
      </div>
    </div>
  );
}
