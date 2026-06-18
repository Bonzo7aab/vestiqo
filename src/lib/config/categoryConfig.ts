import {
  Hammer,
  Sparkles,
  TreePine,
  Zap,
  ClipboardCheck,
  FileText,
  type LucideIcon,
} from 'lucide-react';

/** OPD-105 compact subcategory label */
export interface SubcategoryConfig {
  slug: string;
  /** Canonical display name (stored in DB after migration) */
  name: string;
  /** Previous DB names for lookup / migration */
  legacyNames?: string[];
}

/** OPD-105 category with subcategories */
export interface CategoryConfig {
  slug: string;
  /** Canonical display name (stored in DB after migration) */
  name: string;
  /** Same as name — used in compact UI tiles */
  shortName: string;
  legacyNames?: string[];
  color: string;
  icon: LucideIcon;
  description: string;
  subcategories: SubcategoryConfig[];
}

export const categoryConfigs: Record<string, CategoryConfig> = {
  'roboty-budowlane-remonty': {
    slug: 'roboty-budowlane-remonty',
    name: 'Budowlanka',
    shortName: 'Budowlanka',
    legacyNames: ['Roboty Budowlane i Remonty', 'Budowlane'],
    color: '#1e3a8a',
    icon: Hammer,
    description: 'Remonty dachów, termomodernizacja, renowacja, wymiana stolarki',
    subcategories: [
      {
        slug: 'remonty-dachow-izolacje',
        name: 'Dachy i izolacje',
        legacyNames: ['Remonty dachów i izolacje'],
      },
      {
        slug: 'termomodernizacja-elewacje',
        name: 'Elewacje i docieplenia',
        legacyNames: ['Termomodernizacja i elewacje'],
      },
      {
        slug: 'renowacja-klatek-schodowych',
        name: 'Remonty klatek',
        legacyNames: ['Renowacja klatek schodowych i korytarzy'],
      },
      {
        slug: 'wymiana-stolarki',
        name: 'Okna i drzwi',
        legacyNames: ['Wymiana stolarki okiennej i drzwiowej'],
      },
    ],
  },
  'sprzatanie-utrzymanie-czystosci': {
    slug: 'sprzatanie-utrzymanie-czystosci',
    name: 'Sprzątanie',
    shortName: 'Sprzątanie',
    legacyNames: ['Sprzątanie i Utrzymanie Czystości'],
    color: '#10b981',
    icon: Sparkles,
    description: 'Sprzątanie nieruchomości, mycie okien, DDD',
    subcategories: [
      {
        slug: 'biezace-sprzatanie',
        name: 'Stałe sprzątanie',
        legacyNames: ['Bieżące sprzątanie nieruchomości'],
      },
      {
        slug: 'sprzatanie-garazy-parkingi',
        name: 'Hale i parkingi',
        legacyNames: ['Sprzątanie hal garażowych i parkingów'],
      },
      {
        slug: 'mycie-okien-przeszklen',
        name: 'Mycie okien / Alpinizm',
        legacyNames: ['Mycie okien i przeszkleń'],
      },
      {
        slug: 'sprzatanie-poremontowe',
        name: 'Sprzątanie pobudowlane',
        legacyNames: ['Sprzątanie poremontowe i pobudowlane'],
      },
      {
        slug: 'dezynsekcja-deratyzacja-ddd',
        name: 'Dezynfekcja i DDD',
        legacyNames: ['Dezynsekcja, deratyzacja i DDD'],
      },
    ],
  },
  'zielen-tereny-zewnetrzne': {
    slug: 'zielen-tereny-zewnetrzne',
    name: 'Zieleń i Otoczenie',
    shortName: 'Zieleń i Otoczenie',
    legacyNames: ['Zieleń i Tereny Zewnętrzne', 'Zieleń'],
    color: '#22c55e',
    icon: TreePine,
    description: 'Pielęgnacja zieleni, brukarstwo, mała architektura, odśnieżanie',
    subcategories: [
      {
        slug: 'pielegnacja-roslinnosci',
        name: 'Trawniki i roślinność',
        legacyNames: ['Pielęgnacja roślinności i trawników'],
      },
      {
        slug: 'brukarstwo-naprawy-drog',
        name: 'Brukarstwo i drogi',
        legacyNames: ['Brukarstwo i naprawy dróg osiedlowych'],
      },
      {
        slug: 'mala-architektura-place-zabaw',
        name: 'Place zabaw i ławki',
        legacyNames: ['Mała architektura i place zabaw'],
      },
      {
        slug: 'odsniezanie-utrzymanie-zimowe',
        name: 'Odśnieżanie',
        legacyNames: ['Odśnieżanie i utrzymanie zimowe'],
      },
    ],
  },
  'instalacje-systemy-techniczne': {
    slug: 'instalacje-systemy-techniczne',
    name: 'Instalacje',
    shortName: 'Instalacje',
    legacyNames: ['Instalacje i Systemy Techniczne'],
    color: '#3b82f6',
    icon: Zap,
    description: 'Instalacje wodno-kanalizacyjne, elektryczne, systemy bezpieczeństwa',
    subcategories: [
      {
        slug: 'instalacje-wodno-kanalizacyjne-co',
        name: 'Hydraulika i C.O.',
        legacyNames: [
          'Instalacje wodno-kanalizacyjne i C.O.',
          'Instalacje hydrauliczne',
          'Instalacje wodno-kanalizacyjne',
        ],
      },
      {
        slug: 'instalacje-elektryczne-oswietlenie',
        name: 'Elektryka i oświetlenie',
        legacyNames: ['Instalacje elektryczne i oświetlenie'],
      },
      {
        slug: 'cctv-domofony-ppoz',
        name: 'CCTV, domofony, PPOŻ',
        legacyNames: [
          'Systemy bezpieczeństwa i niskie prądy (CCTV, Domofony, Kontrola dostępu)',
          'Systemy i zabezpieczenia PPOŻ',
        ],
      },
    ],
  },
  'przeglady-obsługa-techniczna': {
    slug: 'przeglady-obsługa-techniczna',
    name: 'Przeglądy i Serwis',
    shortName: 'Przeglądy i Serwis',
    legacyNames: ['Przeglądy i Obsługa Techniczna', 'Przeglądy'],
    color: '#f97316',
    icon: ClipboardCheck,
    description: 'Przeglądy techniczne, inspekcje, serwis urządzeń',
    subcategories: [
      {
        slug: 'przeglady-ogolnobudowlane-konstrukcyjne',
        name: 'Przeglądy budowlane',
        legacyNames: [
          'Przeglądy ogólnobudowlane i konstrukcyjne (roczne / 5-letnie)',
        ],
      },
      {
        slug: 'inspekcje-kominiarskie-droznosc-wentylacji',
        name: 'Kominiarz i wentylacja',
        legacyNames: ['Inspekcje kominiarskie i drożność wentylacji'],
      },
      {
        slug: 'serwis-bram-szlabanow-automatyki',
        name: 'Bramy i automatyka',
        legacyNames: ['Serwis bram wjazdowych, szlabanów i automatyki'],
      },
    ],
  },
  'ekspertyzy-projekty': {
    slug: 'ekspertyzy-projekty',
    name: 'Inżynieria',
    shortName: 'Inżynieria',
    legacyNames: ['Ekspertyzy i Projekty', 'Ekspertyzy'],
    color: '#8b5cf6',
    icon: FileText,
    description: 'Audyty energetyczne, projekty budowlane, nadzór inwestorski',
    subcategories: [
      {
        slug: 'audyty-energetyczne-esg',
        name: 'Audyty i ESG',
        legacyNames: ['Audyty energetyczne i certyfikaty ESG'],
      },
      {
        slug: 'projekty-budowlane-inzynierskie',
        name: 'Projekty i ekspertyzy',
        legacyNames: ['Projekty budowlane i inżynierskie'],
      },
      {
        slug: 'nadzor-inwestorski-kosztorysowanie',
        name: 'Nadzór i kosztorysy',
        legacyNames: ['Nadzór inwestorski i kosztorysowanie'],
      },
    ],
  },
};

