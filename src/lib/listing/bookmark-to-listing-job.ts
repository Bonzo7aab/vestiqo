import type { Job } from '../../types/job';
import type { Budget } from '../../types/budget';
import { formatBudget } from '../../types/budget';
import type { BookmarkedJob } from '../../utils/bookmarkStorage';

const EMPTY_BUDGET: Budget = {
  min: null,
  max: null,
  type: 'negotiable',
  currency: 'PLN',
};

/** Maps localStorage bookmark to homepage listing card shape (contests). */
export function bookmarkToListingJob(bookmark: BookmarkedJob): Job {
  let salary = '';
  let budget: Budget = EMPTY_BUDGET;

  if (typeof bookmark.budget === 'string' && bookmark.budget.trim()) {
    salary = bookmark.budget.trim();
  } else if (bookmark.budget && typeof bookmark.budget === 'object') {
    budget = bookmark.budget;
    salary = formatBudget(bookmark.budget);
  }

  const location =
    typeof bookmark.location === 'string'
      ? { city: bookmark.location }
      : {
          city: bookmark.location?.city || '—',
          sublocality_level_1: bookmark.location?.sublocality_level_1,
        };

  const submissionDeadline = bookmark.deadline;

  return {
    id: bookmark.id,
    postType: 'contest',
    title: bookmark.title,
    company: bookmark.company,
    location,
    type: 'Konkurs',
    description: '',
    postedTime: '',
    salary,
    budget,
    category: 'Inne',
    verified: false,
    urgency: 'medium',
    metrics: { applications: 0, visits: 0, bookmarks: 0 },
    deadline: submissionDeadline,
    tenderInfo: submissionDeadline
      ? {
          tenderType: 'Konkurs ofert',
          phases: [],
          currentPhase: 'Składanie ofert',
          wadium: '0 PLN',
          evaluationCriteria: [],
          documentsRequired: [],
          submissionDeadline,
          projectDuration: 'Do uzgodnienia',
          technicalSpecifications: {},
        }
      : undefined,
  };
}

export function isContestBookmark(bookmark: BookmarkedJob): boolean {
  return bookmark.entityType === 'contest';
}

export function isHousingEntityBookmark(bookmark: BookmarkedJob): boolean {
  return bookmark.entityType === 'managed_housing_entity';
}

export function formatKonkursCountLabel(count: number): string {
  if (count === 1) return '1 konkurs';
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} konkursy`;
  }
  return `${count} konkursów`;
}

export function formatHousingEntityCountLabel(count: number): string {
  if (count === 1) return '1 wspólnota/spółdzielnia';
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} wspólnoty/spółdzielnie`;
  }
  return `${count} wspólnot/spółdzielni`;
}
