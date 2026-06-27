'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../../lib/supabase/server';
import { fetchUserPrimaryCompany } from '../../../lib/database/companies';
import { getPostHogClient } from '../../../lib/posthog-server';
import { reportOrderForAcceptance } from '../../../lib/database/order-mutations';
import {
  isOrdersFeatureEnabledForAuthUser,
  ORDERS_FEATURE_DISABLED_ERROR,
} from '../../../lib/flagship/orders-feature';
import { instrumentServerAction } from '../../../lib/sentry/instrument-server-action';

const MANAGER_ORDERS_PATH = '/panel-zarzadcy/zamowienia';
const CONTRACTOR_ORDERS_PATH = '/panel-wykonawcy/zamowienia';

async function reportOrderForAcceptanceActionImpl(
  orderId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!orderId?.trim()) {
    return { success: false, error: 'Nieprawidłowe dane' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Wymagane logowanie' };
  }

  if (!(await isOrdersFeatureEnabledForAuthUser(supabase, user))) {
    return { success: false, error: ORDERS_FEATURE_DISABLED_ERROR };
  }

  const { data: company, error: companyError } = await fetchUserPrimaryCompany(
    supabase,
    user.id,
  );

  if (companyError || !company) {
    return { success: false, error: 'Brak firmy wykonawcy' };
  }

  const result = await reportOrderForAcceptance(supabase, orderId.trim(), company.id);

  if (result.success) {
    getPostHogClient().capture({
      distinctId: user.id,
      event: 'order_reported_for_acceptance',
      properties: { order_id: orderId.trim() },
    });
    revalidatePath(MANAGER_ORDERS_PATH);
    revalidatePath(CONTRACTOR_ORDERS_PATH);
  }

  return result;
}

export const reportOrderForAcceptanceAction = instrumentServerAction(
  'reportOrderForAcceptanceAction',
  reportOrderForAcceptanceActionImpl,
);
