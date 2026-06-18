import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import type { FormalRequirements } from '../../types/tender-contest';
import type {
  FormalRequirementKey,
  ResolvedContractorDocument,
} from '../../types/contest-offer';
import { requiredFormalKeys } from '../../types/contest-offer';
import {
  getContractorAccountSettings,
  type ContractorAccountSettings,
} from '../database/contractor-account';
import { DEFAULT_SERVICE_AREA } from '../contractor/constants';
import { createSignedUrlSafe } from '../storage/r2/operations';

const REQUIREMENT_LABELS: Record<FormalRequirementKey, string> = {
  insuranceOc: 'Polisa OC',
  zusUsCertificates: 'Zaświadczenia ZUS/US',
  references: 'Referencje',
  professionalCertificates: 'Certyfikaty zawodowe',
  professionalLicenses: 'Uprawnienia zawodowe',
};

function fileNameFromPath(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] ?? path;
}

function formatDateHint(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return `Ważne / wgrane: ${new Date(ms).toLocaleDateString('pl-PL')}`;
}

function resolveDocumentPath(
  key: FormalRequirementKey,
  verificationPaths: Record<string, string>,
  settings: ContractorAccountSettings,
): { path: string | null; hint: string | null } {
  switch (key) {
    case 'insuranceOc': {
      const path = settings.ocPolicyScanPath ?? verificationPaths.insurance ?? null;
      return {
        path,
        hint: settings.ocValidUntil
          ? `Ważna do: ${new Date(settings.ocValidUntil).toLocaleDateString('pl-PL')}`
          : null,
      };
    }
    case 'zusUsCertificates': {
      const path = settings.zusCertificatePath ?? settings.taxCertificatePath ?? null;
      const issued = settings.zusCertificateIssuedAt ?? settings.taxCertificateIssuedAt;
      return { path, hint: formatDateHint(issued) };
    }
    case 'references': {
      const fromVerification = verificationPaths.references;
      const fromSettings = settings.referenceDocumentPaths[0];
      return { path: fromVerification ?? fromSettings ?? null, hint: null };
    }
    case 'professionalCertificates':
      return {
        path: verificationPaths.certifications ?? null,
        hint: null,
      };
    case 'professionalLicenses':
      return {
        path: settings.professionalQualificationsScanPath ?? null,
        hint: formatDateHint(settings.professionalQualificationsValidUntil),
      };
    default:
      return { path: null, hint: null };
  }
}

export async function resolveContractorDocumentsWithClient(
  supabase: SupabaseClient<Database>,
  userId: string,
  formal: FormalRequirements,
): Promise<ResolvedContractorDocument[]> {
  const keys = requiredFormalKeys(formal);
  if (keys.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('user_profiles')
    .select('verification_document_paths')
    .eq('id', userId)
    .maybeSingle();

  const verificationPaths =
    (profile?.verification_document_paths as Record<string, string> | null | undefined) ?? {};

  const emptySettings: ContractorAccountSettings = {
    ocValidUntil: null,
    ocPolicyScanPath: null,
    ocGuaranteeAmount: null,
    professionalQualificationsValidUntil: null,
    professionalQualificationsScanPath: null,
    professionalQualificationTypes: [],
    bankAccountIban: null,
    vatStatus: null,
    vatWhitelistVerifiedAt: null,
    vatWhitelistAccountAssigned: null,
    vatWhitelistRequestId: null,
    vatWhitelistCheckedForDate: null,
    serviceArea: DEFAULT_SERVICE_AREA,
    zusCertificatePath: null,
    zusCertificateIssuedAt: null,
    taxCertificatePath: null,
    taxCertificateIssuedAt: null,
    referenceDocumentPaths: [],
    notificationChannels: { email: true, app: true, phoneCall: false, sms: false },
    radar: { enabled: false, minAmountNet: 0, areas: [] },
    updatedAt: null,
  };

  let settings = emptySettings;
  try {
    settings = await getContractorAccountSettings(userId);
  } catch {
    // Fall back to verification paths only when account settings are unavailable.
  }

  const results: ResolvedContractorDocument[] = [];

  for (const key of keys) {
    const { path, hint } = resolveDocumentPath(key, verificationPaths, settings);
    let signedUrl: string | null = null;
    if (path) {
      signedUrl = await createSignedUrlSafe(path);
    }

    results.push({
      requirementKey: key,
      label: REQUIREMENT_LABELS[key],
      path,
      fileName: path ? fileNameFromPath(path) : null,
      signedUrl,
      hint,
      missing: !path,
    });
  }

  return results;
}
