import type { Job } from '../../types/job';
import { WARSAW_DISTRICTS } from '../config/warsawDistricts';
import { extractCity, extractSublocality } from '../../utils/locationMapping';
import { isJobExpired } from '../../utils/jobHelpers';
import type { DeadlineFilterKey, FilterState } from './filter-state';
import { WARSAW_CITY } from './filter-state';
import {
  categoryFilterKeysMatch,
  subcategoryFilterKeysMatch,
} from '../config/categoryConfig';

export type FilterCountDimension =
  | 'categories'
  | 'subcategories'
  | 'cities'
  | 'deadline'
  | 'formal'
  | 'searchQuery';

export function filtersForCountDimension(
  filters: FilterState,
  dimension: FilterCountDimension,
): FilterState {
  switch (dimension) {
    case 'categories':
      return { ...filters, categories: [], subcategories: [] };
    case 'subcategories':
      return { ...filters, subcategories: [] };
    case 'cities':
      return { ...filters, cities: [] };
    case 'deadline':
      return { ...filters, deadline: [] };
    case 'formal':
      return { ...filters, noDeposit: false, noReferencesRequired: false };
    case 'searchQuery':
      return { ...filters, searchQuery: '' };
  }
}

/** Jobs eligible for sidebar counts — mirrors JobList filtering (incl. expiry). */
export function getListEligibleJobs(
  jobs: Job[],
  filters: FilterState,
  bookmarkedIds?: ReadonlySet<string>,
  omitDimension?: FilterCountDimension,
): Job[] {
  const effective = omitDimension
    ? filtersForCountDimension(filters, omitDimension)
    : filters;

  return jobs.filter((job) => {
    if (isJobExpired(job)) return false;
    if (
      effective.favoritesOnly &&
      bookmarkedIds &&
      !matchesFavoritesFilter(job.id, true, bookmarkedIds)
    ) {
      return false;
    }
    return jobMatchesFilters(job, effective);
  });
}

