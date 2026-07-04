import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { createSignedUrlSafe } from '../storage/signed-url-actions';

export interface VerificationQueueRowBase {
  userId: string;
  firstName: string;
  lastName: string;
  userType: string;
  accountRole: string | null;
  organizationType: string | null;
  companyId: string | null;
  companyName: string | null;
  companyType: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  documentsSubmitted: number;
  documentsExpected: number;
  /** Set on the server via auth.admin when listing the queue. */
  emailConfirmed?: boolean;
  /** Set on the server via auth.admin when listing the queue. */
  email?: string | null;
}

export interface PendingVerificationRow extends VerificationQueueRowBase {
  verificationSubmittedAt: string | null;
}

export interface RejectedVerificationRow extends VerificationQueueRowBase {
  decidedAt: string;
  reason: string | null;
}

export interface ApprovedVerificationRow extends VerificationQueueRowBase {
  decidedAt: string;
}

/** Company + contractor fields shown on admin verification subject profile card. */
export interface AdminVerificationSubjectProfile {
  companyRegon: string | null;
  companyKrs: string | null;
  companyAddress: string | null;
  companyPostalCode: string | null;
  companyPhone: string | null;
  companyEmail: string | null;
  companyWebsite: string | null;
  bankAccountIban: string | null;
  vatStatusLabel: string | null;
  ocGuaranteeAmountPln: number | null;
}

const CONTRACTOR_REQUIRED_DOC_KEYS = ['company_registration', 'insurance'] as const;
const CONTRACTOR_OPTIONAL_DOC_KEYS = ['certifications', 'references'] as const;

const MANAGER_REQUIRED_DOC_KEYS = ['company_registration', 'insurance'] as const;
const MANAGER_OPTIONAL_DOC_KEYS = ['management_license', 'management_contracts'] as const;

const CONTRACTOR_DOC_KEYS = [
  ...CONTRACTOR_REQUIRED_DOC_KEYS,
  ...CONTRACTOR_OPTIONAL_DOC_KEYS,
] as const;

const MANAGER_DOC_KEYS = [
  ...MANAGER_REQUIRED_DOC_KEYS,
  ...MANAGER_OPTIONAL_DOC_KEYS,
] as const;

export function getRequiredDocumentKeys(userType: string): readonly string[] {
  return userType === 'contractor' ? CONTRACTOR_REQUIRED_DOC_KEYS : MANAGER_REQUIRED_DOC_KEYS;
}

export function filterPathsToRequiredDocuments(
  userType: string,
  paths: Record<string, string> | null | undefined
): Record<string, string> {
  const required = new Set(getRequiredDocumentKeys(userType));
  const filtered: Record<string, string> = {};
  for (const [key, path] of Object.entries(paths ?? {})) {
    if (required.has(key) && typeof path === 'string' && path.trim().length > 0) {
      filtered[key] = path;
    }
  }
  return filtered;
}

/** Ensures every required slot appears once, with placeholders for missing uploads. */
export function mergeRequiredVerificationDocuments(
  userType: string,
  uploaded: VerificationDocumentEntry[]
): VerificationDocumentEntry[] {
  const byKey = new Map(uploaded.map((doc) => [doc.key, doc]));
  return getRequiredDocumentKeys(userType).map((key) => {
    const existing = byKey.get(key);
    if (existing) return existing;
    return {
      key,
      label: verificationDocumentLabel(key),
      path: '',
      filename: '',
      uploadedAt: null,
      viewUrl: null,
      downloadUrl: null,
      missing: true,
    };
  });
}

export function expectedDocumentCount(userType: string): number {
  return getRequiredDocumentKeys(userType).length;
}

export function countSubmittedDocuments(
  userType: string,
  paths: Record<string, string> | null | undefined
): number {
  const keys = getRequiredDocumentKeys(userType);
  let count = 0;
  for (const key of keys) {
    const path = paths?.[key];
    if (path && typeof path === 'string' && path.trim().length > 0) {
      count += 1;
    }
  }
  return count;
}

export function resolveUpdatedAt(
  profileUpdatedAt: string | null | undefined,
  verificationSubmittedAt: string | null | undefined,
  paths: Record<string, string> | null | undefined
): string | null {
  const timestamps: number[] = [];
  if (profileUpdatedAt) {
    const ms = Date.parse(profileUpdatedAt);
    if (Number.isFinite(ms)) timestamps.push(ms);
  }
  if (verificationSubmittedAt) {
    const ms = Date.parse(verificationSubmittedAt);
    if (Number.isFinite(ms)) timestamps.push(ms);
  }
  for (const path of Object.values(paths ?? {})) {
    const filename = path.split('/').pop() ?? '';
    const uploadedAt = parseUploadedAtFromFilename(filename);
    if (uploadedAt) {
      const ms = Date.parse(uploadedAt);
      if (Number.isFinite(ms)) timestamps.push(ms);
    }
  }
  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps)).toISOString();
}

