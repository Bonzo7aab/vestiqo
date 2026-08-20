import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import type { BookmarkEntityType } from '../../types/bookmark';

interface BookmarkRow {
  entity_type: BookmarkEntityType;
  entity_id: string;
}

async function adjustJobBookmarksCount(
  supabase: SupabaseClient<Database>,
  jobId: string,
  delta: 1 | -1,
): Promise<void> {
  const { data: currentJob, error: fetchError } = await supabase
    .from('jobs')
    .select('bookmarks_count')
    .eq('id', jobId)
    .single();

  if (fetchError) {
    console.warn('Failed to fetch current bookmarks_count:', fetchError);
    return;
  }

  const currentCount = currentJob?.bookmarks_count || 0;
  const newCount =
    delta === 1 ? currentCount + 1 : Math.max(0, currentCount - 1);

  const { error: updateError } = await supabase
    .from('jobs')
    .update({ bookmarks_count: newCount })
    .eq('id', jobId);

  if (updateError) {
    console.warn('Failed to update bookmarks_count:', updateError);
  }
}

/**
 * Add a bookmark for a listing entity (job or contest).
 */
export async function addBookmark(
  supabase: SupabaseClient<Database>,
  entityType: BookmarkEntityType,
  entityId: string,
  userId: string,
): Promise<{ error: PostgrestError | null }> {
  try {
    const { data: existing, error: checkError } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      return { error: null };
    }

    if (checkError && checkError.code !== 'PGRST116') {
      return { error: checkError };
    }

    const { error } = await supabase.from('bookmarks').insert({
      entity_type: entityType,
      entity_id: entityId,
      user_id: userId,
    });

    if (error) {
      return { error };
    }

    if (entityType === 'job') {
      await adjustJobBookmarksCount(supabase, entityId, 1);
    }

    return { error: null };
  } catch (err) {
    console.error('Error adding bookmark:', err);
    return { error: err as PostgrestError };
  }
}

/**
 * Remove a bookmark for a listing entity.
 */
export async function removeBookmark(
  supabase: SupabaseClient<Database>,
  entityType: BookmarkEntityType,
  entityId: string,
  userId: string,
): Promise<{ error: PostgrestError | null }> {
  try {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('user_id', userId);

    if (error) {
      return { error };
    }

    if (entityType === 'job') {
      await adjustJobBookmarksCount(supabase, entityId, -1);
    }

    return { error: null };
  } catch (err) {
    console.error('Error removing bookmark:', err);
    return { error: err as PostgrestError };
  }
}

/**
 * Check if an entity is bookmarked by a user.
 */
export async function isBookmarkedInDb(
  supabase: SupabaseClient<Database>,
  entityType: BookmarkEntityType,
  entityId: string,
  userId: string,
): Promise<{ bookmarked: boolean; error: PostgrestError | null }> {
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      return { bookmarked: false, error };
    }

    return { bookmarked: !!data, error: null };
  } catch (err) {
    console.error('Error checking bookmark:', err);
    return { bookmarked: false, error: err as PostgrestError };
  }
}

/**
 * Get bookmark count for a single entity.
 */
export async function getBookmarkCount(
  supabase: SupabaseClient<Database>,
  entityType: BookmarkEntityType,
  entityId: string,
): Promise<{ count: number; error: PostgrestError | null }> {
  try {
    const { count, error } = await supabase
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);

    return { count: count || 0, error };
  } catch (err) {
    console.error('Error getting bookmark count:', err);
    return { count: 0, error: err as PostgrestError };
  }
}

/**
 * Get bookmarked rows for a user, optionally filtered by type.
 */
