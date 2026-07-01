import 'server-only';

import { cookies } from 'next/headers';
import { createClient } from '../supabase/server';
import {
  readImpersonationFromCookieGetter,
  type ImpersonationSubjectUserType,
} from '../admin/impersonation';

export interface EffectiveUserContext {
  actorId: string;
  effectiveUserId: string;
  isImpersonating: boolean;
  subjectUserType: ImpersonationSubjectUserType;
  subjectDisplayName: string;
}

export interface ImpersonationClientState {
  isImpersonating: boolean;
  subjectUserId: string | null;
  subjectDisplayName: string | null;
  subjectUserType: ImpersonationSubjectUserType | null;
}

export function toImpersonationClientState(
  ctx: EffectiveUserContext | null,
): ImpersonationClientState {
  if (!ctx?.isImpersonating) {
    return {
      isImpersonating: false,
      subjectUserId: null,
      subjectDisplayName: null,
      subjectUserType: null,
    };
  }

  return {
    isImpersonating: true,
    subjectUserId: ctx.effectiveUserId,
    subjectDisplayName: ctx.subjectDisplayName,
    subjectUserType: ctx.subjectUserType,
  };
}

export async function getEffectiveUserContext(): Promise<EffectiveUserContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const cookieStore = await cookies();
  const impersonation = readImpersonationFromCookieGetter(
    (name) => cookieStore.get(name)?.value,
    user.id,
  );

  if (impersonation) {
    const { data: subjectProfile } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, user_type')
      .eq('id', impersonation.subjectUserId)
      .maybeSingle();

    const firstName = subjectProfile?.first_name?.trim() ?? '';
    const lastName = subjectProfile?.last_name?.trim() ?? '';
    const displayName = `${firstName} ${lastName}`.trim() || 'Użytkownik';

    return {
      actorId: user.id,
      effectiveUserId: impersonation.subjectUserId,
      isImpersonating: true,
      subjectUserType: impersonation.subjectUserType,
      subjectDisplayName: displayName,
    };
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_type')
    .eq('id', user.id)
    .maybeSingle();

  const userType =
    profile?.user_type === 'manager' || profile?.user_type === 'contractor'
      ? profile.user_type
      : 'contractor';

  return {
    actorId: user.id,
    effectiveUserId: user.id,
    isImpersonating: false,
    subjectUserType: userType,
    subjectDisplayName: '',
  };
}

export async function requireAuthenticatedEffectiveUserId(): Promise<string> {
  const ctx = await getEffectiveUserContext();
  if (!ctx) {
    throw new Error('Wymagane logowanie');
  }
  return ctx.effectiveUserId;
}

export async function resolveEffectiveUserId(authUserId: string): Promise<string> {
  const ctx = await getEffectiveUserContext();
  return ctx?.effectiveUserId ?? authUserId;
}