interface ProfileQueueSource {
  id: string;
  first_name: string | null;
  last_name: string | null;
  user_type: string | null;
  account_role?: string | null;
  organization_type?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  verification_submitted_at?: string | null;
  verification_document_paths?: Record<string, string> | null;
  user_companies?: Array<{
    is_primary?: boolean;
    companies?: { id?: string; name?: string; type?: string };
  }>;
}

function buildQueueRowBase(profile: ProfileQueueSource): Omit<VerificationQueueRowBase, never> {
  const userType = profile.user_type ?? '';
  const paths = profile.verification_document_paths ?? null;
  const ucs = profile.user_companies ?? [];
  const primary = ucs.find((uc) => uc.is_primary) ?? ucs[0];
  const company = primary?.companies;

  return {
    userId: profile.id,
    firstName: profile.first_name ?? '',
    lastName: profile.last_name ?? '',
    userType,
    accountRole: profile.account_role ?? null,
    organizationType: profile.organization_type ?? null,
    companyId: company?.id ?? null,
    companyName: company?.name ?? null,
    companyType: company?.type ?? null,
    createdAt: profile.created_at ?? null,
    updatedAt: resolveUpdatedAt(
      profile.updated_at,
      profile.verification_submitted_at,
      paths
    ),
    documentsSubmitted: countSubmittedDocuments(userType, paths),
    documentsExpected: expectedDocumentCount(userType),
  };
}

export interface VerificationDocumentEntry {
  key: string;
  label: string;
  path: string;
  filename: string;
  /**
   * ISO timestamp parsed from the storage filename's `Date.now()` prefix
   * (see `submitVerificationDocumentsAction`). Null when the prefix can't
   * be parsed — typically for legacy paths uploaded before this convention.
   */
  uploadedAt: string | null;
  viewUrl: string | null;
  downloadUrl: string | null;
  error?: string;
  /** True when the required document slot has no file in the user's profile. */
  missing?: boolean;
}

export interface DocumentReview {
  status: 'approved' | 'rejected';
  reason: string | null;
  reviewedAt: string;
  reviewedBy: string;
}

export type DocumentReviewMap = Record<string, DocumentReview>;

const DOC_LABELS: Record<string, string> = {
  company_registration: 'Wypis z KRS / CEIDG',
  insurance: 'Polisa ubezpieczeniowa',
  certifications: 'Certyfikaty',
  references: 'Referencje',
  management_license: 'Licencja zarządcy',
  management_contracts: 'Umowy zarządcze',
  oc_policy_scan: 'Polisa OC',
};

export function verificationDocumentLabel(key: string): string {
  return DOC_LABELS[key] ?? key;
}

function logSupabaseError(label: string, error: unknown): void {
  if (error && typeof error === 'object') {
    const e = error as { message?: string; details?: string; hint?: string; code?: string };
    console.error(label, {
      message: e.message,
      details: e.details,
      hint: e.hint,
      code: e.code,
    });
  } else {
    console.error(label, error);
  }
}

function appendDownloadParam(signedUrl: string, filename: string): string {
  const separator = signedUrl.includes('?') ? '&' : '?';
  return `${signedUrl}${separator}download=${encodeURIComponent(filename)}`;
}

/**
 * Filenames generated by `submitVerificationDocumentsAction` are prefixed with
 * `${Date.now()}-` so we can recover the upload time without round-tripping to
 * Storage object metadata. Returns null when the prefix is missing or invalid.
 */
function parseUploadedAtFromFilename(filename: string): string | null {
  const match = filename.match(/^(\d{10,16})-/);
  if (!match) return null;
  const ms = Number(match[1]);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  // Reject obviously bogus values (year < 2001 or > +50y from now).
  const fiftyYearsMs = 50 * 365 * 24 * 60 * 60 * 1000;
  const lowerBound = Date.UTC(2001, 0, 1);
  const upperBound = Date.now() + fiftyYearsMs;
  if (ms < lowerBound || ms > upperBound) return null;
  return new Date(ms).toISOString();
}

/**
 * Build view + download signed URLs for a map of doc key -> storage path.
 */
