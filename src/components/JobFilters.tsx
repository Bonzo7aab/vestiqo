import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Check,
  Edit3,
  Calendar,
} from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { createClient } from '../lib/supabase/client';
import { fetchAllCategoriesWithSubcategories } from '../lib/database/categories';
import type { Job } from '../types/job';
import type { CategoryWithSubcategories } from '../lib/database/categories';
import type { FilterState, DeadlineFilterKey } from '../lib/filters/filter-state';
import { defaultFilters, WARSAW_CITY } from '../lib/filters/filter-state';
import { extractCity } from '../utils/locationMapping';
import {
  getDeadlineFilterCounts,
  getFormalCriteriaCounts,
  getListEligibleJobs,
} from '../lib/filters/filter-logic';
import { getBookmarkedJobs } from '../utils/bookmarkStorage';
import {
  buildFilterCategoryTree,
  categoryFilterKeysMatch,
  normalizeCategoryFilterKey,
  normalizeSubcategoryFilterKey,
  subcategoryFilterKeysMatch,
} from '../lib/config/categoryConfig';
import { DEADLINE_FILTER_OPTIONS } from '../lib/filters/deadline-labels';
import { ActiveFilterChips } from './ActiveFilterChips';
import { cn } from './ui/utils';

export type { FilterState } from '../lib/filters/filter-state';

const EXPANDED_SECTIONS = ['categories', 'location', 'deadline', 'formal'] as const;

function filterOptionLabelClass(count: number, isSelected: boolean, size: 'sm' | 'xs' = 'sm'): string {
  return cn(
    'cursor-pointer font-light',
    size === 'xs' ? 'text-xs' : 'text-sm',
    isSelected ? 'text-gray-900' : count === 0 ? 'text-gray-400' : 'text-gray-800',
  );
}

function filterCountClass(count: number, isSelected: boolean): string {
  return cn(isSelected || count > 0 ? 'text-gray-500' : 'text-gray-300');
}

interface JobFiltersProps {
  onFilterChange?: (filters: FilterState | ((prev: FilterState) => FilterState)) => void;
  primaryLocation?: string;
  onLocationChange?: () => void;
  jobs?: Job[];
  initialFilters?: FilterState;
}

const CustomCheckbox: React.FC<{
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}> = ({ id, checked, onCheckedChange }) => (
  <div className="relative">
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      className="sr-only"
    />
    <label
      htmlFor={id}
      className={`w-4 h-4 border rounded cursor-pointer flex items-center justify-center ${
        checked
          ? 'bg-primary border-primary'
          : 'bg-white border-gray-300 hover:border-gray-400'
      }`}
    >
      {checked && <Check className="w-3 h-3 text-white" />}
    </label>
  </div>
);

function SectionTrigger({
  title,
  open,
}: {
  title: string;
  open: boolean;
}) {
  return (
    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
      <Label className="text-sm font-bold text-gray-900 cursor-pointer">{title}</Label>
      {open ? (
        <ChevronUp className="w-4 h-4 text-gray-600" />
      ) : (
        <ChevronDown className="w-4 h-4 text-gray-600" />
      )}
    </CollapsibleTrigger>
  );
}

