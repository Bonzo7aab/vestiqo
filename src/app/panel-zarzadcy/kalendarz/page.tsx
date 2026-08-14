import { Suspense } from 'react';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { createClient } from '../../../lib/supabase/server';
import { getEffectiveUserContext } from '../../../lib/auth/effective-user';
import { fetchUserPrimaryCompany } from '../../../lib/database/companies';
import { fetchManagerCalendarEvents } from '../../../lib/database/manager-calendar';
import { ManagerKalendarzContent } from '../../../components/manager-dashboard/ManagerKalendarzContent';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';

export default async function KalendarzPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}): Promise<ReactElement> {
  const { day } = await searchParams;
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

  const events = await fetchManagerCalendarEvents(supabase, company.id);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            Ładowanie kalendarza…
          </div>
        }
      >
        <ManagerKalendarzContent
          key={day ?? 'today'}
          events={events}
          initialDay={day}
        />
      </Suspense>
    </div>
  );
}