export async function getVerificationDocumentSignedUrls(
  _supabase: SupabaseClient<Database>,
  paths: Record<string, string>
): Promise<VerificationDocumentEntry[]> {
  const entries: VerificationDocumentEntry[] = [];

  for (const [key, path] of Object.entries(paths)) {
    if (!path || typeof path !== 'string') {
      continue;
    }
    const filename = path.split('/').pop() ?? key;
    const uploadedAt = parseUploadedAtFromFilename(filename);
    const signedUrl = await createSignedUrlSafe(path, 3600);

    if (!signedUrl) {
      entries.push({
        key,
        label: verificationDocumentLabel(key),
        path,
        filename,
        uploadedAt,
        viewUrl: null,
        downloadUrl: null,
        error: 'Nie udało się wygenerować linku.',
      });
      continue;
    }

    entries.push({
      key,
      label: verificationDocumentLabel(key),
      path,
      filename,
      uploadedAt,
      viewUrl: signedUrl,
      downloadUrl: appendDownloadParam(signedUrl, filename),
    });
  }

  return entries;
}

/**
 * Per-document admin review annotations stored on `user_profiles`. Returns an
 * empty map for users without any reviews.
 */
export async function fetchVerificationDocumentReviews(
  supabase: SupabaseClient<Database>,
  subjectUserId: string
): Promise<DocumentReviewMap> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data, error } = await sb
    .from('user_profiles')
    .select('verification_document_reviews')
    .eq('id', subjectUserId)
    .maybeSingle();

  if (error) {
    logSupabaseError('fetchVerificationDocumentReviews', error);
    return {};
  }

  return (data?.verification_document_reviews as DocumentReviewMap | null | undefined) ?? {};
}

/**
 * Latest `verification_decisions.created_at` for a single user (any decision
 * type), used by the admin detail page to highlight which documents were
 * (re)uploaded after the most recent decision.
 */
export async function fetchLatestDecisionAtForUser(
  supabase: SupabaseClient<Database>,
  subjectUserId: string
): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data, error } = await sb
    .from('verification_decisions')
    .select('created_at')
    .eq('subject_user_id', subjectUserId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logSupabaseError('fetchLatestDecisionAtForUser', error);
    return null;
  }
  return (data?.created_at as string | null) ?? null;
}

/**
 * All contractors/zarzadcy awaiting verification (OPD-45), including accounts that
 * have not uploaded documents yet. Excludes users whose latest decision is rejected
 * until they resubmit.
 */
export async function fetchPendingVerificationQueue(
  supabase: SupabaseClient<Database>
): Promise<PendingVerificationRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const latest = await fetchLatestDecisions(supabase);

  const { data: profiles, error } = await sb
    .from('user_profiles')
    .select(
      `
      id,
      first_name,
      last_name,
      user_type,
      account_role,
      organization_type,
      platform_role,
      verification_submitted_at,
      verification_document_paths,
      created_at,
      updated_at,
      is_verified,
      user_companies (
        is_primary,
        company_id,
        companies (
          id,
          name,
          type
        )
      )
    `
    )
    .in('user_type', ['contractor', 'manager'])
    .eq('is_verified', false)
    .order('created_at', { ascending: true });

  if (error) {
    logSupabaseError('fetchPendingVerificationQueue', error);
    return [];
  }

  const rows: PendingVerificationRow[] = [];

  for (const p of profiles ?? []) {
    if (p.platform_role === 'platform_admin') {
      continue;
    }

    const userId = p.id as string;
    const submittedAt = (p.verification_submitted_at as string | null) ?? null;
    const decision = latest.get(userId);
    if (decision?.decision === 'rejected' && !submittedAt) {
      continue;
    }

    const base = buildQueueRowBase(p as ProfileQueueSource);
    rows.push({
      ...base,
      verificationSubmittedAt: submittedAt,
    });
  }

  rows.sort((a, b) => {
    const aSubmitted = a.verificationSubmittedAt ? Date.parse(a.verificationSubmittedAt) : 0;
    const bSubmitted = b.verificationSubmittedAt ? Date.parse(b.verificationSubmittedAt) : 0;
    if (aSubmitted && bSubmitted) return aSubmitted - bSubmitted;
    if (aSubmitted) return -1;
    if (bSubmitted) return 1;
    return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'pl');
  });

  return rows;
}

interface DecisionWithProfile {
  subject_user_id: string;
  decision: string;
  reason: string | null;
  created_at: string;
}

/**
 * Returns the latest decision per user (independent of decision type).
 */
