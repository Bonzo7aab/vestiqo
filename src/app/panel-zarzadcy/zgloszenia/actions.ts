'use server';

import { createClient } from '../../../lib/supabase/server';
import { fetchUserPrimaryCompany } from '../../../lib/database/companies';
import { getPostHogClient } from '../../../lib/posthog-server';
import {
  updateManagerJobWorkflowStatus,
  updateManagerTenderWorkflowStatus,
} from '../../../lib/database/jobs';
import {
  acceptManagerJobOffer,
  acceptManagerTenderOffer,
} from '../../../lib/database/offer-selection';
import { notifyContestOfferResolution } from '../../../lib/notifications/contest-resolution';
import { JOB_WORKFLOW_STATUSES } from '../../../lib/job-workflow-status';
import { TENDER_WORKFLOW_STATUSES } from '../../../lib/tender-workflow-status';
import { revalidatePath } from 'next/cache';

const ALLOWED = new Set<string>([...JOB_WORKFLOW_STATUSES, 'draft']);

export async function updateJobWorkflowStatusAction(
  jobId: string,
  status: string,
): Promise<{ success: boolean; error?: string }> {
  if (!jobId?.trim() || !ALLOWED.has(status)) {
    return { success: false, error: 'Nieprawidłowe dane' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Wymagane logowanie' };
  }

  const { data: company, error: companyError } = await fetchUserPrimaryCompany(
    supabase,
    user.id,
  );

  if (companyError || !company) {
    return { success: false, error: 'Brak firmy zarządcy' };
  }

  const { error } = await updateManagerJobWorkflowStatus(supabase, {
    jobId: jobId.trim(),
    managerId: user.id,
    companyId: company.id,
    status,
  });

  if (error) {
    const message =
      error instanceof Error
        ? error.message
        : (error as { message?: string }).message || 'Nie udało się zapisać statusu';
    return { success: false, error: message };
  }

  revalidatePath('/panel-zarzadcy/zgloszenia');
  revalidatePath('/panel-zarzadcy/konkursy');
  revalidatePath(`/konkurs/${jobId.trim()}`);

  return { success: true };
}

const TENDER_ALLOWED = new Set<string>([
  ...TENDER_WORKFLOW_STATUSES,
  'draft',
  'paused',
  'cancelled',
]);

export async function updateTenderWorkflowStatusAction(
  tenderId: string,
  status: string,
): Promise<{ success: boolean; error?: string }> {
  if (!tenderId?.trim() || !TENDER_ALLOWED.has(status)) {
    return { success: false, error: 'Nieprawidłowe dane' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Wymagane logowanie' };
  }

  const { data: company, error: companyError } = await fetchUserPrimaryCompany(
    supabase,
    user.id,
  );

  if (companyError || !company) {
    return { success: false, error: 'Brak firmy zarządcy' };
  }

  const { error } = await updateManagerTenderWorkflowStatus(supabase, {
    tenderId: tenderId.trim(),
    managerId: user.id,
    companyId: company.id,
    status,
  });

  if (error) {
    const message =
      error instanceof Error
        ? error.message
        : (error as { message?: string }).message || 'Nie udało się zapisać statusu';
    return { success: false, error: message };
  }

  revalidatePath('/panel-zarzadcy/zgloszenia');
  revalidatePath('/panel-zarzadcy/konkursy');

  return { success: true };
}

export async function acceptJobOfferAction(
  jobId: string,
  applicationId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!jobId?.trim() || !applicationId?.trim()) {
    return { success: false, error: 'Nieprawidłowe dane' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Wymagane logowanie' };
  }

  const { data: company, error: companyError } = await fetchUserPrimaryCompany(
    supabase,
    user.id,
  );

  if (companyError || !company) {
    return { success: false, error: 'Brak firmy zarządcy' };
  }

  const result = await acceptManagerJobOffer(supabase, {
    jobId: jobId.trim(),
    applicationId: applicationId.trim(),
    managerId: user.id,
    companyId: company.id,
  });

  if (result.success) {
    getPostHogClient().capture({
      distinctId: user.id,
      event: 'job_offer_accepted',
      properties: { job_id: jobId.trim(), application_id: applicationId.trim() },
    });
    revalidatePath('/panel-zarzadcy/zgloszenia');
    revalidatePath(`/panel-zarzadcy/zgloszenia/porownaj/${jobId.trim()}`);
    revalidatePath(`/panel-zarzadcy/konkursy/${jobId.trim()}/aplikacje`);
  }

  return result;
}

export async function acceptTenderOfferAction(
  tenderId: string,
  bidId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!tenderId?.trim() || !bidId?.trim()) {
    return { success: false, error: 'Nieprawidłowe dane' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Wymagane logowanie' };
  }

  const { data: company, error: companyError } = await fetchUserPrimaryCompany(
    supabase,
    user.id,
  );

  if (companyError || !company) {
    return { success: false, error: 'Brak firmy zarządcy' };
  }

  const result = await acceptManagerTenderOffer(supabase, {
    tenderId: tenderId.trim(),
    bidId: bidId.trim(),
    managerId: user.id,
    companyId: company.id,
  });

  if (result.success) {
    try {
      await notifyContestOfferResolution(tenderId.trim(), bidId.trim());
    } catch (notifyError) {
      console.error('notifyContestOfferResolution:', notifyError);
    }
    getPostHogClient().capture({
      distinctId: user.id,
      event: 'contest_offer_accepted',
      properties: { tender_id: tenderId.trim(), bid_id: bidId.trim() },
    });
    revalidatePath('/panel-zarzadcy/zgloszenia');
    revalidatePath('/panel-zarzadcy/konkursy');
    revalidatePath('/panel-zarzadcy/zamowienia');
    revalidatePath('/panel-wykonawcy/zamowienia');
    revalidatePath(`/panel-zarzadcy/zgloszenia/porownaj/${tenderId.trim()}`);
    revalidatePath(`/panel-zarzadcy/konkursy/porownaj/${tenderId.trim()}`);
  }

  return result;
}
