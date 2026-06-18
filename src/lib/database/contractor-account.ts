import { createClient } from '../supabase/client';
import type {
  ContractorServiceAreaSettings,
  ContractorVatStatus,
} from '../contractor/constants';
import { DEFAULT_SERVICE_AREA } from '../contractor/constants';
import { normalizeIbanInput } from '../contractor/iban';

export {
  getOcPolicyAllowedFormatsLabel,
  OC_POLICY_ALLOWED_EXTENSIONS,
} from './contractor-account-constants';
export {
  getOcPolicyScanSignedUrl,
  getVerificationDocumentSignedUrl,
  removeVerificationDocumentsFromBucket,
  uploadOcPolicyScan,
  uploadProfessionalQualificationsScan,
  uploadReferenceDocumentScan,
  uploadTaxCertificateScan,
  uploadZusCertificateScan,
} from './contractor-account-storage';

export interface ContractorNotificationChannels {
  email: boolean;
  app: boolean;
  phoneCall: boolean;
  sms: boolean;
}

export interface ContractorRadarSettings {
  enabled: boolean;
  minAmountNet: number;
  areas: string[];
}

export interface ContractorAccountSettings {
  ocValidUntil: string | null;
  ocPolicyScanPath: string | null;
  ocGuaranteeAmount: number | null;
  professionalQualificationsValidUntil: string | null;
  professionalQualificationsScanPath: string | null;
  professionalQualificationTypes: string[];
  bankAccountIban: string | null;
  vatStatus: ContractorVatStatus | null;
  vatWhitelistVerifiedAt: string | null;
  vatWhitelistAccountAssigned: boolean | null;
  vatWhitelistRequestId: string | null;
  vatWhitelistCheckedForDate: string | null;
  serviceArea: ContractorServiceAreaSettings;
  zusCertificatePath: string | null;
  zusCertificateIssuedAt: string | null;
  taxCertificatePath: string | null;
  taxCertificateIssuedAt: string | null;
  referenceDocumentPaths: string[];
  notificationChannels: ContractorNotificationChannels;
  radar: ContractorRadarSettings;
  updatedAt: string | null;
}

const DEFAULT_CHANNELS: ContractorNotificationChannels = {
  email: true,
  app: true,
  phoneCall: false,
  sms: false,
};

const DEFAULT_RADAR: ContractorRadarSettings = {
  enabled: true,
  minAmountNet: 1000,
  areas: ['Warszawa'],
};

const normalizeBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const normalizeNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const normalizeAreas = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return DEFAULT_RADAR.areas;
  }

  const filtered = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);

  return filtered.length > 0 ? filtered : DEFAULT_RADAR.areas;
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string').map(s => s.trim()).filter(Boolean);
};

const normalizeServiceArea = (value: unknown): ContractorServiceAreaSettings => {
  if (typeof value !== 'object' || value === null) {
    return DEFAULT_SERVICE_AREA;
  }
  const raw = value as Record<string, unknown>;
  const voivodeship =
    typeof raw.voivodeship === 'string' && raw.voivodeship.trim()
      ? (raw.voivodeship as ContractorServiceAreaSettings['voivodeship'])
      : DEFAULT_SERVICE_AREA.voivodeship;
  const scope =
    raw.scope === 'whole_voivodeship' || raw.scope === 'selected_cities'
      ? raw.scope
      : DEFAULT_SERVICE_AREA.scope;
  const cities = normalizeStringArray(raw.cities);
  const districts = normalizeStringArray(raw.districts);
  return {
    voivodeship,
    scope,
    cities,
    districts,
  };
};

const normalizeVatStatus = (value: unknown): ContractorVatStatus | null => {
  if (value === 'active_vat' || value === 'vat_exempt') return value;
  return null;
};

const normalizeGuaranteeAmount = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return null;
};

