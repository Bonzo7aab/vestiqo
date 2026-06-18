import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';

import { KONTO_DOKUMENTY_PATH } from '../../lib/konto-tabs';

/** Verification documents moved to /konto?tab=dokumenty for contractors. */
export default async function Verification() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/logowanie?redirectTo=${encodeURIComponent(KONTO_DOKUMENTY_PATH)}`);
  }

  redirect(KONTO_DOKUMENTY_PATH);
}