export function getJobDeadline(job: Job): Date | null {
  if (job.deadline) {
    const d = new Date(job.deadline);
    if (!isNaN(d.getTime())) return d;
  }
  if ('contestInfo' in job && job.contestInfo?.submissionDeadline) {
    const d = new Date(job.contestInfo.submissionDeadline);
    if (!isNaN(d.getTime())) return d;
  }
  if (
    'postType' in job &&
    job.postType === 'contest' &&
    'tenderInfo' in job &&
    job.tenderInfo?.submissionDeadline
  ) {
    const d = new Date(job.tenderInfo.submissionDeadline);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

export function getJobOfferCount(job: Job): number {
  return job.applications ?? job.metrics?.applications ?? 0;
}

export function getJobCreatedTime(job: Job): number {
  const createdAt = (job as Job & { created_at?: string }).created_at;
  if (createdAt) {
    const t = new Date(createdAt).getTime();
    if (!isNaN(t)) return t;
  }
  const fromPosted = new Date(job.postedTime).getTime();
  return isNaN(fromPosted) ? 0 : fromPosted;
}

export function jobRequiresDeposit(job: Job): boolean {
  if (job.contestInfo) return job.contestInfo.depositRequired;
  const wadium = job.tenderInfo?.wadium?.trim().toLowerCase();
  if (!wadium || wadium === '0 pln' || wadium === 'brak' || wadium === '0') return false;
  return true;
}

export function jobRequiresReferences(job: Job): boolean {
  return Boolean(job.contestInfo?.formalRequirements?.references);
}

function hoursUntilDeadline(deadline: Date, now: Date): number {
  return (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
}

export function matchesDeadlineFilter(deadline: Date, filter: DeadlineFilterKey): boolean {
  const now = new Date();
  if (deadline.getTime() <= now.getTime()) return false;

  const hoursLeft = hoursUntilDeadline(deadline, now);
  const daysLeft = hoursLeft / 24;

  switch (filter) {
    case 'within-48h':
      return hoursLeft <= 48;
    case 'within-7-days':
      return daysLeft <= 7;
    case 'within-14-days':
      return daysLeft <= 14;
    case 'over-14-days':
      return daysLeft > 14;
    default:
      return false;
  }
}

/** Map legacy URL deadline keys to current submission-window keys. */
export function migrateLegacyDeadlineKeys(values: string[]): DeadlineFilterKey[] {
  const map: Record<string, DeadlineFilterKey> = {
    today: 'within-48h',
    'within-week': 'within-7-days',
    'within-month': 'within-14-days',
    'within-3-months': 'over-14-days',
    'within-6-months': 'over-14-days',
    'within-year': 'over-14-days',
    'last-week': 'within-7-days',
    'last-month': 'within-14-days',
    'last-3-months': 'over-14-days',
    'last-6-months': 'over-14-days',
    'last-year': 'over-14-days',
    'within-48h': 'within-48h',
    'within-7-days': 'within-7-days',
    'within-14-days': 'within-14-days',
    'over-14-days': 'over-14-days',
  };
  return values
    .map((v) => map[v])
    .filter((v): v is DeadlineFilterKey => Boolean(v));
}

/** @deprecated Use migrateLegacyDeadlineKeys */
export function migrateDateAddedToDeadline(values: string[]): DeadlineFilterKey[] {
  return migrateLegacyDeadlineKeys(values);
}

export function matchesFavoritesFilter(
  jobId: string,
  favoritesOnly: boolean,
  bookmarkedIds: ReadonlySet<string>,
): boolean {
  if (!favoritesOnly) return true;
  return bookmarkedIds.has(jobId);
}

export function jobMatchesFilters(job: Job, filters: FilterState): boolean {
  if (filters.postTypes?.length > 0) {
    const jobPostType = ('postType' in job && job.postType) ? job.postType : 'job';
    if (!filters.postTypes.includes(jobPostType)) return false;
  }

  if (filters.categories.length > 0) {
    const jobCategory =
      typeof job.category === 'string'
        ? job.category
        : job.category?.name || 'Inne';
    const categorySlug =
      typeof job.category === 'object' ? job.category?.slug : undefined;
    const matchesCategory = filters.categories.some((filterKey) =>
      categoryFilterKeysMatch(jobCategory, filterKey, categorySlug),
    );
    if (!matchesCategory) return false;
  }

  if (filters.subcategories.length > 0) {
    if (!job.subcategory) return false;
    const categorySlug =
      typeof job.category === 'object' ? job.category?.slug : undefined;
    const matchesSubcategory = filters.subcategories.some((filterKey) =>
      subcategoryFilterKeysMatch(job.subcategory!, filterKey, categorySlug),
    );
    if (!matchesSubcategory) return false;
  }

  if (filters.cities.length > 0) {
    const jobCity = extractCity(job.location);
    if (!filters.cities.includes(jobCity)) return false;
  }

  if (filters.searchQuery?.trim()) {
    const term = filters.searchQuery.toLowerCase().trim();
    const categoryName =
      typeof job.category === 'string'
        ? job.category
        : job.category?.name || '';
    const matchesSearch =
      (job.title || '').toLowerCase().includes(term) ||
      (job.subcategory || '').toLowerCase().includes(term) ||
      categoryName.toLowerCase().includes(term);
    if (!matchesSearch) return false;
  }

  if (filters.deadline.length > 0) {
    const jobDeadline = getJobDeadline(job);
    if (!jobDeadline) return false;
    const matchesAny = filters.deadline.some((f) =>
      matchesDeadlineFilter(jobDeadline, f)
    );
    if (!matchesAny) return false;
  }

  if (filters.noDeposit && jobRequiresDeposit(job)) return false;

  if (filters.noReferencesRequired && jobRequiresReferences(job)) return false;

  return true;
}

/** All official Warsaw districts for filter UI (including those with zero listings). */
export function getWarsawDistrictsForFilters(): string[] {
  return [...WARSAW_DISTRICTS];
}

export function getDeadlineFilterCounts(jobs: Job[]): Record<DeadlineFilterKey, number> {
  const counts = {} as Record<DeadlineFilterKey, number>;
  const keys: DeadlineFilterKey[] = [
    'within-48h',
    'within-7-days',
    'within-14-days',
    'over-14-days',
  ];
  for (const key of keys) {
    counts[key] = 0;
  }
  for (const job of jobs) {
    const deadline = getJobDeadline(job);
    if (!deadline) continue;
    for (const key of keys) {
      if (matchesDeadlineFilter(deadline, key)) {
        counts[key] += 1;
      }
    }
  }
  return counts;
}

export function getFormalCriteriaCounts(jobs: Job[]): {
  noDeposit: number;
  noReferencesRequired: number;
} {
  let noDeposit = 0;
  let noReferencesRequired = 0;
  for (const job of jobs) {
    if (!jobRequiresDeposit(job)) noDeposit += 1;
    if (!jobRequiresReferences(job)) noReferencesRequired += 1;
  }
  return { noDeposit, noReferencesRequired };
}

/** @deprecated Prefer getWarsawDistrictsForFilters — kept for job-derived district sets. */
export function getWarsawDistrictsFromJobs(jobs: Job[]): string[] {
  const districts = new Set<string>();
  jobs.forEach((job) => {
    const city = extractCity(job.location);
    if (city !== WARSAW_CITY) return;
    const sub = extractSublocality(job.location);
    if (sub) districts.add(sub);
  });
  return Array.from(districts).sort();
}
