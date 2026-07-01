import { Suspense } from 'react';
import { createClient } from '../../../lib/supabase/server';
import { resolveEffectiveUserId } from '../../../lib/auth/effective-user';
import { fetchUserPrimaryCompany } from '../../../lib/database/companies';
import { fetchContractorContestOffers } from '../../../lib/database/contractor-contest-offers';
import { Card, CardContent } from '../../../components/ui/card';
import { ContractorContestOffersContent } from '../../../components/contractor-dashboard/ContractorContestOffersContent';

async function getContestOffersData(userId: string) {
  const supabase = await createClient();

  const { data: company } = await fetchUserPrimaryCompany(supabase, userId);
  if (!company) {
    return null;
  }

  const contestOffers = await fetchContractorContestOffers(supabase, userId);

  return {
    contestOffers,
    companyId: company.id,
  };
}

function LoadingFallback({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="ml-2 text-sm text-muted-foreground">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

async function ApplicationsDataFetcher() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const effectiveUserId = await resolveEffectiveUserId(user.id);
  const data = await getContestOffersData(effectiveUserId);

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">
            Nie znaleziono firmy. Proszę najpierw uzupełnić dane firmy w profilu.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ContractorContestOffersContent
      offers={data.contestOffers}
      companyId={data.companyId}
    />
  );
}

export default function ApplicationsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Suspense fallback={<LoadingFallback message="Ładowanie ofert..." />}>
        <ApplicationsDataFetcher />
      </Suspense>
    </div>
  );
}
