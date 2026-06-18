'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { cn } from './ui/utils';
import type { CategoryWithSubcategories } from '../lib/database/categories';

interface CategoryIconBarProps {
  jobs?: Array<{ 
    category?: string | { name?: string; slug?: string };
    status?: string;
  }>;
}

export default function CategoryIconBar({ jobs = [] }: CategoryIconBarProps) {
  const { filters, setFilters } = useFilterContext();
  const [categoriesFromDb, setCategoriesFromDb] = useState<CategoryWithSubcategories[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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

    loadCategories();
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
          (category) => getCategoryConfig(category.slug)?.name === filterKey ||
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

  const checkScrollPosition = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -160, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: 160, behavior: 'smooth' });
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    checkScrollPosition();
    container.addEventListener('scroll', checkScrollPosition);
    window.addEventListener('resize', checkScrollPosition);

    return () => {
      container.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [filterCategoryTree]);

  if (isLoading) {
    return (
      <div className="w-full border-b border-border/60 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex gap-2 sm:gap-2.5 overflow-x-auto md:justify-center">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div
                key={i}
                className="flex-shrink-0 size-[4.75rem] sm:size-[5.25rem] rounded-xl bg-muted/50 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full border-b border-border/60 bg-background relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 relative">
        {canScrollLeft && (
          <button
            onClick={scrollLeft}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 md:hidden bg-background/95 backdrop-blur-sm rounded-full p-1 shadow-md border border-border hover:bg-muted/50 transition-colors"
            aria-label="Przewiń w lewo"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
        
        {canScrollRight && (
          <button
            onClick={scrollRight}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 md:hidden bg-background/95 backdrop-blur-sm rounded-full p-1 shadow-md border border-border hover:bg-muted/50 transition-colors"
            aria-label="Przewiń w prawo"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        )}

        <div 
          ref={scrollContainerRef}
          className="flex gap-2 sm:gap-2.5 overflow-x-auto md:flex-wrap md:justify-center md:overflow-visible [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {filterCategoryTree.map((category) => {
              const config = getCategoryConfig(category.slug);
              const Icon = config?.icon ?? FileText;
              const accentColor = config?.color ?? '#2563EB';
              const isSelected = isCategorySelected(category.filterKey, category.slug);
              const count = categoryCounts[category.filterKey] || 0;
              const label = category.label;

              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.filterKey, category.slug)}
                  title={category.label}
                className={cn(
                  'group relative flex-shrink-0 flex flex-col items-center justify-center gap-1.5',
                  'size-[4.75rem] sm:size-[5.25rem] rounded-xl border p-1.5',
                  'text-center transition-all duration-150',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                  isSelected
                    ? 'shadow-sm'
                    : 'border-border/70 hover:border-border hover:bg-muted/30'
                )}
                style={
                  isSelected
                    ? {
                        borderColor: accentColor,
                        backgroundColor: `${accentColor}10`,
                      } as React.CSSProperties
                    : undefined
                }
                  aria-label={`Filtruj po kategorii: ${category.label}`}
                aria-pressed={isSelected}
              >
                {count > 0 && (
                  <span
                    className={cn(
                      'absolute top-1 right-1 tabular-nums text-[9px] font-semibold leading-none min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center',
                      isSelected ? 'text-white' : 'bg-muted text-muted-foreground'
                    )}
                    style={
                      isSelected
                        ? { backgroundColor: accentColor }
                        : undefined
                    }
                  >
                    {count}
                  </span>
                )}
                <span
                  className={cn(
                    'flex items-center justify-center size-8 sm:size-9 rounded-lg transition-colors',
                    isSelected ? '' : 'bg-muted/80 group-hover:bg-muted'
                  )}
                  style={
                    isSelected
                      ? { backgroundColor: `${accentColor}20` }
                      : undefined
                  }
                >
                  <Icon
                    className="size-4 sm:size-[1.125rem]"
                    style={isSelected ? { color: accentColor } : undefined}
                  />
                </span>
                <span
                  className={cn(
                    'w-full text-[10px] sm:text-[11px] font-medium leading-tight line-clamp-2 px-0.5',
                    isSelected ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                  style={isSelected ? { color: accentColor } : undefined}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
