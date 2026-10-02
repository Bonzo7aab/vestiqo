import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { createNotificationsForUsers } from './notifications-server';

/**
 * Platform admin user ids (for in-app notifications about verification queue).
 */
export async function fetchPlatformAdminUserIds(
  supabase: SupabaseClient<Database>,
): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('user_profiles')
    .select('id')
    .eq('platform_role', 'platform_admin');

  if (error) {
    console.error('[fetchPlatformAdminUserIds]', error.message);
    return [];
  }

  return ((data ?? []) as Array<{ id: string }>).map((row) => row.id).filter(Boolean);
}

/**
 * Count users awaiting admin verification decision (submitted, not yet verified).
 */
export async function countPendingVerificationSubmissions(
  supabase: SupabaseClient<Database>,
): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error } = await (supabase as any)
    .from('user_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_verified', false)
    .not('verification_submitted_at', 'is', null)
    .neq('platform_role', 'platform_admin');

  if (error) {
    console.error('[countPendingVerificationSubmissions]', error.message);
    return 0;
  }

  return typeof count === 'number' ? count : 0;
}

/**
 * Notify all platform admins that a user entered the verification queue.
 */
export async function notifyAdminsOfVerificationSubmission(input: {
  supabase: SupabaseClient<Database>;
  subjectUserId: string;
  subjectName: string;
  userTypeLabel: string;
}): Promise<void> {
  const adminIds = await fetchPlatformAdminUserIds(input.supabase);
  const recipients = adminIds.filter((id) => id !== input.subjectUserId);
  if (recipients.length === 0) {
    return;
  }

  await createNotificationsForUsers(recipients, {
    supabase: input.supabase,
    type: 'system_announcement',
    title: 'Nowa weryfikacja do decyzji',
    message: `${input.subjectName} (${input.userTypeLabel}) oczekuje na weryfikację konta.`,
    actionUrl: `/administracja/weryfikacja/${input.subjectUserId}`,
    data: {
      kind: 'verification_pending',
      subjectUserId: input.subjectUserId,
    },
    priority: 'high',
    sendPush: true,
  });
}
