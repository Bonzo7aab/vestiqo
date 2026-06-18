import { routes } from '../routes';

export function buildCategoryFilterUrl(categoryName: string): string {
  const params = new URLSearchParams({ categories: categoryName });
  return `${routes.home}?${params.toString()}`;
}

export function buildSubcategoryFilterUrl(subcategoryName: string): string {
  const params = new URLSearchParams({ subcategories: subcategoryName });
  return `${routes.home}?${params.toString()}`;
}
