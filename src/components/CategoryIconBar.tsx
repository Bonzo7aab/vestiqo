'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { useFilterContext } from '../contexts/FilterContext';
import { createClient } from '../lib/supabase/client';
import { fetchAllCategoriesWithSubcategories } from '../lib/database/categories';
import {
  buildFilterCategoryTree,
  categoryFilterKeysMatch,
  getCategoryConfig,
  normalizeCategoryFilterKey,
} from '../lib/config/categoryConfig';
import { getCategoryAccentStyle } from './categories/category-visual';
import { Button } from './ui/button';
import { cn } from './ui/utils';
import type { CategoryWithSubcategories } from '../lib/database/categories';

interface CategoryIconBarProps {
  jobs?: Array<{
    category?: string | { name?: string; slug?: string };
    status?: string;
  }>;
}

function CategoryPillsScroller({
  children,
  itemCount,
}: {
  children: React.ReactNode;
  itemCount: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }

    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(maxScroll - el.scrollLeft > 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }

    updateScrollEdges();

    const observer = new ResizeObserver(() => {
      updateScrollEdges();
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, [itemCount, updateScrollEdges]);

  const scrollByDirection = (direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }

    el.scrollBy({
      left: direction * Math.max(200, el.clientWidth * 0.65),
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative">
      {canScrollLeft ? (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-muted/90 via-muted/50 to-transparent sm:w-16"
            aria-hidden
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute left-0 top-1/2 z-20 h-8 w-8 -translate-y-1/2 rounded-sm border-border/80 bg-card/95 shadow-md backdrop-blur-sm hover:bg-card"
            onClick={() => scrollByDirection(-1)}
            aria-label="Przewiń kategorie w lewo"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </>
      ) : null}

      {canScrollRight ? (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-muted/90 via-muted/50 to-transparent sm:w-16"
            aria-hidden
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute right-0 top-1/2 z-20 h-8 w-8 -translate-y-1/2 rounded-sm border-border/80 bg-card/95 shadow-md backdrop-blur-sm hover:bg-card"
            onClick={() => scrollByDirection(1)}
            aria-label="Przewiń kategorie w prawo"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      ) : null}

      <div
        ref={scrollRef}
        onScroll={updateScrollEdges}
        className={cn(
          'flex flex-nowrap items-stretch gap-2 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
          canScrollLeft && 'pl-9 sm:pl-10',
          canScrollRight && 'pr-9 sm:pr-10',
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default function CategoryIconBar({ jobs = [] }: CategoryIconBarProps) {
  const { filters, setFilters } = useFilterContext();
  const [categoriesFromDb, setCategoriesFromDb] = useState<CategoryWithSubcategories[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const loadCategories = async () => {
      setIsLoading(true);
      const { data, error } = await fetchAllCategoriesWithSubcategories(supabase);
      if (!error && data) {
        setCategoriesFromDb(data);
      }
      setIsLoading(false);
    };

    void loadCategories();
  }, [supabase]);

  const filterCategoryTree = useMemo(
    () => buildFilterCategoryTree(categoriesFromDb),
    [categoriesFromDb],
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    jobs.forEach((job) => {
      const jobStatus = job.status;
      if (jobStatus && jobStatus !== 'active') {
        return;
      }

      const categoryName =
        typeof job.category === 'string' ? job.category : job.category?.name || '';
      const categorySlug =
        typeof job.category === 'object' ? job.category?.slug : undefined;

      if (categoryName) {
        const key = normalizeCategoryFilterKey(categoryName, categorySlug);
        counts[key] = (counts[key] || 0) + 1;
      }
    });

    return counts;
  }, [jobs]);

  const handleCategoryClick = (filterKey: string, categorySlug: string) => {
    setFilters((prev) => {
      const currentCategories = prev.categories || [];
      const isSelected = currentCategories.some((key) =>
        categoryFilterKeysMatch(key, filterKey, categorySlug),
      );

      if (isSelected) {
        const dbCategory = categoriesFromDb.find(
          (category) =>
            getCategoryConfig(category.slug)?.name === filterKey ||
            categoryFilterKeysMatch(category.name, filterKey, categorySlug),
        );
        const subNames = dbCategory?.subcategories.map((sub) => sub.name) ?? [];

        return {
          ...prev,
          categories: currentCategories.filter(
            (key) => !categoryFilterKeysMatch(key, filterKey, categorySlug),
          ),
          subcategories: (prev.subcategories || []).filter((sub) => !subNames.includes(sub)),
        };
      }

      return {
        ...prev,
        categories: [
          ...currentCategories.filter(
            (key) => !categoryFilterKeysMatch(key, filterKey, categorySlug),
          ),
          filterKey,
        ],
      };
    });
  };

  const isCategorySelected = (filterKey: string, categorySlug: string) => {
    return (filters.categories || []).some((key) =>
      categoryFilterKeysMatch(key, filterKey, categorySlug),
    );
  };

  if (isLoading) {
    return (
      <div className="border-t border-border/60 bg-muted/15">
        <div className="mx-auto max-w-7xl px-2 py-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-11 w-44 shrink-0 animate-pulse rounded-sm bg-muted/50"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-border/60 bg-muted/15">
      <div className="mx-auto max-w-7xl px-2 py-3 sm:px-4 md:px-6 lg:px-8">
        <CategoryPillsScroller itemCount={filterCategoryTree.length}>
          {filterCategoryTree.map((category) => {
            const config = getCategoryConfig(category.slug);
            const Icon = config?.icon ?? FileText;
            const accentColor = config?.color ?? '#2563EB';
            const isSelected = isCategorySelected(category.filterKey, category.slug);
            const count = categoryCounts[category.filterKey] || 0;
            const isEmpty = count === 0;
            const accent = getCategoryAccentStyle(accentColor, isSelected);

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => handleCategoryClick(category.filterKey, category.slug)}
                className={cn(
                  'group flex shrink-0 items-center gap-2.5 rounded-sm border bg-card py-2 pl-2 pr-2.5 text-left shadow-sm',
                  'transition-all duration-200 ease-out',
                  'hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                  isSelected ? 'shadow-md ring-1 ring-black/5' : '',
                  isEmpty && !isSelected && 'opacity-55',
                )}
                style={{
                  borderColor: accent.borderColor,
                  backgroundColor: isSelected ? accent.selectedBg : undefined,
                }}
                aria-label={`Filtruj po kategorii: ${category.label}`}
                aria-pressed={isSelected}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-border/50 transition-transform duration-200 ease-out group-hover:scale-105"
                  style={{ backgroundColor: accent.iconBg }}
                >
                  <Icon
                    className="h-[1.125rem] w-[1.125rem]"
                    strokeWidth={2.25}
                    style={{ color: accent.iconColor }}
                  />
                </span>

                <span className="text-sm font-medium leading-snug text-foreground">
                  {category.label}
                </span>

                <span
                  className={cn(
                    'ml-0.5 flex h-7 min-w-7 shrink-0 items-center justify-center self-center rounded-sm border px-1.5',
                    'tabular-nums text-xs font-semibold leading-none',
                    !isSelected && 'border-border/60',
                  )}
                  style={{
                    borderColor: isSelected ? accent.borderColor : undefined,
                    backgroundColor: accent.countBg,
                    color: accent.countColor,
                  }}
                  aria-hidden
                >
                  {count}
                </span>
              </button>
            );
          })}
        </CategoryPillsScroller>
      </div>
    </div>
  );
}
