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
  getContractorAccountSettingsWithClient,
  type ContractorAccountSettings,
} from '../database/contractor-account';
import { DEFAULT_SERVICE_AREA, professionalQualificationLabel } from '../contractor/constants';
import { createSignedUrlSafe } from '../storage/r2/operations';
import { formalSnapshotFromSources } from './load-formal-profile-snapshot';
import {
  validateProfileFormalRequirements,
  type ContractorFormalProfileSnapshot,
} from './validate-profile-formal-requirements';

const REQUIREMENT_LABELS: Record<FormalRequirementKey, string> = {
  insuranceOc: 'Polisa OC',
  zusUsCertificates: 'Zaświadczenia ZUS/US',
  references: 'Referencje – wykaz zrealizowanych prac',
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

function formatOcHint(settings: ContractorAccountSettings): string | null {
  const parts: string[] = [];
  if (settings.ocGuaranteeAmount != null) {
    parts.push(`Suma: ${settings.ocGuaranteeAmount.toLocaleString('pl-PL')} zł`);
  }
  if (settings.ocValidUntil) {
    const ms = Date.parse(settings.ocValidUntil);
    if (Number.isFinite(ms)) {
      parts.push(`Ważna do: ${new Date(ms).toLocaleDateString('pl-PL')}`);
    }
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

function formatLicensesHint(settings: ContractorAccountSettings): string | null {
  const parts: string[] = [];
  const dateHint = formatDateHint(settings.professionalQualificationsValidUntil);
  if (dateHint) parts.push(dateHint);
  if (settings.professionalQualificationTypes.length > 0) {
    const labels = settings.professionalQualificationTypes.map(professionalQualificationLabel);
    parts.push(labels.join(', '));
  }
  return parts.length > 0 ? parts.join(' · ') : null;
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
        hint: formatOcHint(settings),
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
        hint: formatLicensesHint(settings),
      };
    default:
      return { path: null, hint: null };
  }
}

export interface ResolvedContractorFormalContext {
  documents: ResolvedContractorDocument[];
  snapshot: ContractorFormalProfileSnapshot;
}

export async function resolveContractorDocumentsWithClient(
  supabase: SupabaseClient<Database>,
  userId: string,
  formal: FormalRequirements,
): Promise<ResolvedContractorFormalContext> {
  const keys = requiredFormalKeys(formal);
  if (keys.length === 0) {
    return {
      documents: [],
      snapshot: formalSnapshotFromSources(
        {
          ocGuaranteeAmount: null,
          ocValidUntil: null,
          ocPolicyScanPath: null,
          professionalQualificationTypes: [],
          professionalQualificationsScanPath: null,
          professionalQualificationsValidUntil: null,
        },
        {},
      ),
    };
  }

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
    financeRegistryStatus: null,
    financeRegistryCheckedAt: null,
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
    settings = await getContractorAccountSettingsWithClient(supabase, userId);
  } catch {
    // Fall back to verification paths only when account settings are unavailable.
  }

  const snapshot = formalSnapshotFromSources(settings, verificationPaths);
  const profileErrors = validateProfileFormalRequirements(formal, snapshot);
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
      profileBlocked: Boolean(profileErrors[key]),
    });
  }

  return { documents: results, snapshot };
}