export default function JobFilters({
  onFilterChange,
  primaryLocation,
  onLocationChange,
  jobs = [],
  initialFilters,
}: JobFiltersProps) {
  const [expandedFilterSections, setExpandedFilterSections] = useState<string[]>([
    ...EXPANDED_SECTIONS,
  ]);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(new Set());
  const [local, setLocal] = useState<FilterState>(initialFilters ?? defaultFilters);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isUpdatingFromSelfRef = useRef(false);
  const previousEmittedRef = useRef<string>('');
  const supabase = createClient();
  const [categoriesFromDb, setCategoriesFromDb] = useState<CategoryWithSubcategories[]>([]);

  const bookmarkedIdSet = useMemo(() => {
    try {
      return new Set(getBookmarkedJobs().map((bookmark) => bookmark.id));
    } catch {
      return new Set<string>();
    }
  }, []);

  const categoryPool = useMemo(
    () => getListEligibleJobs(jobs, local, bookmarkedIdSet, 'categories'),
    [jobs, local, bookmarkedIdSet],
  );

  const subcategoryPool = useMemo(
    () => getListEligibleJobs(jobs, local, bookmarkedIdSet, 'subcategories'),
    [jobs, local, bookmarkedIdSet],
  );

  const cityPool = useMemo(
    () => getListEligibleJobs(jobs, local, bookmarkedIdSet, 'cities'),
    [jobs, local, bookmarkedIdSet],
  );

  const deadlinePool = useMemo(
    () => getListEligibleJobs(jobs, local, bookmarkedIdSet, 'deadline'),
    [jobs, local, bookmarkedIdSet],
  );

  const formalPool = useMemo(
    () => getListEligibleJobs(jobs, local, bookmarkedIdSet, 'formal'),
    [jobs, local, bookmarkedIdSet],
  );

  /* eslint-disable react-hooks/set-state-in-effect -- mirror URL/context filters into sidebar draft state */
  useEffect(() => {
    if (initialFilters && !isUpdatingFromSelfRef.current) {
      setLocal(initialFilters);
    }
    isUpdatingFromSelfRef.current = false;
  }, [initialFilters]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const load = async () => {
      const { data } = await fetchAllCategoriesWithSubcategories(supabase);
      if (data) setCategoriesFromDb(data);
    };
    load();
  }, [supabase]);

  const filterCategoryTree = useMemo(
    () => buildFilterCategoryTree(categoriesFromDb),
    [categoriesFromDb],
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    categoryPool.forEach((job) => {
      const name =
        typeof job.category === 'string' ? job.category : job.category?.name || '';
      const slug = typeof job.category === 'object' ? job.category?.slug : undefined;
      if (!name) return;
      const key = normalizeCategoryFilterKey(name, slug);
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [categoryPool]);

  const subcategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    subcategoryPool.forEach((job) => {
      if (!job.subcategory) return;
      const slug = typeof job.category === 'object' ? job.category?.slug : undefined;
      const key = normalizeSubcategoryFilterKey(job.subcategory, slug);
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [subcategoryPool]);

  const cityCount = useMemo(
    () => cityPool.filter((job) => extractCity(job.location) === WARSAW_CITY).length,
    [cityPool],
  );

  const deadlineCounts = useMemo(() => getDeadlineFilterCounts(deadlinePool), [deadlinePool]);
  const formalCounts = useMemo(() => getFormalCriteriaCounts(formalPool), [formalPool]);

  useEffect(() => {
    const next: FilterState = {
      ...local,
      postTypes: defaultFilters.postTypes,
      cities: [WARSAW_CITY],
      sublocalities: [],
    };

    const serialized = JSON.stringify(next);
    if (onFilterChange && serialized !== previousEmittedRef.current) {
      previousEmittedRef.current = serialized;
      isUpdatingFromSelfRef.current = true;
      onFilterChange(next);
    }
  }, [local, onFilterChange]);

  const patch = (partial: Partial<FilterState>) => {
    setLocal((prev) => ({ ...prev, ...partial }));
  };

  const handleChipFilterChange = (
    next: FilterState | ((prev: FilterState) => FilterState),
  ) => {
    setLocal((prev) => (typeof next === 'function' ? next(prev) : next));
  };

  const toggleSection = (name: string) => {
    setExpandedFilterSections((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const toggleCategoryExpand = (id: string) => {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDeadline = (value: DeadlineFilterKey, checked: boolean) => {
    patch({
      deadline: checked
        ? [...local.deadline, value]
        : local.deadline.filter((d) => d !== value),
    });
  };

  return (
    <div
      className="flex h-full min-h-0 w-full max-h-full flex-col overflow-hidden bg-white lg:w-80"
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex-shrink-0 px-6 pt-3 lg:pt-3">
          <div className="mb-2 flex h-8 items-center">
            <h3 className="text-base font-bold text-gray-900 sm:text-lg">Filtry</h3>
          </div>

          {onFilterChange && (
            <ActiveFilterChips filters={local} onFilterChange={handleChipFilterChange} />
          )}

          {primaryLocation && primaryLocation !== 'Polska' && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="font-normal text-blue-900">Aktualna lokalizacja</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-primary font-semibold">{primaryLocation}</span>
                  {onLocationChange && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onLocationChange}
                      className="h-6 px-2 py-1 text-xs hover:bg-blue-100 text-blue-600"
                      title="Zmień lokalizację"
                    >
                      <Edit3 className="h-3 w-3 mr-1" />
                      Zmień
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          ref={scrollContainerRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-32 scroll-pb-32"
        >
          {/* Categories — always expanded at first level; subs on chevron */}
          <Collapsible
            open={expandedFilterSections.includes('categories')}
            onOpenChange={() => toggleSection('categories')}
            className="mb-4"
          >
            <SectionTrigger title="Kategorie" open={expandedFilterSections.includes('categories')} />
            <CollapsibleContent className="mt-3 pl-2">
              <div className="space-y-3">
                {filterCategoryTree.length > 0 ? (
                  filterCategoryTree.map((category) => {
                    const isSelected = local.categories.some((key) =>
                      categoryFilterKeysMatch(key, category.filterKey, category.slug),
                    );
                    const isExpanded = expandedCategoryIds.has(category.id);
                    const count = categoryCounts[category.filterKey] || 0;

                    return (
                      <div key={category.id} className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <CustomCheckbox
                            id={`category-${category.id}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                patch({
                                  categories: [
                                    ...local.categories.filter(
                                      (key) =>
                                        !categoryFilterKeysMatch(
                                          key,
                                          category.filterKey,
                                          category.slug,
                                        ),
                                    ),
                                    category.filterKey,
                                  ],
                                });
                              } else {
                                const subKeys = category.subcategories.map(
                                  (sub) => sub.filterKey,
                                );
                                patch({
                                  categories: local.categories.filter(
                                    (key) =>
                                      !categoryFilterKeysMatch(
                                        key,
                                        category.filterKey,
                                        category.slug,
                                      ),
                                  ),
                                  subcategories: local.subcategories.filter(
                                    (key) =>
                                      !subKeys.some((subKey) =>
                                        subcategoryFilterKeysMatch(
                                          key,
                                          subKey,
                                          category.slug,
                                        ),
                                      ),
                                  ),
                                });
                              }
                            }}
                          />
                          <Label
                            htmlFor={`category-${category.id}`}
                            className={cn('flex-1', filterOptionLabelClass(count, isSelected))}
                          >
                            {category.label}{' '}
                            <span className={filterCountClass(count, isSelected)}>({count})</span>
                          </Label>
                          {category.subcategories.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleCategoryExpand(category.id)}
                              className="p-1 hover:bg-gray-100 rounded"
                              aria-label={isExpanded ? 'Zwiń' : 'Rozwiń'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-600" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-600" />
                              )}
                            </button>
                          )}
                        </div>
                        {isExpanded && category.subcategories.length > 0 && (
                          <div className="ml-6 space-y-1 pl-1 border-l-2 border-gray-200">
                            {category.subcategories.map((sub) => {
                              const subCount = subcategoryCounts[sub.filterKey] || 0;
                              const subSelected = local.subcategories.some((key) =>
                                subcategoryFilterKeysMatch(
                                  key,
                                  sub.filterKey,
                                  category.slug,
                                ),
                              );
                              return (
                                <div
                                  key={sub.id}
                                  className="flex items-center space-x-2"
                                >
                                  <CustomCheckbox
                                    id={`sub-${sub.id}`}
                                    checked={subSelected}
                                    onCheckedChange={(checked) => {
                                      patch({
                                        subcategories: checked
                                          ? [
                                              ...local.subcategories.filter(
                                                (key) =>
                                                  !subcategoryFilterKeysMatch(
                                                    key,
                                                    sub.filterKey,
                                                    category.slug,
                                                  ),
                                              ),
                                              sub.filterKey,
                                            ]
                                          : local.subcategories.filter(
                                              (key) =>
                                                !subcategoryFilterKeysMatch(
                                                  key,
                                                  sub.filterKey,
                                                  category.slug,
                                                ),
                                            ),
                                      });
                                    }}
                                  />
                                  <Label
                                    htmlFor={`sub-${sub.id}`}
                                    className={filterOptionLabelClass(subCount, subSelected, 'xs')}
                                  >
                                    {sub.label}{' '}
                                    <span className={filterCountClass(subCount, subSelected)}>
                                      ({subCount})
                                    </span>
                                  </Label>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-gray-400 pl-2">Brak kategorii</div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Location — Warsaw only */}
          <Collapsible
            open={expandedFilterSections.includes('location')}
            onOpenChange={() => toggleSection('location')}
            className="mb-4"
          >
            <SectionTrigger title="Lokalizacja" open={expandedFilterSections.includes('location')} />
            <CollapsibleContent className="mt-3 pl-2">
              <div className="flex items-center space-x-2 pointer-events-none">
                <CustomCheckbox
                  id="city-warsaw"
                  checked
                  onCheckedChange={() => undefined}
                />
                <Label
                  htmlFor="city-warsaw"
                  className={filterOptionLabelClass(cityCount, true)}
                >
                  {WARSAW_CITY}{' '}
                  <span className={filterCountClass(cityCount, true)}>({cityCount})</span>
                </Label>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Zakończenie przyjmowania ofert */}
          <Collapsible
            open={expandedFilterSections.includes('deadline')}
            onOpenChange={() => toggleSection('deadline')}
            className="mb-4"
          >
            <SectionTrigger
              title="Zakończenie przyjmowania ofert"
              open={expandedFilterSections.includes('deadline')}
            />
            <CollapsibleContent className="mt-3 pl-2">
              <div className="space-y-2">
                {DEADLINE_FILTER_OPTIONS.map(({ value, label }) => {
                  const count = deadlineCounts[value] ?? 0;
                  const deadlineSelected = local.deadline.includes(value);
                  return (
                    <div key={value} className="flex items-center space-x-2">
                      <CustomCheckbox
                        id={`deadline-${value}`}
                        checked={deadlineSelected}
                        onCheckedChange={(checked) => toggleDeadline(value, checked)}
                      />
                      <Label
                        htmlFor={`deadline-${value}`}
                        className={cn(
                          'flex items-center gap-2',
                          filterOptionLabelClass(count, deadlineSelected),
                        )}
                      >
                        <Calendar
                          className={cn(
                            'w-3 h-3 shrink-0',
                            count === 0 && !deadlineSelected
                              ? 'text-gray-300'
                              : 'text-gray-600',
                          )}
                        />
                        <span>
                          {label}{' '}
                          <span className={filterCountClass(count, deadlineSelected)}>
                            ({count})
                          </span>
                        </span>
                      </Label>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Kryteria formalne */}
          <Collapsible
            open={expandedFilterSections.includes('formal')}
            onOpenChange={() => toggleSection('formal')}
            className="mb-4"
          >
            <SectionTrigger
              title="Kryteria formalne"
              open={expandedFilterSections.includes('formal')}
            />
            <CollapsibleContent className="mt-3 pl-2">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CustomCheckbox
                    id="formal-no-deposit"
                    checked={local.noDeposit}
                    onCheckedChange={(checked) => patch({ noDeposit: checked })}
                  />
                  <Label
                    htmlFor="formal-no-deposit"
                    className={filterOptionLabelClass(
                      formalCounts.noDeposit,
                      local.noDeposit,
                    )}
                  >
                    Bez wadium{' '}
                    <span className={filterCountClass(formalCounts.noDeposit, local.noDeposit)}>
                      ({formalCounts.noDeposit})
                    </span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <CustomCheckbox
                    id="formal-no-references"
                    checked={local.noReferencesRequired}
                    onCheckedChange={(checked) =>
                      patch({ noReferencesRequired: checked })
                    }
                  />
                  <Label
                    htmlFor="formal-no-references"
                    className={filterOptionLabelClass(
                      formalCounts.noReferencesRequired,
                      local.noReferencesRequired,
                    )}
                  >
                    Bez wymaganych referencji{' '}
                    <span
                      className={filterCountClass(
                        formalCounts.noReferencesRequired,
                        local.noReferencesRequired,
                      )}
                    >
                      ({formalCounts.noReferencesRequired})
                    </span>
                  </Label>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}