/** Legacy DB slugs (sample data / older migrations) → current config slugs */
const categorySlugAliases: Record<string, string> = {
  'remonty-budownictwo': 'roboty-budowlane-remonty',
  'instalacje-techniczne': 'instalacje-systemy-techniczne',
  'wykończenia-dekoracje': 'roboty-budowlane-remonty',
  'usługi-sprzątające': 'sprzatanie-utrzymanie-czystosci',
  'zarządzanie-nieruchomościami': 'przeglady-obsługa-techniczna',
};

const subcategorySlugAliases: Record<string, string> = {
  'systemy-bezpieczenstwa-niskie-prady': 'cctv-domofony-ppoz',
  'systemy-zabezpieczenia-ppoz': 'cctv-domofony-ppoz',
  'instalacje-hydrauliczne': 'instalacje-wodno-kanalizacyjne-co',
};

function resolveCategorySlug(slug: string): string {
  return categorySlugAliases[slug] ?? slug;
}

function resolveSubcategorySlug(slug: string): string {
  return subcategorySlugAliases[slug] ?? slug;
}

function namesMatch(candidate: string, configName: string, legacyNames?: string[]): boolean {
  const normalized = candidate.trim().toLowerCase();
  if (configName.trim().toLowerCase() === normalized) {
    return true;
  }
  return (legacyNames ?? []).some((legacy) => legacy.trim().toLowerCase() === normalized);
}

