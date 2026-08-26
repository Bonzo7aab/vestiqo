import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import type { ContractorFormalProfileSnapshot } from './validate-profile-formal-requirements';

export function asIsoDateOnly(value: unknown): string | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
    return match?.[1] ?? null;
  }
  return null;
}

function asAmount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
}

export function formalSnapshotFromSources(
  settings: {
    ocGuaranteeAmount: number | null;
    ocValidUntil: string | null;
    ocPolicyScanPath: string | null;
    professionalQualificationTypes: string[];
    professionalQualificationsScanPath: string | null;
    professionalQualificationsValidUntil: string | null;
  },
  verificationPaths: Record<string, string>,
): ContractorFormalProfileSnapshot {
  return {
    ocGuaranteeAmount: settings.ocGuaranteeAmount,
    ocValidUntil: asIsoDateOnly(settings.ocValidUntil),
    hasOcScan: Boolean(settings.ocPolicyScanPath ?? verificationPaths.insurance),
    hasCertificatesDoc: Boolean(verificationPaths.certifications),
    professionalQualificationTypes: settings.professionalQualificationTypes,
    professionalQualificationsScanPath: settings.professionalQualificationsScanPath,
    professionalQualificationsValidUntil: asIsoDateOnly(
      settings.professionalQualificationsValidUntil,
    ),
  };
}

export async function loadContractorFormalProfileSnapshot(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ContractorFormalProfileSnapshot> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  const { data: profile } = await client
    .from('user_profiles')
    .select('verification_document_paths')
    .eq('id', userId)
    .maybeSingle();

  const verificationPaths =
    (profile?.verification_document_paths as Record<string, string> | null | undefined) ?? {};

  const { data: row, error } = await client
    .from('contractor_account_settings')
    .select(
      'oc_valid_until, oc_policy_scan_path, oc_guarantee_amount, professional_qualification_types, professional_qualifications_scan_path, professional_qualifications_valid_until',
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !row) {
    return formalSnapshotFromSources(
      {
        ocGuaranteeAmount: null,
        ocValidUntil: null,
        ocPolicyScanPath: null,
        professionalQualificationTypes: [],
        professionalQualificationsScanPath: null,
        professionalQualificationsValidUntil: null,
      },
      verificationPaths,
    );
  }

  const record = row as Record<string, unknown>;
  return formalSnapshotFromSources(
    {
      ocGuaranteeAmount: asAmount(record.oc_guarantee_amount),
      ocValidUntil: asIsoDateOnly(record.oc_valid_until),
      ocPolicyScanPath: asString(record.oc_policy_scan_path),
      professionalQualificationTypes: asStringArray(record.professional_qualification_types),
      professionalQualificationsScanPath: asString(record.professional_qualifications_scan_path),
      professionalQualificationsValidUntil: asIsoDateOnly(
        record.professional_qualifications_valid_until,
      ),
    },
    verificationPaths,
  );
}
