import { Suspense } from 'react';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { createClient } from '../../../lib/supabase/server';
import { getEffectiveUserContext } from '../../../lib/auth/effective-user';
import { fetchUserPrimaryCompany } from '../../../lib/database/companies';
import { fetchManagerContests } from '../../../lib/database/manager-contests';
import { ManagerKonkursyContent } from '../../../components/manager-dashboard/ManagerKonkursyContent';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';

export default async function KonkursyPage(): Promise<ReactElement> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-muted-foreground">Wymagane logowanie.</p>
      </div>
    );
  }

  const effectiveContext = await getEffectiveUserContext();
  const effectiveUserId = effectiveContext?.effectiveUserId ?? user.id;

  const { data: company } = await fetchUserPrimaryCompany(supabase, effectiveUserId);

  if (!company) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6 text-center space-y-4 flex flex-col items-center">
            <p className="text-muted-foreground">Najpierw uzupełnij dane firmy w profilu.</p>
            <Button asChild>
              <Link href="/konto">Przejdź do konta</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const contests = await fetchManagerContests(supabase, company.id, effectiveUserId);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            Ładowanie konkursów…
          </div>
        }
      >
        <ManagerKonkursyContent contests={contests} />
      </Suspense>
    </div>
  );
}
