import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { fetchUserPrimaryCompany } from '../../lib/database/companies';
import { getUserVerificationStatus } from '../../lib/database/verification-queries';
import { buildEvaluationContext } from '../../lib/flagship/context';
import { isContractorServicesFeatureEnabled } from '../../lib/flagship/contractor-services-feature';
import { isOrdersFeatureEnabled } from '../../lib/flagship/orders-feature';
import { UserAccountHeader } from '../../components/UserAccountHeader';
import { ContractorDashboardNav } from '../../components/contractor-dashboard/ContractorDashboardNav';
import { kontoCompanyDataHref } from '../../lib/konto-tabs';

export default async function ContractorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/logowanie?redirectTo=/panel-wykonawcy');
  }

  const { data: company, error: companyError } = await fetchUserPrimaryCompany(supabase, user.id);
  
  if (companyError || !company) {
    redirect(kontoCompanyDataHref('contractor'));
  }

  const verificationStatus = await getUserVerificationStatus(user.id, supabase);

  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('user_type, platform_role')
    .eq('id', user.id)
    .maybeSingle();

  const evaluationContext = buildEvaluationContext({
    id: user.id,
    email: user.email,
    userType: userProfile?.user_type,
    platformRole: userProfile?.platform_role ?? undefined,
  });

  const [showOrders, showServices] = await Promise.all([
    isOrdersFeatureEnabled(evaluationContext),
    isContractorServicesFeatureEnabled(evaluationContext),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <UserAccountHeader verificationStatus={verificationStatus} />
      <ContractorDashboardNav showOrders={showOrders} showServices={showServices} />
      {children}
    </div>
  );
}