export function getCategoryConfig(slug: string): CategoryConfig | undefined {
  return categoryConfigs[resolveCategorySlug(slug)];
}

export function getSubcategoryConfig(
  categorySlug: string,
  subcategorySlug: string,
): SubcategoryConfig | undefined {
  const category = getCategoryConfig(categorySlug);
  if (!category) {
    return undefined;
  }
  const resolved = resolveSubcategorySlug(subcategorySlug);
  return category.subcategories.find((sub) => sub.slug === resolved);
}

export function getCategoryColor(slug: string): string {
  return getCategoryConfig(slug)?.color ?? '#6b7280';
}

export function getCategoryIcon(slug: string): LucideIcon {
  return getCategoryConfig(slug)?.icon ?? FileText;
}

export function getAllCategoryConfigs(): CategoryConfig[] {
  return Object.values(categoryConfigs).sort((a, b) => {
    const order = [
      'roboty-budowlane-remonty',
      'sprzatanie-utrzymanie-czystosci',
      'zielen-tereny-zewnetrzne',
      'instalacje-systemy-techniczne',
      'przeglady-obsługa-techniczna',
      'ekspertyzy-projekty',
    ];
    return order.indexOf(a.slug) - order.indexOf(b.slug);
  });
}

/** OPD-105 display name for a main category (by slug or legacy name). */
export function getCategoryDisplayName(input?: {
  slug?: string | null;
  name?: string | null;
}): string {
  if (input?.slug) {
    const bySlug = getCategoryConfig(input.slug);
    if (bySlug) {
      return bySlug.name;
    }
  }

  if (input?.name) {
    for (const config of getAllCategoryConfigs()) {
      if (namesMatch(input.name, config.name, config.legacyNames)) {
        return config.name;
      }
    }
    return input.name;
  }

  return 'Inne';
}

/** OPD-105 display name for a subcategory (by slug or legacy name). */
export function getSubcategoryDisplayName(input?: {
  slug?: string | null;
  name?: string | null;
  categorySlug?: string | null;
}): string | undefined {
  if (!input?.name && !input?.slug) {
    return undefined;
  }

  if (input.slug && input.categorySlug) {
    const bySlug = getSubcategoryConfig(input.categorySlug, input.slug);
    if (bySlug) {
      return bySlug.name;
    }
  }

  if (input.slug) {
    for (const category of getAllCategoryConfigs()) {
      const resolved = resolveSubcategorySlug(input.slug);
      const match = category.subcategories.find((sub) => sub.slug === resolved);
      if (match) {
        return match.name;
      }
    }
  }

  if (input.name) {
    const categories = input.categorySlug
      ? [getCategoryConfig(input.categorySlug)].filter(Boolean)
      : getAllCategoryConfigs();

    for (const category of categories) {
      if (!category) {
        continue;
      }
      for (const sub of category.subcategories) {
        if (namesMatch(input.name, sub.name, sub.legacyNames)) {
          return sub.name;
        }
      }
    }
    return input.name;
  }

  return undefined;
}

/** Compact "Kategoria · Podkategoria" label for contest cards. */
export function formatContestCategoryLine(input?: {
  category?: string | { name?: string; slug?: string } | null;
  subcategory?: string | null;
  subcategorySlug?: string | null;
}): string | undefined {
  const categorySlug =
    typeof input?.category === 'object' ? input.category.slug : undefined;
  const categoryName =
    typeof input?.category === 'string'
      ? input.category
      : input?.category?.name;

  const categoryLabel = getCategoryDisplayName({ slug: categorySlug, name: categoryName });
  const subcategoryLabel = getSubcategoryDisplayName({
    slug: input?.subcategorySlug,
    name: input?.subcategory ?? undefined,
    categorySlug,
  });

  if (categoryLabel && subcategoryLabel) {
    return `${categoryLabel} · ${subcategoryLabel}`;
  }

  return subcategoryLabel ?? (categoryLabel !== 'Inne' ? categoryLabel : undefined);
}

