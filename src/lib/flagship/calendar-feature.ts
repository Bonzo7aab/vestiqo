import 'server-only';

import type { EvaluationContext } from '@openfeature/server-sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { buildEvaluationContext } from './context';
import { isFeatureEnabled } from './evaluate';
import { FLAGSHIP_FLAG_KEYS } from './keys';

interface CalendarFeatureProfile {
  user_type?: string | null;
  platform_role?: string | null;
}

export const CALENDAR_FEATURE_DISABLED_ERROR = 'Funkcja niedostępna';

export async function isCalendarFeatureEnabled(
  context?: EvaluationContext,
): Promise<boolean> {
  return isFeatureEnabled(FLAGSHIP_FLAG_KEYS.CALENDAR, context);
}

export async function isCalendarFeatureEnabledForUser(
  user: User,
  profile?: CalendarFeatureProfile | null,
): Promise<boolean> {
  return isCalendarFeatureEnabled(
    buildEvaluationContext({
      id: user.id,
      email: user.email,
      userType: profile?.user_type ?? undefined,
      platformRole: profile?.platform_role ?? undefined,
    }),
  );
}

export async function isCalendarFeatureEnabledForAuthUser(
  supabase: SupabaseClient<Database>,
  user: User,
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_type, platform_role')
    .eq('id', user.id)
    .maybeSingle();

  return isCalendarFeatureEnabledForUser(user, profile);
}
