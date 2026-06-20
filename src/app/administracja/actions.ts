'use server';

import { instrumentServerAction } from '../../lib/sentry/instrument-server-action';
import { revalidatePath } from 'next/cache';
import { createAdminClientOrNull } from '../../lib/supabase/admin';
import { createClient } from '../../lib/supabase/server';
import { requirePlatformAdmin } from '../../lib/admin/require-platform-admin';
import { deleteUserAccountData } from '../../lib/auth/delete-user-account-data';
import { createNotificationWithPush } from '../../lib/database/notifications-server';
import { sendVerificationRejectionEmail } from '../../lib/email/verification-rejection';
import { createPresignedGetUrl } from '../../lib/storage/r2/operations';
import { STORAGE_BUCKETS } from '../../lib/storage/buckets';
import { KONTO_DOKUMENTY_PATH } from '../../lib/konto-tabs';

async function logAdminAction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  actorId: string,
  actionType: string,
  entityTable: string | null,
  entityId: string | null,
  payload: Record<string, unknown> | null
): Promise<void> {
  await sb.from('admin_action_logs').insert({
    actor_id: actorId,
    action_type: actionType,
    entity_table: entityTable,
    entity_id: entityId,
    payload,
  });
}

async function approveVerificationSubjectActionImpl(subjectUserId: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId: actorId } = await requirePlatformAdmin('/administracja');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: companyRelation } = await sb
    .from('user_companies')
    .select('company_id')
    .eq('user_id', subjectUserId)
    .eq('is_primary', true)
    .maybeSingle();

  const companyId = companyRelation?.company_id as string | undefined;

  // Per-document reviews are intentionally preserved on overall decisions
  // so the user can see which files were approved or rejected (and why) on
  // their /weryfikacja page. New uploads invalidate stale reviews via the
  // uploadedAt > reviewedAt comparison.
  const { error: upErr } = await sb
    .from('user_profiles')
    .update({
      is_verified: true,
      verification_submitted_at: null,
    })
    .eq('id', subjectUserId);

  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  if (companyId) {
    const { error: coErr } = await supabase
      .from('companies')
      .update({
        is_verified: true,
        verification_level: 'verified',
      })
      .eq('id', companyId);

    if (coErr) {
      return { ok: false, error: coErr.message };
    }
  }

  await sb.from('verification_decisions').insert({
    subject_user_id: subjectUserId,
    company_id: companyId ?? null,
    decided_by: actorId,
    decision: 'approved',
    reason: null,
  });

  await logAdminAction(sb, actorId, 'verification_approve', 'user_profiles', subjectUserId, { company_id: companyId });

  await createNotificationWithPush({
    supabase,
    userId: subjectUserId,
    type: 'verification_approved',
    title: 'Konto zweryfikowane',
    message: 'Twoje konto zostało zweryfikowane przez administratora.',
    actionUrl: '/konto',
    sendPush: true,
  });

  revalidatePath('/administracja/weryfikacja');
  revalidatePath(`/administracja/weryfikacja/${subjectUserId}`);
  return { ok: true };
}

async function rejectVerificationSubjectActionImpl(
  subjectUserId: string,
  reason: string
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = reason.trim();
  if (!trimmed) {
    return { ok: false, error: 'Podaj powód odrzucenia.' };
  }

  const { supabase, userId: actorId } = await requirePlatformAdmin('/administracja');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: companyRelation } = await sb
    .from('user_companies')
    .select('company_id')
    .eq('user_id', subjectUserId)
    .eq('is_primary', true)
    .maybeSingle();

  const companyId = companyRelation?.company_id as string | undefined;

  // Same as approve: keep per-document reviews around so the user can see the
  // detailed feedback on /weryfikacja. They are auto-invalidated when the
  // user re-uploads (stale review mechanism).
  const { error: upErr } = await sb
    .from('user_profiles')
    .update({
      is_verified: false,
      verification_submitted_at: null,
    })
    .eq('id', subjectUserId);

  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  if (companyId) {
    const { error: coErr } = await supabase
      .from('companies')
      .update({
        is_verified: false,
        verification_level: 'none',
      })
      .eq('id', companyId);

    if (coErr) {
      return { ok: false, error: coErr.message };
    }
  }

  await sb.from('verification_decisions').insert({
    subject_user_id: subjectUserId,
    company_id: companyId ?? null,
    decided_by: actorId,
    decision: 'rejected',
    reason: trimmed,
  });

  await logAdminAction(sb, actorId, 'verification_reject', 'user_profiles', subjectUserId, {
    company_id: companyId,
  });

  await createNotificationWithPush({
    supabase,
    userId: subjectUserId,
    type: 'verification_rejected',
    title: 'Weryfikacja odrzucona',
    message: trimmed,
    actionUrl: KONTO_DOKUMENTY_PATH,
    sendPush: true,
  });

  const elevated = createAdminClientOrNull();
  if (elevated) {
    const { data: authUser } = await elevated.auth.admin.getUserById(subjectUserId);
    const email = authUser.user?.email;
    if (email) {
      await sendVerificationRejectionEmail({ toEmail: email, reason: trimmed });
    }
  } else {
    console.warn(
      '[admin/weryfikacja] Skipping rejection email: SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY not set',
    );
  }

  revalidatePath('/administracja/weryfikacja');
  revalidatePath(`/administracja/weryfikacja/${subjectUserId}`);
  return { ok: true };
}