/** Canonical OPD-105 key for filter state and counts. */
export function normalizeCategoryFilterKey(
  name: string,
  slug?: string | null,
): string {
  return getCategoryDisplayName({ name, slug });
}

/** Canonical OPD-105 key for filter state and counts. */
export function normalizeSubcategoryFilterKey(
  name: string,
  categorySlug?: string | null,
): string {
  return getSubcategoryDisplayName({ name, categorySlug }) ?? name.trim();
}

export function categoryFilterKeysMatch(
  jobCategory: string,
  filterKey: string,
  categorySlug?: string | null,
): boolean {
  return (
    normalizeCategoryFilterKey(jobCategory, categorySlug) ===
    normalizeCategoryFilterKey(filterKey, categorySlug)
  );
}

export function subcategoryFilterKeysMatch(
  jobSubcategory: string,
  filterKey: string,
  categorySlug?: string | null,
): boolean {
  return (
    normalizeSubcategoryFilterKey(jobSubcategory, categorySlug) ===
    normalizeSubcategoryFilterKey(filterKey, categorySlug)
  );
}

export interface FilterSubcategoryTreeItem {
  id: string;
  slug: string;
  filterKey: string;
  label: string;
}

export interface FilterCategoryTreeItem {
  id: string;
  slug: string;
  filterKey: string;
  label: string;
  subcategories: FilterSubcategoryTreeItem[];
}

interface DbCategoryLike {
  id: string;
  name: string;
  slug: string;
  subcategories: Array<{ id: string; name: string; slug: string }>;
}

/** OPD-105 category tree for filters — config is source of truth, DB supplies IDs. */
export function buildFilterCategoryTree(
  dbCategories: DbCategoryLike[],
): FilterCategoryTreeItem[] {
  const dbBySlug = new Map(
    dbCategories.map((category) => [resolveCategorySlug(category.slug), category]),
  );

  return getAllCategoryConfigs().map((config) => {
    const dbCategory = dbBySlug.get(config.slug);

    const subcategories: FilterSubcategoryTreeItem[] = config.subcategories.map(
      (subConfig) => {
        const dbSub = dbCategory?.subcategories.find(
          (sub) => resolveSubcategorySlug(sub.slug) === subConfig.slug,
        );

        return {
          id: dbSub?.id ?? `config-${subConfig.slug}`,
          slug: subConfig.slug,
          filterKey: subConfig.name,
          label: subConfig.name,
        };
      },
    );

    return {
      id: dbCategory?.id ?? `config-${config.slug}`,
      slug: config.slug,
      filterKey: config.name,
      label: config.name,
      subcategories,
    };
  });
}

/** Resolve filter keys to DB subcategory IDs (supports legacy names and slug aliases). */
export function resolveSubcategoryIdsFromFilterKeys(
  dbCategories: DbCategoryLike[],
  filterKeys: string[],
): string[] {
  const ids: string[] = [];

  for (const filterKey of filterKeys) {
    for (const config of getAllCategoryConfigs()) {
      for (const subConfig of config.subcategories) {
        if (
          subConfig.name === filterKey ||
          subcategoryFilterKeysMatch(filterKey, subConfig.name, config.slug)
        ) {
          const dbCategory = dbCategories.find(
            (c) => resolveCategorySlug(c.slug) === config.slug,
          );
          if (!dbCategory) {
            continue;
          }

          const matchedSubs = dbCategory.subcategories.filter((sub) => {
            const resolved = resolveSubcategorySlug(sub.slug);
            if (resolved === subConfig.slug) {
              return true;
            }
            return subcategoryFilterKeysMatch(sub.name, subConfig.name, config.slug);
          });

          for (const dbSub of matchedSubs) {
            ids.push(dbSub.id);
          }
        }
      }
    }
  }

  return [...new Set(ids)];
}

/** Resolve filter keys to DB main category IDs (supports legacy names). */
export function resolveCategoryIdsFromFilterKeys(
  dbCategories: DbCategoryLike[],
  filterKeys: string[],
): string[] {
  const ids: string[] = [];

  for (const filterKey of filterKeys) {
    for (const config of getAllCategoryConfigs()) {
      if (
        config.name === filterKey ||
        categoryFilterKeysMatch(filterKey, config.name, config.slug)
      ) {
        const dbCategory = dbCategories.find(
          (c) => resolveCategorySlug(c.slug) === config.slug,
        );
        if (dbCategory) {
          ids.push(dbCategory.id);
        }
      }
    }
  }

  return [...new Set(ids)];
}
