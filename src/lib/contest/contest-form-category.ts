import { getCategoryDisplayName, getSubcategoryDisplayName } from '../config/categoryConfig';

export function categoryJoinFromUnknown(value: unknown): {
  name?: string;
  slug?: string;
} {
  if (!value) return {};
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? { name: trimmed } : {};
  }
  if (typeof value === 'object') {
    const obj = value as { name?: unknown; slug?: unknown };
    const name = typeof obj.name === 'string' ? obj.name.trim() : '';
    const slug = typeof obj.slug === 'string' ? obj.slug.trim() : '';
    return {
      ...(name ? { name } : {}),
      ...(slug ? { slug } : {}),
    };
  }
  return {};
}

/** Map DB category joins (legacy names or slugs) to contest form Select filterKeys. */
export function canonicalContestFormCategories(
  category: unknown,
  subcategory: unknown,
  fallbackCategoryName?: string,
  fallbackSubcategoryName?: string,
): { category: string; subcategory: string } {
  const categoryJoin = categoryJoinFromUnknown(category);
  const subcategoryJoin = categoryJoinFromUnknown(subcategory);
  const catName = categoryJoin.name ?? fallbackCategoryName?.trim() ?? '';
  const catSlug = categoryJoin.slug;
  const subName = subcategoryJoin.name ?? fallbackSubcategoryName?.trim() ?? '';
  const subSlug = subcategoryJoin.slug;

  return {
    category:
      catName || catSlug
        ? getCategoryDisplayName({ name: catName || undefined, slug: catSlug })
        : '',
    subcategory:
      subName || subSlug
        ? getSubcategoryDisplayName({
            name: subName || undefined,
            slug: subSlug,
            categorySlug: catSlug,
          }) ?? subName
        : '',
  };
}
