import { notFound } from 'next/navigation';
import { requirePlatformAdmin } from '../../../../lib/admin/require-platform-admin';
import { getUserVerificationStatus } from '../../../../lib/database/verification-queries';
import { createAdminClientOrNull } from '../../../../lib/supabase/admin';
import {
  countSubmittedDocuments,
  expectedDocumentCount,
  fetchAdminNotesForUser,
  fetchLatestDecisionAtForUser,
  fetchVerificationDocumentReviews,
  filterPathsToRequiredDocuments,
  getVerificationDocumentSignedUrls,
  mergeRequiredVerificationDocuments,
  resolveUpdatedAt,
  type AdminVerificationSubjectProfile,
} from '../../../../lib/database/admin-verification';
import { VAT_STATUS_OPTIONS } from '../../../../lib/contractor/constants';
import { normalizeIbanInput } from '../../../../lib/contractor/iban';
import { isAuthUserEmailConfirmed } from '../../../../lib/auth/email-confirmation';
import {
  resolveAdminUserStatus,
  resolveQueueVerificationState,
} from '../../../../lib/admin/resolve-admin-user-status';
import { VerificationSubjectPanel } from '../../../../components/admin/VerificationSubjectPanel';
import { AdminNotesCollapsibleSection } from '../../../../components/admin/AdminNotesCollapsibleSection';

interface PageProps {
  params: Promise<{ userId: string }>;
}

function isMissingProfileError(error: { code?: string; message?: string } | null): boolean {
  if (!error) {
    return false;
  }

  return (
    error.code === 'PGRST116' ||
    error.message?.includes('0 rows') === true ||
    error.message?.includes('single JSON object') === true
  );
}