async function fetchLatestDecisions(
  supabase: SupabaseClient<Database>
): Promise<Map<string, DecisionWithProfile>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data, error } = await sb
    .from('verification_decisions')
    .select('subject_user_id, decision, reason, created_at')
    .order('created_at', { ascending: false })
    .limit(2000);

  if (error) {
    logSupabaseError('fetchLatestDecisions', error);
    return new Map();
  }

  const latest = new Map<string, DecisionWithProfile>();
  for (const d of (data ?? []) as DecisionWithProfile[]) {
    if (!latest.has(d.subject_user_id)) {
      latest.set(d.subject_user_id, d);
    }
  }
  return latest;
}

interface ProfileWithCompany extends ProfileQueueSource {
  is_verified: boolean | null;
  platform_role?: string;
}

async function fetchProfilesByIds(
  supabase: SupabaseClient<Database>,
  ids: string[]
): Promise<Map<string, ProfileWithCompany>> {
  if (ids.length === 0) return new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data, error } = await sb
    .from('user_profiles')
    .select(
      `
      id, first_name, last_name, user_type, account_role, organization_type, is_verified,
      created_at, updated_at, verification_submitted_at, verification_document_paths,
      user_companies ( is_primary, companies ( id, name, type ) )
    `
    )
    .in('id', ids);

  if (error) {
    logSupabaseError('fetchProfilesByIds', error);
    return new Map();
  }

  const map = new Map<string, ProfileWithCompany>();
  for (const p of (data ?? []) as ProfileWithCompany[]) {
    map.set(p.id, p);
  }
  return map;
}

function pickCompany(profile: ProfileWithCompany | undefined) {
  const ucs = profile?.user_companies ?? [];
  const primary = ucs.find((uc) => uc.is_primary) ?? ucs[0];
  return primary?.companies ?? null;
}

export async function fetchRejectedVerificationQueue(
  supabase: SupabaseClient<Database>
): Promise<RejectedVerificationRow[]> {
  const latest = await fetchLatestDecisions(supabase);
  const rejectedIds: string[] = [];
  for (const [uid, dec] of latest.entries()) {
    if (dec.decision === 'rejected') rejectedIds.push(uid);
  }

  const profiles = await fetchProfilesByIds(supabase, rejectedIds);

  const rows: RejectedVerificationRow[] = [];
  for (const uid of rejectedIds) {
    const profile = profiles.get(uid);
    if (!profile) continue;
    if (profile.is_verified) continue;
    const decision = latest.get(uid)!;
    rows.push({
      ...buildQueueRowBase(profile),
      decidedAt: decision.created_at,
      reason: decision.reason ?? null,
    });
  }

  rows.sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));
  return rows;
}

export async function fetchApprovedVerificationQueue(
  supabase: SupabaseClient<Database>
): Promise<ApprovedVerificationRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: profiles, error } = await sb
    .from('user_profiles')
    .select(
      `
      id,
      first_name,
      last_name,
      user_type,
      account_role,
      organization_type,
      platform_role,
      is_verified,
      created_at,
      updated_at,
      verification_submitted_at,
      verification_document_paths,
      user_companies ( is_primary, companies ( id, name, type ) )
    `
    )
    .in('user_type', ['contractor', 'manager'])
    .eq('is_verified', true)
    .order('updated_at', { ascending: false });

  if (error) {
    logSupabaseError('fetchApprovedVerificationQueue', error);
    return [];
  }

  const latest = await fetchLatestDecisions(supabase);
  const rows: ApprovedVerificationRow[] = [];

  for (const p of (profiles ?? []) as ProfileWithCompany[]) {
    if ((p as ProfileWithCompany & { platform_role?: string }).platform_role === 'platform_admin') {
      continue;
    }
    const decision = latest.get(p.id);
    rows.push({
      ...buildQueueRowBase(p),
      decidedAt: decision?.created_at ?? p.updated_at ?? '',
    });
  }

  return rows;
}

export async function fetchAdminNotesForUser(
  supabase: SupabaseClient<Database>,
  subjectUserId: string
): Promise<Array<{ id: string; body: string; created_at: string; author_id: string }>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data, error } = await sb
    .from('admin_user_notes')
    .select('id, body, created_at, author_id')
    .eq('subject_user_id', subjectUserId)
    .order('created_at', { ascending: false });

  if (error) {
    logSupabaseError('fetchAdminNotesForUser', error);
    return [];
  }

  return (data ?? []) as Array<{ id: string; body: string; created_at: string; author_id: string }>;
}