const normalizeSettings = (row: Record<string, unknown> | null): ContractorAccountSettings => {
  if (!row) {
    return {
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
      notificationChannels: DEFAULT_CHANNELS,
      radar: DEFAULT_RADAR,
      updatedAt: null,
    };
  }

  const notificationChannelsRaw =
    typeof row.notification_channels === 'object' && row.notification_channels !== null
      ? (row.notification_channels as Record<string, unknown>)
      : {};

  const radarRaw =
    typeof row.radar_settings === 'object' && row.radar_settings !== null
      ? (row.radar_settings as Record<string, unknown>)
      : {};

  return {
    ocValidUntil: typeof row.oc_valid_until === 'string' ? row.oc_valid_until : null,
    ocPolicyScanPath: typeof row.oc_policy_scan_path === 'string' ? row.oc_policy_scan_path : null,
    ocGuaranteeAmount: normalizeGuaranteeAmount(row.oc_guarantee_amount),
    professionalQualificationsValidUntil:
      typeof row.professional_qualifications_valid_until === 'string'
        ? row.professional_qualifications_valid_until
        : null,
    professionalQualificationsScanPath:
      typeof row.professional_qualifications_scan_path === 'string'
        ? row.professional_qualifications_scan_path
        : null,
    professionalQualificationTypes: normalizeStringArray(row.professional_qualification_types),
    bankAccountIban:
      typeof row.bank_account_iban === 'string' ? normalizeIbanInput(row.bank_account_iban) || null : null,
    vatStatus: normalizeVatStatus(row.vat_status),
    vatWhitelistVerifiedAt:
      typeof row.vat_whitelist_verified_at === 'string' ? row.vat_whitelist_verified_at : null,
    vatWhitelistAccountAssigned:
      typeof row.vat_whitelist_account_assigned === 'boolean' ? row.vat_whitelist_account_assigned : null,
    vatWhitelistRequestId:
      typeof row.vat_whitelist_request_id === 'string' ? row.vat_whitelist_request_id : null,
    vatWhitelistCheckedForDate:
      typeof row.vat_whitelist_checked_for_date === 'string' ? row.vat_whitelist_checked_for_date : null,
    serviceArea: normalizeServiceArea(row.service_area_settings),
    zusCertificatePath: typeof row.zus_certificate_path === 'string' ? row.zus_certificate_path : null,
    zusCertificateIssuedAt:
      typeof row.zus_certificate_issued_at === 'string' ? row.zus_certificate_issued_at : null,
    taxCertificatePath: typeof row.tax_certificate_path === 'string' ? row.tax_certificate_path : null,
    taxCertificateIssuedAt:
      typeof row.tax_certificate_issued_at === 'string' ? row.tax_certificate_issued_at : null,
    referenceDocumentPaths: normalizeStringArray(row.reference_document_paths),
    notificationChannels: {
      email: normalizeBoolean(notificationChannelsRaw.email, DEFAULT_CHANNELS.email),
      app: normalizeBoolean(notificationChannelsRaw.app, DEFAULT_CHANNELS.app),
      phoneCall: normalizeBoolean(notificationChannelsRaw.phoneCall, DEFAULT_CHANNELS.phoneCall),
      sms: normalizeBoolean(notificationChannelsRaw.sms, DEFAULT_CHANNELS.sms),
    },
    radar: {
      enabled: normalizeBoolean(radarRaw.enabled, DEFAULT_RADAR.enabled),
      minAmountNet: normalizeNumber(radarRaw.minAmountNet, DEFAULT_RADAR.minAmountNet),
      areas: normalizeAreas(radarRaw.areas),
    },
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
  };
};

const isMissingContractorSettingsTableError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeError = error as { code?: string; message?: string; details?: string };
  if (maybeError.code === '42P01' || maybeError.code === 'PGRST205') {
    return true;
  }

  const combined = `${maybeError.message || ''} ${maybeError.details || ''}`.toLowerCase();
  return (
    combined.includes('contractor_account_settings') &&
    (combined.includes('does not exist') || combined.includes('not found') || combined.includes('could not find'))
  );
};

export async function getContractorAccountSettings(userId: string): Promise<ContractorAccountSettings> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('contractor_account_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (isMissingContractorSettingsTableError(error)) {
      return normalizeSettings(null);
    }
    throw error;
  }

  return normalizeSettings((data as Record<string, unknown> | null) || null);
}

/**
 * Mirror the OC scan path into the user's verification document set so the
 * `/weryfikacja` page (and admin review) sees the same file as the OC card.
 * Best-effort: any failure is logged but does not roll back the main upsert.
 */
async function syncOcScanToVerificationDocs(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  userId: string,
  ocPath: string | null
): Promise<void> {
  try {
    const { data: profile, error: readError } = await client
      .from('user_profiles')
      .select('verification_document_paths')
      .eq('id', userId)
      .maybeSingle();

    if (readError) {
      console.error('syncOcScanToVerificationDocs: read failed', readError);
      return;
    }

    const paths =
      (profile?.verification_document_paths as Record<string, string> | null | undefined) ?? {};
    const next: Record<string, string> = { ...paths };
    if (ocPath) {
      if (next.insurance === ocPath) return; // no-op
      next.insurance = ocPath;
    } else {
      if (!('insurance' in next)) return; // no-op
      delete next.insurance;
    }

    const { error: writeError } = await client
      .from('user_profiles')
      .update({ verification_document_paths: next })
      .eq('id', userId);

    if (writeError) {
      console.error('syncOcScanToVerificationDocs: write failed', writeError);
    }
  } catch (err) {
    console.error('syncOcScanToVerificationDocs: unexpected error', err);
  }
}