export default async function AdminVerificationSubjectPage({ params }: PageProps) {
  const { userId } = await params;
  const { supabase } = await requirePlatformAdmin(`/administracja/weryfikacja/${userId}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: profile, error } = await sb
    .from('user_profiles')
    .select(
      `
      id,
      first_name,
      last_name,
      user_type,
      phone,
      verification_submitted_at,
      verification_document_paths,
      is_verified,
      created_at,
      updated_at,
      user_companies (
        is_primary,
        companies (
          id,
          name,
          type,
          nip,
          regon,
          krs,
          address,
          city,
          postal_code,
          email,
          phone,
          website
        )
      )
    `
    )
    .eq('id', userId)
    .single();

  if (error || !profile) {
    if (error && !isMissingProfileError(error)) {
      console.error('[admin/weryfikacja] user_profiles read failed', {
        userId,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
    }
    notFound();
  }

  const notes = await fetchAdminNotesForUser(supabase, userId);

  const ucsEarly = (profile.user_companies ?? []) as Array<{
    is_primary?: boolean;
    companies?: { email?: string };
  }>;
  const primaryEarly = ucsEarly.find((uc) => uc.is_primary) ?? ucsEarly[0];
  let email: string | null = primaryEarly?.companies?.email ?? null;

  const elevatedClient = createAdminClientOrNull();
  let emailConfirmed = true;
  if (elevatedClient) {
    try {
      const { data: authUser, error: authError } = await elevatedClient.auth.admin.getUserById(userId);
      if (authError) {
        console.error('[admin/weryfikacja] auth.admin.getUserById failed', {
          userId,
          message: authError.message,
        });
      } else {
        email = authUser.user?.email ?? email;
        emailConfirmed = isAuthUserEmailConfirmed(authUser.user);
      }
    } catch (authErr) {
      console.error('[admin/weryfikacja] auth.admin.getUserById threw', authErr);
    }
  }

  let ocValidUntil: string | null = null;
  let ocPolicyScanPath: string | null = null;
  let subjectProfile: AdminVerificationSubjectProfile = {
    companyRegon: null,
    companyKrs: null,
    companyAddress: null,
    companyPostalCode: null,
    companyPhone: null,
    companyEmail: null,
    companyWebsite: null,
    bankAccountIban: null,
    vatStatusLabel: null,
    ocGuaranteeAmountPln: null,
  };

  const { data: cas, error: casError } = await sb
    .from('contractor_account_settings')
    .select(
      'oc_valid_until, oc_policy_scan_path, bank_account_iban, vat_status, oc_guarantee_amount'
    )
    .eq('user_id', userId)
    .maybeSingle();
  if (casError) {
    console.error('[admin/weryfikacja] contractor_account_settings read failed', {
      userId,
      code: casError.code,
      message: casError.message,
    });
  }
  if (profile.user_type === 'contractor') {
    ocValidUntil = (cas?.oc_valid_until as string) ?? null;
    ocPolicyScanPath = (cas?.oc_policy_scan_path as string) ?? null;
  }

  const rawIban = typeof cas?.bank_account_iban === 'string' ? cas.bank_account_iban : null;
  const ibanDigits = rawIban ? normalizeIbanInput(rawIban) : '';
  subjectProfile.bankAccountIban = ibanDigits.length === 26 ? ibanDigits : rawIban;

  const vatStatus = cas?.vat_status as string | null | undefined;
  subjectProfile.vatStatusLabel =
    VAT_STATUS_OPTIONS.find((o) => o.value === vatStatus)?.label ?? null;

  if (profile.user_type === 'contractor') {
    const guarantee = cas?.oc_guarantee_amount;
    if (typeof guarantee === 'number' && Number.isFinite(guarantee)) {
      subjectProfile.ocGuaranteeAmountPln = guarantee;
    } else if (typeof guarantee === 'string' && guarantee.trim()) {
      const parsed = Number(guarantee);
      subjectProfile.ocGuaranteeAmountPln = Number.isFinite(parsed) ? parsed : null;
    }
  }

  const docPaths: Record<string, string> = {
    ...((profile.verification_document_paths as Record<string, string> | null | undefined) ?? {}),
  };
  if (profile.user_type === 'contractor' && !docPaths.insurance && ocPolicyScanPath) {
    docPaths.insurance = ocPolicyScanPath;
  }

  const userType = (profile.user_type as string) ?? '';
  const requiredDocPaths = filterPathsToRequiredDocuments(userType, docPaths);
  const paths = profile.verification_document_paths as Record<string, string> | null | undefined;
  const documentsSubmitted = countSubmittedDocuments(userType, docPaths);
  const documentsExpected = expectedDocumentCount(userType);

  const ucs = (profile.user_companies ?? []) as Array<{
    is_primary?: boolean;
    companies?: {
      name?: string;
      nip?: string;
      regon?: string;
      krs?: string;
      address?: string;
      city?: string;
      postal_code?: string;
      email?: string;
      phone?: string;
      website?: string;
    };
  }>;
  const primary = ucs.find((uc) => uc.is_primary) ?? ucs[0];
  const company = primary?.companies;

  const trimOrNull = (value: string | null | undefined): string | null => {
    const t = value?.trim();
    return t ? t : null;
  };

  subjectProfile = {
    ...subjectProfile,
    companyRegon: trimOrNull(company?.regon),
    companyKrs: trimOrNull(company?.krs),
    companyAddress: trimOrNull(company?.address),
    companyPostalCode: trimOrNull(company?.postal_code),
    companyPhone: trimOrNull(company?.phone),
    companyEmail: trimOrNull(company?.email),
    companyWebsite: trimOrNull(company?.website),
  };

  const [uploadedDocuments, lastDecisionAt, reviews, verificationStatus] = await Promise.all([
    getVerificationDocumentSignedUrls(supabase, requiredDocPaths),
    fetchLatestDecisionAtForUser(supabase, userId),
    fetchVerificationDocumentReviews(supabase, userId),
    getUserVerificationStatus(userId, supabase),
  ]);

  const documents = mergeRequiredVerificationDocuments(userType, uploadedDocuments);

  const queueVerificationState = resolveQueueVerificationState(
    profile.is_verified as boolean | null,
    (profile.verification_submitted_at as string | null) ?? null,
  );
  const adminDisplayStatus = resolveAdminUserStatus({
    emailConfirmed,
    verificationState:
      verificationStatus.state === 'approved' && !profile.is_verified
        ? queueVerificationState
        : verificationStatus.state,
  });

  return (
    <div className="space-y-6">
      <VerificationSubjectPanel
        subjectUserId={userId}
        firstName={(profile.first_name as string) ?? ''}
        lastName={(profile.last_name as string) ?? ''}
        userType={userType}
        adminDisplayStatus={adminDisplayStatus}
        rejectionReason={verificationStatus.reason}
        email={email ?? company?.email ?? null}
        phone={(profile.phone as string | null) ?? company?.phone ?? null}
        companyName={company?.name ?? null}
        companyNip={company?.nip ?? null}
        companyCity={company?.city ?? null}
        documentsSubmitted={documentsSubmitted}
        documentsExpected={documentsExpected}
        createdAt={(profile.created_at as string | null) ?? null}
        updatedAt={resolveUpdatedAt(
          profile.updated_at as string | null,
          profile.verification_submitted_at as string | null,
          paths
        )}
        submittedAt={(profile.verification_submitted_at as string | null) ?? null}
        notesCount={notes.length}
        documents={documents}
        reviews={reviews}
        lastDecisionAt={lastDecisionAt}
        ocValidUntil={ocValidUntil}
        profileDetails={subjectProfile}
      />

      <AdminNotesCollapsibleSection subjectUserId={userId} notes={notes} />
    </div>
  );
}