async function addAdminNoteActionImpl(
  subjectUserId: string,
  body: string
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const trimmed = body.trim();
  if (!trimmed) {
    return { ok: false, error: 'Notatka nie może być pusta.' };
  }

  const { supabase, userId: actorId } = await requirePlatformAdmin('/administracja');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data, error } = await sb
    .from('admin_user_notes')
    .insert({
      subject_user_id: subjectUserId,
      author_id: actorId,
      body: trimmed,
    })
    .select('id')
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/administracja/weryfikacja/${subjectUserId}`);
  return { ok: true, id: (data as { id: string } | null)?.id };
}

async function getOcPreviewSignedUrlActionImpl(subjectUserId: string): Promise<{ url: string | null; error?: string }> {
  await requirePlatformAdmin('/administracja');
  const client = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = client as any;

  const { data: row, error } = await sb
    .from('contractor_account_settings')
    .select('oc_policy_scan_path')
    .eq('user_id', subjectUserId)
    .maybeSingle();

  if (error || !row?.oc_policy_scan_path) {
    return { url: null, error: error?.message ?? 'Brak skanu OC.' };
  }

  try {
    const signedUrl = await createPresignedGetUrl(
      STORAGE_BUCKETS.VERIFICATION_DOCUMENTS,
      row.oc_policy_scan_path,
      3600,
    );
    return { url: signedUrl };
  } catch (signErr) {
    return {
      url: null,
      error: signErr instanceof Error ? signErr.message : 'Nie udało się wygenerować podglądu.',
    };
  }
}

async function suspendJobApplicationActionImpl(
  applicationId: string,
  feedback: string
): Promise<{ ok: boolean; error?: string }> {
  const msg = feedback.trim();
  if (!msg) {
    return { ok: false, error: 'Podaj treść powiadomienia dla wykonawcy.' };
  }
  const { supabase, userId: actorId } = await requirePlatformAdmin('/administracja');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: appRow, error: fetchErr } = await sb
    .from('job_applications')
    .select('contractor_id')
    .eq('id', applicationId)
    .single();

  if (fetchErr || !appRow?.contractor_id) {
    return { ok: false, error: fetchErr?.message ?? 'Nie znaleziono oferty.' };
  }

  const { error } = await sb
    .from('job_applications')
    .update({
      admin_moderation_status: 'suspended',
      admin_feedback_message: msg,
      admin_moderated_at: new Date().toISOString(),
      admin_moderated_by: actorId,
    })
    .eq('id', applicationId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await createNotificationWithPush({
    supabase,
    userId: appRow.contractor_id as string,
    type: 'offer_admin_moderation',
    title: 'Oferta wymaga poprawy',
    message: msg,
    actionUrl: '/panel-wykonawcy/aplikacje',
    sendPush: true,
  });

  await logAdminAction(sb, actorId, 'suspend_job_application', 'job_applications', applicationId, {});
  revalidatePath('/administracja/oferty');
  return { ok: true };
}

async function unsuspendJobApplicationActionImpl(applicationId: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId: actorId } = await requirePlatformAdmin('/administracja');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { error } = await sb
    .from('job_applications')
    .update({
      admin_moderation_status: 'none',
      admin_feedback_message: null,
      admin_moderated_at: null,
      admin_moderated_by: null,
    })
    .eq('id', applicationId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await logAdminAction(sb, actorId, 'unsuspend_job_application', 'job_applications', applicationId, {});
  revalidatePath('/administracja/oferty');
  return { ok: true };
}

async function suspendTenderBidActionImpl(bidId: string, feedback: string): Promise<{ ok: boolean; error?: string }> {
  const msg = feedback.trim();
  if (!msg) {
    return { ok: false, error: 'Podaj treść powiadomienia dla wykonawcy.' };
  }
  const { supabase, userId: actorId } = await requirePlatformAdmin('/administracja');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: bidRow, error: fetchErr } = await sb
    .from('contest_offers')
    .select('contractor_id')
    .eq('id', bidId)
    .single();

  if (fetchErr || !bidRow?.contractor_id) {
    return { ok: false, error: fetchErr?.message ?? 'Nie znaleziono oferty.' };
  }

  const { error } = await sb
    .from('contest_offers')
    .update({
      admin_moderation_status: 'suspended',
      admin_feedback_message: msg,
      admin_moderated_at: new Date().toISOString(),
      admin_moderated_by: actorId,
    })
    .eq('id', bidId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await createNotificationWithPush({
    supabase,
    userId: bidRow.contractor_id as string,
    type: 'offer_admin_moderation',
    title: 'Oferta przetargowa wymaga poprawy',
    message: msg,
    actionUrl: '/panel-wykonawcy/aplikacje',
    sendPush: true,
  });

  await logAdminAction(sb, actorId, 'suspend_tender_bid', 'tender_bids', bidId, {});
  revalidatePath('/administracja/oferty');
  return { ok: true };
}

async function unsuspendTenderBidActionImpl(bidId: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId: actorId } = await requirePlatformAdmin('/administracja');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { error } = await sb
    .from('contest_offers')
    .update({
      admin_moderation_status: 'none',
      admin_feedback_message: null,
      admin_moderated_at: null,
      admin_moderated_by: null,
    })
    .eq('id', bidId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await logAdminAction(sb, actorId, 'unsuspend_tender_bid', 'tender_bids', bidId, {});
  revalidatePath('/administracja/oferty');
  return { ok: true };
}

const JOB_APPLICATION_EDITABLE_FIELDS = new Set<string>([
  'proposed_price',
  'currency',
  'proposed_timeline',
  'proposed_start_date',
  'cover_letter',
  'experience',
  'team_size',
  'available_from',
  'guarantee_period',
  'notes',
  'status',
  'certificates',
]);

const TENDER_BID_EDITABLE_FIELDS = new Set<string>([
  'bid_amount',
  'currency',
  'proposed_timeline',
  'proposed_start_date',
  'technical_proposal',
  'financial_proposal',
  'team_description',
  'experience_summary',
  'project_references',
  'certificates',
  'valid_until',
  'evaluation_score',
  'evaluation_notes',
  'status',
]);

const JOB_LISTING_EDITABLE_FIELDS = new Set<string>([
  'title',
  'description',
  'location',
  'address',
  'budget_min',
  'budget_max',
  'budget_type',
  'currency',
  'project_duration',
  'deadline',
  'urgency',
  'status',
  'type',
  'contact_person',
  'contact_phone',
  'contact_email',
  'building_type',
  'building_year',
  'surface_area',
  'additional_info',
  'requirements',
  'responsibilities',
  'skills_required',
]);

const TENDER_LISTING_EDITABLE_FIELDS = new Set<string>([
  'title',
  'description',
  'location',
  'address',
  'estimated_value',
  'currency',
  'submission_deadline',
  'evaluation_deadline',
  'project_duration',
  'status',
  'requirements',
  'wadium',
]);

function pickAllowed(input: Record<string, unknown>, allowed: Set<string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (allowed.has(key)) {
      out[key] = value;
    }
  }
  return out;
}

async function updateJobApplicationAdminActionImpl(
  applicationId: string,
  patch: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId: actorId } = await requirePlatformAdmin('/administracja');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const sanitized = pickAllowed(patch, JOB_APPLICATION_EDITABLE_FIELDS);
  if (Object.keys(sanitized).length === 0) {
    return { ok: false, error: 'Brak zmian.' };
  }

  const { error } = await sb.from('job_applications').update(sanitized).eq('id', applicationId);
  if (error) {
    return { ok: false, error: error.message };
  }

  await logAdminAction(sb, actorId, 'edit_job_application', 'job_applications', applicationId, sanitized);
  revalidatePath('/administracja/oferty');
  return { ok: true };
}

async function updateTenderBidAdminActionImpl(
  bidId: string,
  patch: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId: actorId } = await requirePlatformAdmin('/administracja');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const sanitized = pickAllowed(patch, TENDER_BID_EDITABLE_FIELDS);
  if (Object.keys(sanitized).length === 0) {
    return { ok: false, error: 'Brak zmian.' };
  }

  const { error } = await sb.from('contest_offers').update(sanitized).eq('id', bidId);
  if (error) {
    return { ok: false, error: error.message };
  }

  await logAdminAction(sb, actorId, 'edit_tender_bid', 'tender_bids', bidId, sanitized);
  revalidatePath('/administracja/oferty');
  return { ok: true };
}

async function updateJobListingAdminActionImpl(
  jobId: string,
  patch: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId: actorId } = await requirePlatformAdmin('/administracja');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const sanitized = pickAllowed(patch, JOB_LISTING_EDITABLE_FIELDS);
  if (Object.keys(sanitized).length === 0) {
    return { ok: false, error: 'Brak zmian.' };
  }

  const { error } = await sb.from('jobs').update(sanitized).eq('id', jobId);
  if (error) {
    return { ok: false, error: error.message };
  }

  await logAdminAction(sb, actorId, 'edit_job_listing', 'jobs', jobId, sanitized);
  revalidatePath('/administracja/ogloszenia');
  return { ok: true };
}

async function updateTenderListingAdminActionImpl(
  tenderId: string,
  patch: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId: actorId } = await requirePlatformAdmin('/administracja');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const sanitized = pickAllowed(patch, TENDER_LISTING_EDITABLE_FIELDS);
  if (Object.keys(sanitized).length === 0) {
    return { ok: false, error: 'Brak zmian.' };
  }

  const { error } = await sb.from('contests').update(sanitized).eq('id', tenderId);
  if (error) {
    return { ok: false, error: error.message };
  }

  await logAdminAction(sb, actorId, 'edit_tender_listing', 'tenders', tenderId, sanitized);
  revalidatePath('/administracja/ogloszenia');
  return { ok: true };
}

async function pauseJobListingActionImpl(jobId: string, feedback: string): Promise<{ ok: boolean; error?: string }> {
  const msg = feedback.trim();
  if (!msg) {
    return { ok: false, error: 'Podaj powód / instrukcję dla zarządcy.' };
  }
  const { supabase, userId: actorId } = await requirePlatformAdmin('/administracja');

  const { data: job, error: jErr } = await supabase.from('jobs').select('manager_id, title').eq('id', jobId).single();

  if (jErr || !job?.manager_id) {
    return { ok: false, error: jErr?.message ?? 'Nie znaleziono zgłoszenia.' };
  }

  const { error } = await supabase.from('jobs').update({ status: 'paused' }).eq('id', jobId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await createNotificationWithPush({
    supabase,
    userId: job.manager_id as string,
    type: 'listing_admin_paused',
    title: 'Zgłoszenie zawieszone przez administratora',
    message: `${job.title}: ${msg}`,
    actionUrl: `/panel-zarzadcy/zgloszenia`,
    sendPush: true,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await logAdminAction(supabase as any, actorId, 'pause_job', 'jobs', jobId, {});
  revalidatePath('/administracja/ogloszenia');
  return { ok: true };
}

async function resumeJobListingActionImpl(jobId: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId: actorId } = await requirePlatformAdmin('/administracja');

  const { error } = await supabase.from('jobs').update({ status: 'active' }).eq('id', jobId);

  if (error) {
    return { ok: false, error: error.message };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await logAdminAction(supabase as any, actorId, 'resume_job', 'jobs', jobId, {});
  revalidatePath('/administracja/ogloszenia');
  return { ok: true };
}

async function pauseTenderListingActionImpl(
  tenderId: string,
  feedback: string
): Promise<{ ok: boolean; error?: string }> {
  const msg = feedback.trim();
  if (!msg) {
    return { ok: false, error: 'Podaj powód / instrukcję dla zarządcy.' };
  }
  const { supabase, userId: actorId } = await requirePlatformAdmin('/administracja');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: tender, error: tErr } = await sb
    .from('contests')
    .select('manager_id, title')
    .eq('id', tenderId)
    .single();

  if (tErr || !tender?.manager_id) {
    return { ok: false, error: tErr?.message ?? 'Nie znaleziono przetargu.' };
  }

  const { error } = await sb.from('contests').update({ status: 'paused' }).eq('id', tenderId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await createNotificationWithPush({
    supabase,
    userId: tender.manager_id as string,
    type: 'listing_admin_paused',
    title: 'Przetarg zawieszony przez administratora',
    message: `${tender.title}: ${msg}`,
    actionUrl: `/panel-zarzadcy/konkursy`,
    sendPush: true,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await logAdminAction(supabase as any, actorId, 'pause_tender', 'tenders', tenderId, {});
  revalidatePath('/administracja/ogloszenia');
  return { ok: true };
}

async function resumeTenderListingActionImpl(tenderId: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId: actorId } = await requirePlatformAdmin('/administracja');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { error } = await sb.from('contests').update({ status: 'active' }).eq('id', tenderId);

  if (error) {
    return { ok: false, error: error.message };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await logAdminAction(supabase as any, actorId, 'resume_tender', 'tenders', tenderId, {});
  revalidatePath('/administracja/ogloszenia');
  return { ok: true };
}

// =============================================================================
// Per-document admin review annotations
// =============================================================================

const ALLOWED_DOC_KEYS = new Set<string>([
  'company_registration',
  'insurance',
  'certifications',
  'references',
  'management_license',
  'management_contracts',
]);

interface DocumentReviewEntry {
  status: 'approved' | 'rejected';
  reason: string | null;
  reviewedAt: string;
  reviewedBy: string;
}

/**
 * Annotate one of the user's verification documents as approved or rejected.
 * Stored in `user_profiles.verification_document_reviews` (JSONB map keyed by
 * document type). Cleared automatically when the overall verification decision
 * is recorded.
 */
async function reviewVerificationDocumentActionImpl(
  subjectUserId: string,
  documentKey: string,
  status: 'approved' | 'rejected',
  reason?: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (!ALLOWED_DOC_KEYS.has(documentKey)) {
    return { ok: false, error: 'Nieznany typ dokumentu.' };
  }
  const trimmedReason = (reason ?? '').trim();
  if (status === 'rejected' && !trimmedReason) {
    return { ok: false, error: 'Podaj powód odrzucenia dokumentu.' };
  }

  const { supabase, userId: actorId } = await requirePlatformAdmin(
    `/administracja/weryfikacja/${subjectUserId}`
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: existing, error: fetchErr } = await sb
    .from('user_profiles')
    .select('verification_document_reviews')
    .eq('id', subjectUserId)
    .maybeSingle();

  if (fetchErr) {
    return { ok: false, error: fetchErr.message };
  }

  const map = ((existing?.verification_document_reviews ?? {}) as Record<
    string,
    DocumentReviewEntry
  >);

  const next: Record<string, DocumentReviewEntry> = {
    ...map,
    [documentKey]: {
      status,
      reason: status === 'rejected' ? trimmedReason : null,
      reviewedAt: new Date().toISOString(),
      reviewedBy: actorId,
    },
  };

  const { error: upErr } = await sb
    .from('user_profiles')
    .update({ verification_document_reviews: next })
    .eq('id', subjectUserId);

  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  await logAdminAction(
    sb,
    actorId,
    `review_document_${status}`,
    'user_profiles',
    subjectUserId,
    { document_key: documentKey, reason: status === 'rejected' ? trimmedReason : null }
  );

  revalidatePath(`/administracja/weryfikacja/${subjectUserId}`);
  return { ok: true };
}

/**
 * Remove a per-document review (e.g. admin wants to re-evaluate from scratch).
 */
async function clearVerificationDocumentReviewActionImpl(
  subjectUserId: string,
  documentKey: string
): Promise<{ ok: boolean; error?: string }> {
  if (!ALLOWED_DOC_KEYS.has(documentKey)) {
    return { ok: false, error: 'Nieznany typ dokumentu.' };
  }

  const { supabase, userId: actorId } = await requirePlatformAdmin(
    `/administracja/weryfikacja/${subjectUserId}`
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: existing, error: fetchErr } = await sb
    .from('user_profiles')
    .select('verification_document_reviews')
    .eq('id', subjectUserId)
    .maybeSingle();

  if (fetchErr) {
    return { ok: false, error: fetchErr.message };
  }

  const map = ((existing?.verification_document_reviews ?? {}) as Record<
    string,
    DocumentReviewEntry
  >);

  if (!map[documentKey]) {
    return { ok: true };
  }

  const next = { ...map };
  delete next[documentKey];

  const { error: upErr } = await sb
    .from('user_profiles')
    .update({ verification_document_reviews: next })
    .eq('id', subjectUserId);

  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  await logAdminAction(
    sb,
    actorId,
    'review_document_clear',
    'user_profiles',
    subjectUserId,
    { document_key: documentKey }
  );

  revalidatePath(`/administracja/weryfikacja/${subjectUserId}`);
  return { ok: true };
}

async function updateRegistrationSettingsActionImpl(
  contractorOpen: boolean,
  managerOpen: boolean
): Promise<{ ok: boolean; error?: string }> {
  const { userId: actorId } = await requirePlatformAdmin('/administracja/ustawienia');
  const { updateRegistrationSettings } = await import('../../lib/database/platform-settings');
  const result = await updateRegistrationSettings(contractorOpen, managerOpen, actorId);

  if (result.ok) {
    revalidatePath('/administracja/ustawienia');
    revalidatePath('/rejestracja');
  }

  return result;
}

async function adminDeleteUserAccountActionImpl(
  subjectUserId: string,
): Promise<{ ok: boolean; error?: string }> {
  const trimmedId = subjectUserId.trim();
  if (!trimmedId) {
    return { ok: false, error: 'Brak identyfikatora użytkownika.' };
  }

  const { userId: actorId } = await requirePlatformAdmin('/administracja/weryfikacja');

  if (trimmedId === actorId) {
    return { ok: false, error: 'Nie możesz usunąć własnego konta z panelu administracyjnego.' };
  }

  const elevated = createAdminClientOrNull();
  if (!elevated) {
    return {
      ok: false,
      error:
        'Usuwanie kont nie jest skonfigurowane. Dodaj SUPABASE_SECRET_KEY lub SUPABASE_SERVICE_ROLE_KEY.',
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = elevated as any;
  const { data: profile, error: profileErr } = await sb
    .from('user_profiles')
    .select('id, platform_role')
    .eq('id', trimmedId)
    .maybeSingle();

  if (profileErr) {
    return { ok: false, error: profileErr.message };
  }

  if (!profile) {
    return { ok: false, error: 'Nie znaleziono profilu użytkownika.' };
  }

  if (profile.platform_role === 'platform_admin') {
    return { ok: false, error: 'Nie można usunąć konta administratora platformy.' };
  }

  const dataCleanup = await deleteUserAccountData(elevated, trimmedId);
  if (dataCleanup.ok === false) {
    return { ok: false, error: dataCleanup.error };
  }

  const { error: deleteError } = await elevated.auth.admin.deleteUser(trimmedId);
  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  await sb.from('user_profiles').delete().eq('id', trimmedId);

  await logAdminAction(sb, actorId, 'delete_user_account', 'user_profiles', trimmedId, null);

  revalidatePath('/administracja/weryfikacja');
  revalidatePath(`/administracja/weryfikacja/${trimmedId}`);
  revalidatePath('/', 'layout');

  return { ok: true };
}

type SystemAnnouncementKind = 'legal' | 'maintenance';

async function broadcastSystemAnnouncementActionImpl(params: {
  kind: SystemAnnouncementKind;
  effectiveDate: string;
  fromTime?: string;
  toTime?: string;
}): Promise<{ ok: boolean; error?: string; sentCount?: number }> {
  const { kind, effectiveDate, fromTime, toTime } = params;

  if (!effectiveDate.trim()) {
    return { ok: false, error: 'Podaj datę.' };
  }

  if (kind === 'maintenance' && (!fromTime?.trim() || !toTime?.trim())) {
    return { ok: false, error: 'Podaj godziny rozpoczęcia i zakończenia przerwy.' };
  }

  const { supabase, userId: actorId } = await requirePlatformAdmin('/administracja/ustawienia');
  const admin = createAdminClientOrNull();
  if (!admin) {
    return { ok: false, error: 'Brak uprawnień serwisowych do wysyłki powiadomień.' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: users, error: usersError } = await (admin as any)
    .from('user_profiles')
    .select('id');

  if (usersError) {
    return { ok: false, error: usersError.message };
  }

  const {
    buildLegalAnnouncementMessage,
    buildMaintenanceAnnouncementMessage,
    createOpd41Notification,
  } = await import('../../lib/notifications/opd41-server');

  const title =
    kind === 'legal' ? 'Aktualizacja regulaminu' : 'Przerwa techniczna';
  const message =
    kind === 'legal'
      ? buildLegalAnnouncementMessage(effectiveDate.trim())
      : buildMaintenanceAnnouncementMessage(
          effectiveDate.trim(),
          fromTime?.trim() ?? '',
          toTime?.trim() ?? '',
        );
  const actionUrl = kind === 'legal' ? '/regulamin' : null;

  let sentCount = 0;
  for (const row of (users ?? []) as Array<{ id: string }>) {
    const result = await createOpd41Notification({
      supabase: admin,
      userId: row.id,
      kind: 'system_announcement',
      type: 'system_announcement',
      title,
      message,
      data: {
        kind,
        effectiveDate: effectiveDate.trim(),
        fromTime: fromTime?.trim(),
        toTime: toTime?.trim(),
      },
      actionUrl,
      priority: 'high',
    });
    if (result.notificationId) {
      sentCount += 1;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await logAdminAction(supabase as any, actorId, 'broadcast_system_announcement', null, null, {
    kind,
    effectiveDate: effectiveDate.trim(),
    fromTime: fromTime?.trim() ?? null,
    toTime: toTime?.trim() ?? null,
    sentCount,
  });

  return { ok: true, sentCount };
}

export const approveVerificationSubjectAction = instrumentServerAction(
  'approveVerificationSubjectAction',
  approveVerificationSubjectActionImpl
);
export const rejectVerificationSubjectAction = instrumentServerAction(
  'rejectVerificationSubjectAction',
  rejectVerificationSubjectActionImpl
);
export const addAdminNoteAction = instrumentServerAction('addAdminNoteAction', addAdminNoteActionImpl);
export const getOcPreviewSignedUrlAction = instrumentServerAction(
  'getOcPreviewSignedUrlAction',
  getOcPreviewSignedUrlActionImpl
);
export const suspendJobApplicationAction = instrumentServerAction(
  'suspendJobApplicationAction',
  suspendJobApplicationActionImpl
);
export const unsuspendJobApplicationAction = instrumentServerAction(
  'unsuspendJobApplicationAction',
  unsuspendJobApplicationActionImpl
);
export const suspendTenderBidAction = instrumentServerAction(
  'suspendTenderBidAction',
  suspendTenderBidActionImpl
);
export const unsuspendTenderBidAction = instrumentServerAction(
  'unsuspendTenderBidAction',
  unsuspendTenderBidActionImpl
);
export const updateJobApplicationAdminAction = instrumentServerAction(
  'updateJobApplicationAdminAction',
  updateJobApplicationAdminActionImpl
);
export const updateTenderBidAdminAction = instrumentServerAction(
  'updateTenderBidAdminAction',
  updateTenderBidAdminActionImpl
);
export const updateJobListingAdminAction = instrumentServerAction(
  'updateJobListingAdminAction',
  updateJobListingAdminActionImpl
);
export const updateTenderListingAdminAction = instrumentServerAction(
  'updateTenderListingAdminAction',
  updateTenderListingAdminActionImpl
);
export const pauseJobListingAction = instrumentServerAction('pauseJobListingAction', pauseJobListingActionImpl);
export const resumeJobListingAction = instrumentServerAction('resumeJobListingAction', resumeJobListingActionImpl);
export const pauseTenderListingAction = instrumentServerAction(
  'pauseTenderListingAction',
  pauseTenderListingActionImpl
);
export const resumeTenderListingAction = instrumentServerAction(
  'resumeTenderListingAction',
  resumeTenderListingActionImpl
);
export const reviewVerificationDocumentAction = instrumentServerAction(
  'reviewVerificationDocumentAction',
  reviewVerificationDocumentActionImpl
);
export const clearVerificationDocumentReviewAction = instrumentServerAction(
  'clearVerificationDocumentReviewAction',
  clearVerificationDocumentReviewActionImpl
);
export const updateRegistrationSettingsAction = instrumentServerAction(
  'updateRegistrationSettingsAction',
  updateRegistrationSettingsActionImpl
);
export const adminDeleteUserAccountAction = instrumentServerAction(
  'adminDeleteUserAccountAction',
  adminDeleteUserAccountActionImpl,
);
export const broadcastSystemAnnouncementAction = instrumentServerAction(
  'broadcastSystemAnnouncementAction',
  broadcastSystemAnnouncementActionImpl,
);
