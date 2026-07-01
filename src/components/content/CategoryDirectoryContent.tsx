import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getAllCategoryConfigs } from '../../lib/config/categoryConfig';
import {
  buildCategoryFilterUrl,
  buildSubcategoryFilterUrl,
} from '../../lib/content/category-filter-url';
import {
  CategoryIconBadge,
  subcategoryTagBase,
  subcategoryTagRest,
  subcategoryTagSelected,
} from '../categories/category-visual';
import { cn } from '../ui/utils';

interface CategoryDirectoryLinkProps {
  mode: 'link';
}

interface CategoryDirectorySelectProps {
  mode: 'select';
  selectedSlugs: Set<string>;
  onToggle: (slug: string) => void;
  disabled?: boolean;
}

export type CategoryDirectoryContentProps =
  | CategoryDirectoryLinkProps
  | CategoryDirectorySelectProps;

function renderSubcategory(
  subcategory: { slug: string; name: string },
  categoryColor: string,
  props: CategoryDirectoryContentProps,
) {
  if (props.mode === 'link') {
    return (
      <Link
        key={subcategory.slug}
        href={buildSubcategoryFilterUrl(subcategory.name)}
        className={cn(subcategoryTagBase, subcategoryTagRest)}
      >
        {subcategory.name}
      </Link>
    );
  }

  const isSelected = props.selectedSlugs.has(subcategory.slug);
  return (
    <button
      key={subcategory.slug}
      type="button"
      aria-pressed={isSelected}
      disabled={props.disabled}
      onClick={() => props.onToggle(subcategory.slug)}
      className={cn(
        subcategoryTagBase,
        isSelected ? subcategoryTagSelected : subcategoryTagRest,
        props.disabled && 'pointer-events-none opacity-60',
      )}
      style={
        isSelected
          ? {
              borderColor: `color-mix(in srgb, ${categoryColor} 40%, transparent)`,
              backgroundColor: `color-mix(in srgb, ${categoryColor} 8%, transparent)`,
              color: categoryColor,
            }
          : undefined
      }
    >
      {subcategory.name}
    </button>
  );
}

function CategoryCardHeader({
  category,
  props,
  selectedCount,
}: {
  category: ReturnType<typeof getAllCategoryConfigs>[number];
  props: CategoryDirectoryContentProps;
  selectedCount?: number;
}) {
  const headerContent = (
    <>
      <CategoryIconBadge slug={category.slug} color={category.color} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-base font-semibold text-brand-navy">
          <span>{category.name}</span>
          {props.mode === 'select' && selectedCount !== undefined && selectedCount > 0 ? (
            <span
              className="text-sm font-semibold tabular-nums"
              style={{ color: category.color }}
            >
              ({selectedCount})
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {category.description}
        </p>
      </div>
      {props.mode === 'link' ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      ) : null}
    </>
  );

  if (props.mode === 'link') {
    return (
      <Link
        href={buildCategoryFilterUrl(category.name)}
        className="group flex items-start gap-3 border-b border-border/60 px-4 py-4 transition-colors hover:bg-muted/20 sm:px-5"
      >
        {headerContent}
      </Link>
    );
  }

  return (
    <div className="flex items-start gap-3 border-b border-border/60 px-4 py-4 sm:px-5">
      {headerContent}
    </div>
  );
}

export function CategoryDirectoryContent(props: CategoryDirectoryContentProps) {
  const categories = getAllCategoryConfigs();

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {categories.map((category) => {
        const selectedCount =
          props.mode === 'select'
            ? category.subcategories.filter((subcategory) =>
                props.selectedSlugs.has(subcategory.slug),
              ).length
            : 0;

        return (
          <article
            key={category.slug}
            className="overflow-hidden rounded-xl border border-border/60 border-l-[3px] bg-card shadow-sm shadow-black/5 transition-shadow hover:shadow-md hover:shadow-black/8"
            style={{
              borderLeftColor: `color-mix(in srgb, ${category.color} 38%, transparent)`,
            }}
          >
            <CategoryCardHeader
              category={category}
              props={props}
              selectedCount={selectedCount}
            />
            <div className="flex flex-wrap gap-1.5 px-4 py-3 sm:px-5 sm:py-4">
              {category.subcategories.map((subcategory) =>
                renderSubcategory(subcategory, category.color, props),
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
