'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../../lib/supabase/server';
import { fetchUserPrimaryCompany } from '../../../lib/database/companies';
import { getPostHogClient } from '../../../lib/posthog-server';
import { acceptOrderWork, cancelOrder } from '../../../lib/database/order-mutations';
import {
  isOrdersFeatureEnabledForAuthUser,
  ORDERS_FEATURE_DISABLED_ERROR,
} from '../../../lib/flagship/orders-feature';

const MANAGER_ORDERS_PATH = '/panel-zarzadcy/zamowienia';
const CONTRACTOR_ORDERS_PATH = '/panel-wykonawcy/zamowienia';

function revalidateOrderPaths(): void {
  revalidatePath(MANAGER_ORDERS_PATH);
  revalidatePath(CONTRACTOR_ORDERS_PATH);
}

export async function acceptOrderWorkAction(
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
    return { success: false, error: 'Brak firmy zarządcy' };
  }

  const result = await acceptOrderWork(supabase, orderId.trim(), company.id);

  if (result.success) {
    getPostHogClient().capture({
      distinctId: user.id,
      event: 'order_work_accepted',
      properties: { order_id: orderId.trim() },
    });
    revalidateOrderPaths();
  }

  return result;
}

export async function cancelOrderAction(
  orderId: string,
  cancelReason: string,
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
    return { success: false, error: 'Brak firmy zarządcy' };
  }

  const result = await cancelOrder(
    supabase,
    orderId.trim(),
    user.id,
    company.id,
    cancelReason,
  );

  if (result.success) {
    getPostHogClient().capture({
      distinctId: user.id,
      event: 'order_cancelled',
      properties: { order_id: orderId.trim() },
    });
    revalidateOrderPaths();
  }

  return result;
}
