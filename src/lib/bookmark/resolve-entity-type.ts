import type { BookmarkEntityType } from '../../types/bookmark';

export interface BookmarkEntitySource {
  postType?: 'job' | 'contest';
  contestInfo?: unknown;
  managed_entity_id?: string | null;
  selection_criteria?: unknown;
  formal_requirements?: unknown;
}

export function resolveBookmarkEntityType(
  source: BookmarkEntitySource,
): BookmarkEntityType {
  if (source.postType !== 'contest') {
    return 'job';
  }

  return 'contest';
}
