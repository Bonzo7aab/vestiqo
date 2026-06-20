import Link from 'next/link';
import { getAllCategoryConfigs } from '../../lib/config/categoryConfig';
import {
  buildCategoryFilterUrl,
  buildSubcategoryFilterUrl,
} from '../../lib/content/category-filter-url';

export function CategoryDirectory() {
  const categories = getAllCategoryConfigs();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:hidden">
        {categories.map((category) => (
          <section
            key={category.slug}
            className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
          >
            <Link
              href={buildCategoryFilterUrl(category.name)}
              className="text-base font-semibold text-[hsl(var(--brand-navy))] hover:text-primary"
            >
              {category.name}
            </Link>

            <div className="mt-4 flex flex-wrap gap-2">
              {category.subcategories.map((subcategory) => (
                <Link
                  key={subcategory.slug}
                  href={buildSubcategoryFilterUrl(subcategory.name)}
                  className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-sm text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                >
                  {subcategory.name}
                </Link>
              ))}
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
                  <Link
                    href={buildCategoryFilterUrl(category.name)}
                    className="font-semibold text-primary hover:underline"
                  >
                    {category.name}
                  </Link>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    {category.subcategories.map((subcategory) => (
                      <Link
                        key={subcategory.slug}
                        href={buildSubcategoryFilterUrl(subcategory.name)}
                        className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                      >
                        {subcategory.name}
                      </Link>
                    ))}
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
