// Utility functions for managing bookmarked listings in localStorage
// Optionally syncs with database when user is authenticated

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import {
  addBookmark as addBookmarkDb,
  removeBookmark as removeBookmarkDb,
} from '../lib/database/bookmarks';
import type { BookmarkEntityType } from '../types/bookmark';
import type { Budget } from '../types/budget';
import {
  decrementBookmarkCountOverride,
  incrementBookmarkCountOverride,
} from './bookmarkCountOverrides';

export interface BookmarkedJob {
  id: string;
  entityType: BookmarkEntityType;
  title: string;
  company: string;
  location: string | { city?: string; sublocality_level_1?: string };
  /** @deprecated Use entityType instead */
  postType: 'job' | 'contest';
  bookmarkedAt: string;
  budget?: string | Budget;
  deadline?: string;
}

const BOOKMARKS_KEY = 'urbi-bookmarked-jobs';

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function normalizeBookmark(raw: BookmarkedJob & { postType?: 'job' | 'contest' | 'tender' }): BookmarkedJob {
  const legacyPostType = raw.postType as 'job' | 'contest' | 'tender' | undefined;
  const entityType: BookmarkEntityType =
    raw.entityType ??
    (legacyPostType === 'contest' || legacyPostType === 'tender' ? 'contest' : 'job');

  if (entityType === 'managed_housing_entity') {
    return {
      ...raw,
      entityType,
      postType: 'contest',
      title: raw.title,
      company: raw.company ?? '',
      location: raw.location ?? '',
    };
  }

  const normalizedPostType: 'job' | 'contest' =
    legacyPostType === 'tender' || legacyPostType === 'contest'
      ? 'contest'
      : legacyPostType === 'job'
        ? 'job'
        : entityType === 'job'
          ? 'job'
          : 'contest';

  return {
    ...raw,
    entityType,
    postType: normalizedPostType,
  };
}

function bookmarkKey(entityType: BookmarkEntityType, id: string): string {
  return `${entityType}:${id}`;
}

export const getBookmarkedJobs = (): BookmarkedJob[] => {
  if (!canUseLocalStorage()) {
    return [];
  }
  try {
    const bookmarks = localStorage.getItem(BOOKMARKS_KEY);
    const parsed = bookmarks
      ? (JSON.parse(bookmarks) as BookmarkedJob[])
      : [];
    return parsed.map(normalizeBookmark);
  } catch (error) {
    console.error('Error loading bookmarked jobs:', error);
    return [];
  }
};

export const addBookmark = async (
  bookmark: Omit<BookmarkedJob, 'bookmarkedAt'>,
  supabase?: SupabaseClient<Database>,
  userId?: string,
  bookmarksCountBaseline?: number,
): Promise<void> => {
  try {
    const entityType = bookmark.entityType;

    if (supabase && userId) {
      const { error } = await addBookmarkDb(
        supabase,
        entityType,
        bookmark.id,
        userId,
      );
      if (error) {
        console.warn('Failed to sync bookmark with database:', error);
      }
    }

    const bookmarks = getBookmarkedJobs();
    const newBookmark: BookmarkedJob = {
      ...normalizeBookmark(bookmark as BookmarkedJob),
      bookmarkedAt: new Date().toISOString(),
    };

    const key = bookmarkKey(entityType, bookmark.id);
    const filteredBookmarks = bookmarks.filter(
      (item) => bookmarkKey(item.entityType, item.id) !== key,
    );

    const updatedBookmarks = [newBookmark, ...filteredBookmarks];

    if (canUseLocalStorage()) {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updatedBookmarks));
    }

    if (bookmarksCountBaseline !== undefined && entityType === 'job') {
      incrementBookmarkCountOverride(bookmark.id, bookmarksCountBaseline);
    }

    console.log('✅ Bookmark saved:', entityType, bookmark.id);
  } catch (error) {
    console.error('Error adding bookmark:', error);
  }
};

export const removeBookmark = async (
  entityId: string,
  entityType: BookmarkEntityType,
  supabase?: SupabaseClient<Database>,
  userId?: string,
  bookmarksCountBaseline?: number,
): Promise<void> => {
  try {
    if (supabase && userId) {
      const { error } = await removeBookmarkDb(
        supabase,
        entityType,
        entityId,
        userId,
      );
      if (error) {
        console.warn('Failed to sync bookmark removal with database:', error);
      }
    }

    const bookmarks = getBookmarkedJobs();
    const key = bookmarkKey(entityType, entityId);
    const updatedBookmarks = bookmarks.filter(
      (item) => bookmarkKey(item.entityType, item.id) !== key,
    );

    if (canUseLocalStorage()) {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updatedBookmarks));
    }

    if (bookmarksCountBaseline !== undefined && entityType === 'job') {
      decrementBookmarkCountOverride(entityId, bookmarksCountBaseline);
    }

    console.log('✅ Bookmark removed:', entityType, entityId);
  } catch (error) {
    console.error('Error removing bookmark:', error);
  }
};

export const isBookmarked = (
  entityId: string,
  entityType: BookmarkEntityType,
): boolean => {
  try {
    const bookmarks = getBookmarkedJobs();
    const key = bookmarkKey(entityType, entityId);
    return bookmarks.some(
      (item) => bookmarkKey(item.entityType, item.id) === key,
    );
  } catch (error) {
    console.error('Error checking bookmark status:', error);
    return false;
  }
};

/** @deprecated Use isBookmarked(entityId, entityType) */
export const isJobBookmarked = (jobId: string): boolean => {
  return isBookmarked(jobId, 'job');
};

export const clearAllBookmarks = (): void => {
  if (!canUseLocalStorage()) {
    return;
  }
  try {
    localStorage.removeItem(BOOKMARKS_KEY);
    console.log('✅ All bookmarks cleared');
  } catch (error) {
    console.error('Error clearing bookmarks:', error);
  }
};
