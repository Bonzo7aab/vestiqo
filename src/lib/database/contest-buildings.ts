import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';

type DbClient = SupabaseClient<Database>;

export async function fetchContestBuildingIds(
  supabase: DbClient,
  contestId: string,
): Promise<{ data: string[]; error: PostgrestError | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('contest_buildings')
      .select('building_id')
      .eq('contest_id', contestId);

    if (error) return { data: [], error };
    const ids = ((data ?? []) as Array<{ building_id: string }>).map((row) => row.building_id);
    return { data: ids, error: null };
  } catch (err) {
    console.error('Error fetching contest buildings:', err);
    return { data: [], error: err as PostgrestError };
  }
}

export async function replaceContestBuildings(
  supabase: DbClient,
  contestId: string,
  buildingIds: string[],
): Promise<{ error: PostgrestError | null }> {
  try {
    const uniqueIds = [...new Set(buildingIds.filter((id) => id.trim().length > 0))];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase as any)
      .from('contest_buildings')
      .delete()
      .eq('contest_id', contestId);

    if (deleteError) return { error: deleteError };
    if (uniqueIds.length === 0) return { error: null };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any).from('contest_buildings').insert(
      uniqueIds.map((buildingId) => ({
        contest_id: contestId,
        building_id: buildingId,
      })),
    );

    if (insertError) return { error: insertError };
    return { error: null };
  } catch (err) {
    console.error('Error replacing contest buildings:', err);
    return { error: err as PostgrestError };
  }
}
