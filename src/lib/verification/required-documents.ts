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

/** OPD-186: contractor OC is profile data, not an admin-reviewed required document. */
export const CONTRACTOR_REQUIRED_DOC_KEYS = [] as const;
export const MANAGER_REQUIRED_DOC_KEYS = ['company_registration', 'insurance'] as const;

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
