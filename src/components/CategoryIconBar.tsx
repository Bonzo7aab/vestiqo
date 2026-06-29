'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { FileText } from 'lucide-react';
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

  if (isLoading) {
    return (
      <div className="w-full bg-background">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-4 sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-10 w-36 shrink-0 animate-pulse rounded-full bg-muted/50"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-background">
      <div className="mx-auto flex max-w-7xl flex-nowrap items-center gap-2 overflow-x-auto px-4 py-4 sm:gap-2.5 sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {filterCategoryTree.map((category) => {
          const config = getCategoryConfig(category.slug);
          const Icon = config?.icon ?? FileText;
          const accentColor = config?.color ?? '#2563EB';
          const isSelected = isCategorySelected(category.filterKey, category.slug);
          const count = categoryCounts[category.filterKey] || 0;
          const isEmpty = count === 0;
          const accentAtRest = `color-mix(in srgb, ${accentColor} 34%, transparent)`;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => handleCategoryClick(category.filterKey, category.slug)}
              title={category.label}
              className={cn(
                'group flex shrink-0 items-center gap-2 rounded-full border bg-card px-3 py-2 text-left transition-all duration-150 sm:gap-2.5 sm:px-4 sm:py-2.5',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                isSelected ? 'shadow-sm' : 'hover:bg-muted/20',
                isEmpty && !isSelected && 'opacity-45',
              )}
              style={
                {
                  borderColor: isSelected ? accentColor : accentAtRest,
                } as React.CSSProperties
              }
              aria-label={`Filtruj po kategorii: ${category.label}`}
              aria-pressed={isSelected}
            >
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full',
                  isSelected && 'bg-primary/10',
                )}
                style={
                  !isSelected
                    ? { backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)` }
                    : undefined
                }
              >
                <Icon
                  className="size-4"
                  style={{ color: isSelected ? accentColor : accentAtRest }}
                />
              </span>
              <span
                className={cn(
                  'max-w-[7rem] truncate text-xs font-medium sm:max-w-[9rem] sm:text-sm',
                  isSelected ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground',
                )}
                style={isSelected ? { color: accentColor } : undefined}
              >
                {category.label}
              </span>
              <span
                className={cn(
                  'flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5',
                  'tabular-nums text-xs font-bold leading-none sm:h-7 sm:min-w-7 sm:px-2 sm:text-sm',
                )}
                style={
                  isSelected
                    ? { backgroundColor: accentColor, color: '#ffffff' }
                    : {
                        backgroundColor: `color-mix(in srgb, ${accentColor} 22%, transparent)`,
                        color: accentColor,
                      }
                }
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
