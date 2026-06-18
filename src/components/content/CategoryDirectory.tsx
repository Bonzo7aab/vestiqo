import Link from 'next/link';
import { getAllCategoryConfigs } from '../../lib/config/categoryConfig';
import {
  buildCategoryFilterUrl,
  buildSubcategoryFilterUrl,
} from '../../lib/content/category-filter-url';

export function CategoryDirectory() {
  const categories = getAllCategoryConfigs();

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead className="bg-muted/60">
          <tr>
            <th className="px-4 py-3 font-semibold text-[hsl(var(--brand-navy))]">
              Główna kategoria
            </th>
            <th className="px-4 py-3 font-semibold text-[hsl(var(--brand-navy))]">
              Podkategoria
            </th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) =>
            category.subcategories.map((subcategory, index) => (
              <tr key={`${category.slug}-${subcategory.slug}`} className="border-t border-border">
                <td className="px-4 py-3 align-top">
                  {index === 0 ? (
                    <Link
                      href={buildCategoryFilterUrl(category.name)}
                      className="font-medium text-primary hover:underline"
                    >
                      {category.name}
                    </Link>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={buildSubcategoryFilterUrl(subcategory.name)}
                    className="text-primary hover:underline"
                  >
                    {subcategory.name}
                  </Link>
                </td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}
