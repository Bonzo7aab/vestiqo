import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { resolveEffectiveUserId } from '../../../lib/auth/effective-user';
import { fetchUserPrimaryCompany } from '../../../lib/database/companies';
import { fetchContractorById } from '../../../lib/database/contractors';
import { isContractorServicesFeatureEnabledForAuthUser } from '../../../lib/flagship/contractor-services-feature';
import { Card, CardContent } from '../../../components/ui/card';
import { PricingContent } from './PricingContent';

async function getPricingData(userId: string) {
  const supabase = await createClient();
  
  // Fetch company
  const { data: company } = await fetchUserPrimaryCompany(supabase, userId);
  if (!company) {
    return null;
  }

  // Fetch contractor profile for services/pricing data
  const profile = await fetchContractorById(company.id);

  return {
    profile,
    companyId: company.id,
  };
}

// Loading fallback component
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

// Async data fetcher component
async function PricingDataFetcher() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const effectiveUserId = await resolveEffectiveUserId(user.id);
  const pricingData = await getPricingData(effectiveUserId);

  if (!pricingData) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">Nie znaleziono firmy. Proszę najpierw uzupełnić dane firmy w profilu.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <PricingContent 
      companyId={pricingData.companyId}
      initialProfile={pricingData.profile}
    />
  );
}

// Page component - renders immediately
export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && !(await isContractorServicesFeatureEnabledForAuthUser(supabase, user))) {
    redirect('/panel-wykonawcy/aplikacje');
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Suspense fallback={<LoadingFallback message="Ładowanie cennika..." />}>
        <PricingDataFetcher />
      </Suspense>
    </div>
  );
}