export async function upsertContractorAccountSettings(
  userId: string,
  payload: Partial<ContractorAccountSettings>
): Promise<ContractorAccountSettings> {
  const supabase = createClient();
  const updatedAt = new Date().toISOString();

  const patch: Record<string, unknown> = { updated_at: updatedAt };

  if (payload.ocValidUntil !== undefined) {
    patch.oc_valid_until = payload.ocValidUntil;
  }
  if (payload.ocPolicyScanPath !== undefined) {
    patch.oc_policy_scan_path = payload.ocPolicyScanPath;
  }
  if (payload.ocGuaranteeAmount !== undefined) {
    patch.oc_guarantee_amount = payload.ocGuaranteeAmount;
  }
  if (payload.professionalQualificationsValidUntil !== undefined) {
    patch.professional_qualifications_valid_until = payload.professionalQualificationsValidUntil;
  }
  if (payload.professionalQualificationsScanPath !== undefined) {
    patch.professional_qualifications_scan_path = payload.professionalQualificationsScanPath;
  }
  if (payload.professionalQualificationTypes !== undefined) {
    patch.professional_qualification_types = payload.professionalQualificationTypes;
  }
  if (payload.bankAccountIban !== undefined) {
    patch.bank_account_iban = payload.bankAccountIban
      ? normalizeIbanInput(payload.bankAccountIban)
      : null;
  }
  if (payload.vatStatus !== undefined) {
    patch.vat_status = payload.vatStatus;
  }
  if (payload.vatWhitelistVerifiedAt !== undefined) {
    patch.vat_whitelist_verified_at = payload.vatWhitelistVerifiedAt;
  }
  if (payload.vatWhitelistAccountAssigned !== undefined) {
    patch.vat_whitelist_account_assigned = payload.vatWhitelistAccountAssigned;
  }
  if (payload.vatWhitelistRequestId !== undefined) {
    patch.vat_whitelist_request_id = payload.vatWhitelistRequestId;
  }
  if (payload.vatWhitelistCheckedForDate !== undefined) {
    patch.vat_whitelist_checked_for_date = payload.vatWhitelistCheckedForDate;
  }
  if (payload.serviceArea !== undefined) {
    patch.service_area_settings = payload.serviceArea;
  }
  if (payload.zusCertificatePath !== undefined) {
    patch.zus_certificate_path = payload.zusCertificatePath;
  }
  if (payload.zusCertificateIssuedAt !== undefined) {
    patch.zus_certificate_issued_at = payload.zusCertificateIssuedAt;
  }
  if (payload.taxCertificatePath !== undefined) {
    patch.tax_certificate_path = payload.taxCertificatePath;
  }
  if (payload.taxCertificateIssuedAt !== undefined) {
    patch.tax_certificate_issued_at = payload.taxCertificateIssuedAt;
  }
  if (payload.referenceDocumentPaths !== undefined) {
    patch.reference_document_paths = payload.referenceDocumentPaths;
  }
  if (payload.notificationChannels !== undefined) {
    patch.notification_channels = payload.notificationChannels;
  }
  if (payload.radar !== undefined) {
    patch.radar_settings = payload.radar;
  }

  // Explicit UPDATE / INSERT — partial `.upsert()` can omit columns or behave unexpectedly with RLS + defaults.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  const { data: existingRow, error: selectError } = await client
    .from('contractor_account_settings')
    .select('user_id, oc_valid_until, oc_policy_scan_path')
    .eq('user_id', userId)
    .maybeSingle();

  const ocVerificationChanged =
    !!existingRow &&
    ((payload.ocValidUntil !== undefined &&
      (existingRow.oc_valid_until as string | null) !== payload.ocValidUntil) ||
      (payload.ocPolicyScanPath !== undefined &&
        (existingRow.oc_policy_scan_path as string | null) !== payload.ocPolicyScanPath));

  if (selectError) {
    if (isMissingContractorSettingsTableError(selectError)) {
      return normalizeSettings(null);
    }
    throw selectError;
  }

  if (existingRow) {
    const { data, error } = await client
      .from('contractor_account_settings')
      .update(patch)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      if (isMissingContractorSettingsTableError(error)) {
        return normalizeSettings(null);
      }
      throw error;
    }

    if (payload.ocPolicyScanPath !== undefined) {
      await syncOcScanToVerificationDocs(client, userId, payload.ocPolicyScanPath);
    }

    if (ocVerificationChanged) {
      const { invalidateUserVerification } = await import('../verification/invalidate-verification');
      await invalidateUserVerification(supabase, userId);
    }

    return normalizeSettings((data as Record<string, unknown>) || null);
  }

  const insertRow: Record<string, unknown> = {
    user_id: userId,
    notification_channels: DEFAULT_CHANNELS,
    radar_settings: DEFAULT_RADAR,
    ...patch,
  };

  const { data, error } = await client.from('contractor_account_settings').insert(insertRow).select('*').single();

  if (error) {
    if (isMissingContractorSettingsTableError(error)) {
      return normalizeSettings(null);
    }
    // Race: another request inserted the row between select and insert
    const maybeUnique = (error as { code?: string }).code === '23505';
    if (maybeUnique) {
      const { data: afterRace, error: retryError } = await client
        .from('contractor_account_settings')
        .update(patch)
        .eq('user_id', userId)
        .select('*')
        .single();
      if (retryError) {
        throw retryError;
      }
      if (payload.ocPolicyScanPath !== undefined) {
        await syncOcScanToVerificationDocs(client, userId, payload.ocPolicyScanPath);
      }
      return normalizeSettings((afterRace as Record<string, unknown>) || null);
    }
    throw error;
  }

  if (payload.ocPolicyScanPath !== undefined) {
    await syncOcScanToVerificationDocs(client, userId, payload.ocPolicyScanPath);
  }

  return normalizeSettings((data as Record<string, unknown>) || null);
}