export async function getUserBookmarks(
  supabase: SupabaseClient<Database>,
  userId: string,
  entityType?: BookmarkEntityType,
): Promise<{
  bookmarks: Array<{ entity_type: BookmarkEntityType; entity_id: string; created_at: string }>;
  error: PostgrestError | null;
}> {
  try {
    let query = supabase
      .from('bookmarks')
      .select('entity_type, entity_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    const { data, error } = await query;

    if (error) {
      return { bookmarks: [], error };
    }

    return {
      bookmarks: (data || []).map((row) => ({
        entity_type: row.entity_type as BookmarkEntityType,
        entity_id: row.entity_id,
        created_at: row.created_at ?? '',
      })),
      error: null,
    };
  } catch (err) {
    console.error('Error getting user bookmark rows:', err);
    return { bookmarks: [], error: err as PostgrestError };
  }
}

/**
 * Get bookmarked entity IDs for a user, optionally filtered by type.
 */
export async function getUserBookmarkedEntityIds(
  supabase: SupabaseClient<Database>,
  userId: string,
  entityType?: BookmarkEntityType,
): Promise<{ entityIds: string[]; error: PostgrestError | null }> {
  try {
    let query = supabase
      .from('bookmarks')
      .select('entity_id')
      .eq('user_id', userId);

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    const { data, error } = await query;

    if (error) {
      return { entityIds: [], error };
    }

    const entityIds = (data || []).map((bookmark) => bookmark.entity_id);
    return { entityIds, error: null };
  } catch (err) {
    console.error('Error getting user bookmarks:', err);
    return { entityIds: [], error: err as PostgrestError };
  }
}

/**
 * Get bookmark counts for multiple entities of the same type.
 */
export async function getBookmarkCounts(
  supabase: SupabaseClient<Database>,
  entityType: BookmarkEntityType,
  entityIds: string[],
): Promise<{ counts: Record<string, number>; error: PostgrestError | null }> {
  try {
    if (!entityIds || entityIds.length === 0) {
      return { counts: {}, error: null };
    }

    const { data, error } = await supabase
      .from('bookmarks')
      .select('entity_id')
      .eq('entity_type', entityType)
      .in('entity_id', entityIds);

    if (error) {
      return { counts: {}, error };
    }

    const counts: Record<string, number> = {};
    entityIds.forEach((entityId) => {
      counts[entityId] = 0;
    });

    (data || []).forEach((bookmark: Pick<BookmarkRow, 'entity_id'>) => {
      if (bookmark.entity_id) {
        counts[bookmark.entity_id] = (counts[bookmark.entity_id] || 0) + 1;
      }
    });

    return { counts, error: null };
  } catch (err) {
    console.error('Error getting bookmark counts:', err);
    return { counts: {}, error: err as PostgrestError };
  }
}

/** @deprecated Use getBookmarkCounts with entityType 'job' */
export async function getBookmarkCountsForJobs(
  supabase: SupabaseClient<Database>,
  jobIds: string[],
): Promise<{ counts: Record<string, number>; error: PostgrestError | null }> {
  return getBookmarkCounts(supabase, 'job', jobIds);
}

/** @deprecated Use getUserBookmarkedEntityIds with entityType 'job' */
export async function getUserBookmarkedJobIds(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ jobIds: string[]; error: PostgrestError | null }> {
  const { entityIds, error } = await getUserBookmarkedEntityIds(
    supabase,
    userId,
    'job',
  );
  return { jobIds: entityIds, error };
}

/** @deprecated Use getBookmarkCount with entityType 'job' */
export async function getJobBookmarksCount(
  supabase: SupabaseClient<Database>,
  jobId: string,
): Promise<{ count: number; error: PostgrestError | null }> {
  return getBookmarkCount(supabase, 'job', jobId);
}

/** @deprecated Use isBookmarkedInDb */
export async function isJobBookmarked(
  supabase: SupabaseClient<Database>,
  jobId: string,
  userId: string,
): Promise<{ bookmarked: boolean; error: PostgrestError | null }> {
  return isBookmarkedInDb(supabase, 'job', jobId, userId);
}

/** @deprecated Use addBookmark */
export async function addJobBookmark(
  supabase: SupabaseClient<Database>,
  jobId: string,
  userId: string,
): Promise<{ error: PostgrestError | null }> {
  return addBookmark(supabase, 'job', jobId, userId);
}

/** @deprecated Use removeBookmark */
export async function removeJobBookmark(
  supabase: SupabaseClient<Database>,
  jobId: string,
  userId: string,
): Promise<{ error: PostgrestError | null }> {
  return removeBookmark(supabase, 'job', jobId, userId);
}
