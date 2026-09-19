import type { ReactNode } from 'react';
import { createClient } from '../../lib/supabase/server';
import { getEffectiveUserContext } from '../../lib/auth/effective-user';
import { redirectIfManagerAccessPending } from '../../lib/auth/redirect-if-manager-pending';

export async function ManagerPendingGateLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const effectiveContext = await getEffectiveUserContext();
    if (!effectiveContext?.isImpersonating) {
      await redirectIfManagerAccessPending(supabase, user.id);
    }
  }

  return children;
}
