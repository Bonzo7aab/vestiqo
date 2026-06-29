import Link from 'next/link';
import { getAllCategoryConfigs } from '../../lib/config/categoryConfig';
import {
  buildCategoryFilterUrl,
  buildSubcategoryFilterUrl,
} from '../../lib/content/category-filter-url';
import {
  selectionPillBase,
  selectionPillSelected,
  selectionPillUnselected,
} from '../../lib/ui/selection-pill-styles';
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
  props: CategoryDirectoryContentProps,
) {
  if (props.mode === 'link') {
    return (
      <Link
        key={subcategory.slug}
        href={buildSubcategoryFilterUrl(subcategory.name)}
        className={cn(selectionPillBase, selectionPillUnselected)}
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
        selectionPillBase,
        isSelected ? selectionPillSelected : selectionPillUnselected,
        props.disabled && 'pointer-events-none opacity-60',
      )}
    >
      {subcategory.name}
    </button>
  );
}

export function CategoryDirectoryContent(props: CategoryDirectoryContentProps) {
  const categories = getAllCategoryConfigs();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:hidden">
        {categories.map((category) => (
          <section
            key={category.slug}
            className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
          >
            {props.mode === 'link' ? (
              <Link
                href={buildCategoryFilterUrl(category.name)}
                className="text-base font-semibold text-[hsl(var(--brand-navy))] hover:text-primary"
              >
                {category.name}
              </Link>
            ) : (
              <p className="text-base font-semibold text-[hsl(var(--brand-navy))]">
                {category.name}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {category.subcategories.map((subcategory) =>
                renderSubcategory(subcategory, props),
              )}
            </div>
          </section>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-5 py-4 font-semibold text-[hsl(var(--brand-navy))]">
                Główna kategoria
              </th>
              <th className="px-5 py-4 font-semibold text-[hsl(var(--brand-navy))]">
                Podkategorie
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.slug} className="border-t border-border/70 align-top">
                <td className="px-5 py-4">
                  {props.mode === 'link' ? (
                    <Link
                      href={buildCategoryFilterUrl(category.name)}
                      className="font-semibold text-primary hover:underline"
                    >
                      {category.name}
                    </Link>
                  ) : (
                    <span className="font-semibold text-[hsl(var(--brand-navy))]">
                      {category.name}
                    </span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    {category.subcategories.map((subcategory) =>
                      renderSubcategory(subcategory, props),
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
