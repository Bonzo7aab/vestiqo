import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { CONTEST_TENDERS_OR_FILTER } from './jobs';

export interface PublicEntityContest {
  id: string;
  title: string;
  status: string;
  selectedOfferCompanyName: string | null;
  offersCount: number;
  /** Mapped to ticket “Termin rozpoczęcia” (DB: completion_date / Termin wykonania). */
  completionDate: string | null;
  projectDuration: string | null;
}

interface PublicEntityContestFilters {
  status?: string | null;
  titleQuery?: string | null;
}

interface ContestRow {
  id: string;
  title: string;
  status: string;
  completion_date: string | null;
  project_duration: string | null;
  offers_count: number | null;
  winner_name: string | null;
}

/**
 * Public contests for a managed housing entity profile (OPD-152).
 * Excludes drafts; optional status + title filters.
 * Uses denormalized `offers_count` / `winner_name` (contest_offers RLS hides peers' offers).
 */
export async function fetchPublicEntityContests(
  supabase: SupabaseClient<Database>,
  entityId: string,
  filters: PublicEntityContestFilters = {},
): Promise<{ data: PublicEntityContest[]; error: PostgrestError | null }> {
  const id = entityId?.trim();
  if (!id) {
    return { data: [], error: null };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('contests')
      .select(
        `
        id,
        title,
        status,
        completion_date,
        project_duration,
        offers_count,
        winner_name
      `,
      )
      .eq('managed_entity_id', id)
      .eq('is_public', true)
      .neq('status', 'draft')
      .or(CONTEST_TENDERS_OR_FILTER)
      .order('created_at', { ascending: false });

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    const titleQuery = filters.titleQuery?.trim();
    if (titleQuery) {
      query = query.ilike('title', `%${titleQuery}%`);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error('fetchPublicEntityContests:', error);
      return { data: [], error: error as PostgrestError };
    }

    const contestRows = (rows || []) as ContestRow[];

    const data: PublicEntityContest[] = contestRows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      selectedOfferCompanyName: row.winner_name?.trim() || null,
      offersCount: row.offers_count ?? 0,
      completionDate: row.completion_date
        ? row.completion_date.split('T')[0]
        : null,
      projectDuration: row.project_duration?.trim() || null,
    }));

    return { data, error: null };
  } catch (err) {
    console.error('fetchPublicEntityContests exception:', err);
    return { data: [], error: err as PostgrestError };
  }
}
