import { redirect } from 'next/navigation';
import { RecoveryPasswordForm } from '../../../components/RecoveryPasswordForm';
import { createClient } from '../../../lib/supabase/server';

export default async function UpdatePasswordPage(): Promise<React.ReactElement> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/logowanie?redirectTo=${encodeURIComponent('/auth/aktualizacja-hasla')}&message=${encodeURIComponent('Zaloguj się linkiem z emaila resetującego hasło.')}`,
    );
  }

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <RecoveryPasswordForm />
    </main>
  );
}
