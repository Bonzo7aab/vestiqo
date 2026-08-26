import type { FormalRequirements } from './tender-contest';

export type ContestOfferVatRate = '8' | '23' | 'zw';

export type FormalRequirementKey =
  | 'insuranceOc'
  | 'zusUsCertificates'
  | 'references'
  | 'professionalCertificates'
  | 'professionalLicenses';

export interface ContestOfferAttachmentRef {
  id: string;
  name: string;
  path: string;
  url?: string;
  type: 'document' | 'image';
  source: 'profile' | 'override' | 'extra';
  requirementKey?: FormalRequirementKey | 'deposit' | 'offerDocumentation' | 'other';
  size?: number;
}

export interface ContestOfferDetails {
  currentStep?: number;
  proposedCompletionDate?: string | null;
  siteVisitConfirmed?: boolean;
  /** @deprecated OPD-150: references are formalAttachments.references; kept for legacy drafts */
  referencesText?: string;
  netPrice?: number | null;
  vatRate?: ContestOfferVatRate;
  grossPrice?: number | null;
  warrantyMonths?: number | null;
  guaranteeMonths?: number | null;
  paymentTermsAccepted?: boolean;
  formalAttachments?: Partial<Record<FormalRequirementKey, ContestOfferAttachmentRef>>;
  extraAttachments?: ContestOfferAttachmentRef[];
}

export interface ContestOfferFormData {
  proposedCompletionDate: string;
  siteVisitConfirmed: boolean;
  referencesText: string;
  netPrice: string;
  vatRate: ContestOfferVatRate;
  warrantyMonths: string;
  guaranteeMonths: string;
  paymentTermsAccepted: boolean;
  formalAttachments: Partial<Record<FormalRequirementKey, ContestOfferAttachmentRef>>;
  extraAttachments: ContestOfferAttachmentRef[];
  stagedFiles: Partial<
    Record<FormalRequirementKey | 'deposit' | 'offerDocumentation' | 'other', File[]>
  >;
}

export interface ResolvedContractorDocument {
  requirementKey: FormalRequirementKey;
  label: string;
  path: string | null;
  fileName: string | null;
  signedUrl: string | null;
  hint: string | null;
  missing: boolean;
  /** True when the contractor profile does not meet this contest requirement. */
  profileBlocked: boolean;
}

export function createEmptyContestOfferForm(): ContestOfferFormData {
  return {
    proposedCompletionDate: '',
    siteVisitConfirmed: false,
    referencesText: '',
    netPrice: '',
    vatRate: '23',
    warrantyMonths: '',
    guaranteeMonths: '',
    paymentTermsAccepted: false,
    formalAttachments: {},
    extraAttachments: [],
    stagedFiles: {},
  };
}

/**
 * Strip File objects and `undefined` fields so the form can be passed to
 * Next.js server actions (they reject undefined / non-plain values).
 * Profile-prefilled Wymogi attachments often omit `url`/`size` (OPD-183).
 */
export function toSerializableContestOfferForm(form: ContestOfferFormData): ContestOfferFormData {
  const withoutFiles: ContestOfferFormData = { ...form, stagedFiles: {} };
  return JSON.parse(JSON.stringify(withoutFiles)) as ContestOfferFormData;
}

export function computeGrossFromNet(net: number, vatRate: ContestOfferVatRate): number {
  if (vatRate === 'zw') return net;
  const rate = vatRate === '8' ? 0.08 : 0.23;
  return Math.round(net * (1 + rate) * 100) / 100;
}

export function formDataToOfferDetails(
  form: ContestOfferFormData,
  step?: number,
): ContestOfferDetails {
  const net = form.netPrice.trim() ? Number.parseFloat(form.netPrice) : null;
  const gross =
    net != null && !Number.isNaN(net) ? computeGrossFromNet(net, form.vatRate) : null;

  return {
    currentStep: step,
    proposedCompletionDate: form.proposedCompletionDate || null,
    siteVisitConfirmed: form.siteVisitConfirmed,
    referencesText: form.referencesText,
    netPrice: net != null && !Number.isNaN(net) ? net : null,
    vatRate: form.vatRate,
    grossPrice: gross,
    warrantyMonths: form.warrantyMonths ? Number.parseInt(form.warrantyMonths, 10) : null,
    guaranteeMonths: form.guaranteeMonths ? Number.parseInt(form.guaranteeMonths, 10) : null,
    paymentTermsAccepted: form.paymentTermsAccepted,
    formalAttachments: form.formalAttachments,
    extraAttachments: form.extraAttachments,
  };
}

export function offerDetailsToFormData(
  details: ContestOfferDetails | null | undefined,
): ContestOfferFormData {
  const base = createEmptyContestOfferForm();
  if (!details) return base;

  return {
    ...base,
    proposedCompletionDate: details.proposedCompletionDate ?? '',
    siteVisitConfirmed: details.siteVisitConfirmed ?? false,
    referencesText: details.referencesText ?? '',
    netPrice: details.netPrice != null ? String(details.netPrice) : '',
    vatRate: details.vatRate ?? '23',
    warrantyMonths: details.warrantyMonths != null ? String(details.warrantyMonths) : '',
    guaranteeMonths: details.guaranteeMonths != null ? String(details.guaranteeMonths) : '',
    paymentTermsAccepted: details.paymentTermsAccepted ?? false,
    formalAttachments: details.formalAttachments ?? {},
    extraAttachments: details.extraAttachments ?? [],
  };
}

export function mergeAttachmentsForBid(
  form: ContestOfferFormData,
): ContestOfferAttachmentRef[] {
  const formal = Object.values(form.formalAttachments).filter(
    (a): a is ContestOfferAttachmentRef => Boolean(a),
  );
  return [...formal, ...form.extraAttachments];
}

export function requiredFormalKeys(formal: FormalRequirements): FormalRequirementKey[] {
  const keys: FormalRequirementKey[] = [];
  if (formal.insuranceOc) keys.push('insuranceOc');
  if (formal.zusUsCertificates) keys.push('zusUsCertificates');
  if (formal.references) keys.push('references');
  if (formal.professionalCertificates) keys.push('professionalCertificates');
  if (formal.professionalLicenses) keys.push('professionalLicenses');
  return keys;
}
