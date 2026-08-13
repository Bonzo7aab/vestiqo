import {
  getCategoryConfig,
  isValidSubcategorySlug,
} from '../config/categoryConfig';

export const MATCHED_CONTEST_TITLE = 'Konkurs dopasowany do Twoich usług';

export function subcategorySlugsForCategory(categorySlug: string): string[] {
  const config = getCategoryConfig(categorySlug);
  if (!config) {
    return [];
  }
  return config.subcategories.map((subcategory) => subcategory.slug);
}

/**
 * Contest subcategory slug wins. If the contest only has a main category,
 * match any contractor who selected a child subcategory of that parent.
 */
export function resolveContestServiceMatchSlugs(input: {
  subcategorySlug?: string | null;
  categorySlug?: string | null;
}): string[] {
  const subcategorySlug = input.subcategorySlug?.trim();
  if (subcategorySlug && isValidSubcategorySlug(subcategorySlug)) {
    return [subcategorySlug];
  }

  const categorySlug = input.categorySlug?.trim();
  if (categorySlug) {
    return subcategorySlugsForCategory(categorySlug);
  }

  return [];
}

export function excludeUserIds(userIds: string[], excluded: Iterable<string>): string[] {
  const skip = new Set(excluded);
  return userIds.filter((userId) => !skip.has(userId));
}

export function buildMatchedContestMessage(
  entityName: string,
  categoryName: string,
): string {
  return `${entityName} opublikowała konkurs w kategorii ${categoryName}.`;
}
