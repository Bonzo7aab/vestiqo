import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { resolveEffectiveUserId } from '../../../lib/auth/effective-user';
import { fetchContractorOrders } from '../../../lib/database/contractor-orders';
import { isOrdersFeatureEnabledForAuthUser } from '../../../lib/flagship/orders-feature';
import { ContractorZamowieniaContent } from '../../../components/contractor-dashboard/ContractorZamowieniaContent';

export default async function ContractorZamowieniaPage(): Promise<ReactElement> {
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

  if (!(await isOrdersFeatureEnabledForAuthUser(supabase, user))) {
    redirect('/panel-wykonawcy/aplikacje');
  }

  const effectiveUserId = await resolveEffectiveUserId(user.id);
  const orders = await fetchContractorOrders(supabase, effectiveUserId);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ContractorZamowieniaContent orders={orders} />
    </div>
  );
}
