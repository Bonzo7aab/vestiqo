'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requirePlatformAdmin } from '../../../lib/admin/require-platform-admin';
import {
  getImpersonationCookieOptions,
  IMPERSONATION_COOKIE_NAME,
  signImpersonationPayload,
  type ImpersonationPayload,
  type ImpersonationSubjectUserType,
} from '../../../lib/admin/impersonation';
import { clearImpersonationCookie } from '../../../lib/auth/guard-impersonation';
import { routes } from '../../../lib/routes';

async function logImpersonationAction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  actorId: string,
  actionType: 'impersonation_start' | 'impersonation_end',
  subjectUserId: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  await sb.from('admin_action_logs').insert({
    actor_id: actorId,
    action_type: actionType,
    entity_table: 'user_profiles',
    entity_id: subjectUserId,
    payload: { subject_user_id: subjectUserId, ...extra },
  });
}

export type ImpersonationView = 'konto' | 'konkursy';

export async function startImpersonationAction(
  subjectUserId: string,
  view: ImpersonationView = 'konto',
): Promise<{ error?: string }> {
  const trimmedId = subjectUserId?.trim();
  if (!trimmedId) {
    return { error: 'Nieprawidłowy identyfikator użytkownika' };
  }

  const { supabase, userId: actorId } = await requirePlatformAdmin(
    `/administracja/weryfikacja/${trimmedId}`,
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: subjectProfile, error: profileError } = await sb
    .from('user_profiles')
    .select('id, user_type, platform_role, first_name, last_name')
    .eq('id', trimmedId)
    .maybeSingle();

  if (profileError || !subjectProfile) {
    return { error: 'Nie znaleziono użytkownika' };
  }

  if (subjectProfile.platform_role === 'platform_admin') {
    return { error: 'Nie można podglądać konta administratora platformy' };
  }

  if (subjectProfile.user_type !== 'manager' && subjectProfile.user_type !== 'contractor') {
    return { error: 'Nieobsługiwany typ konta użytkownika' };
  }

  const subjectUserType = subjectProfile.user_type as ImpersonationSubjectUserType;

  if (view === 'konkursy' && subjectUserType !== 'manager') {
    return { error: 'Konkursy są dostępne tylko dla zarządców' };
  }

  const payload: ImpersonationPayload = {
    v: 1,
    actorId,
    subjectUserId: trimmedId,
    subjectUserType,
    startedAt: Date.now(),
  };

  const cookieStore = await cookies();
  cookieStore.set(
    IMPERSONATION_COOKIE_NAME,
    signImpersonationPayload(payload),
    getImpersonationCookieOptions(),
  );

  await logImpersonationAction(sb, actorId, 'impersonation_start', trimmedId, { view });

  if (view === 'konkursy') {
    redirect(routes.panelZarzadcyKonkursy);
  }

  if (subjectUserType === 'contractor') {
    redirect(routes.panelWykonawcyAplikacje);
  }

  redirect(routes.konto);
}

export async function endImpersonationAction(
  subjectUserId?: string,
): Promise<void> {
  const { supabase, userId: actorId } = await requirePlatformAdmin('/administracja');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const cookieStore = await cookies();
  const existing = cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value;
  let loggedSubjectId = subjectUserId?.trim() ?? null;

  if (!loggedSubjectId && existing) {
    try {
      const payloadPart = existing.split('.')[0];
      const parsed = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as {
        subjectUserId?: string;
      };
      loggedSubjectId = parsed.subjectUserId ?? null;
    } catch {
      // ignore parse errors
    }
  }

  await clearImpersonationCookie();

  if (loggedSubjectId) {
    await logImpersonationAction(sb, actorId, 'impersonation_end', loggedSubjectId);
    redirect(routes.administracjaWeryfikacjaUzytkownik(loggedSubjectId));
  }

  redirect(routes.administracjaWeryfikacja);
}
