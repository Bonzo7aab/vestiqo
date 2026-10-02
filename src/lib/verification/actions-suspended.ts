import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';

export const SUSPENDED_CONTEST_MESSAGE =
  'Twoje konto jest zawieszone. Nie możesz utworzyć konkursu.';

export const SUSPENDED_OFFER_MESSAGE =
  'Twoje konto jest zawieszone. Nie możesz złożyć oferty.';

export async function isAccountActionsSuspended(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('actions_suspended')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  return data.actions_suspended === true;
}
