import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import {
  resolveJobLocationFromBuildingOrCompany,
  resolveTenderCategoryIds,
  type JobLocation,
} from '../database/jobs';
import type { TenderUpsertData } from '../database/jobs';
import type {
  FormalRequirements,
  PaymentTerms,
  SiteVisitType,
  TenderContestDocumentMeta,
  TenderContestFormData,
  WarrantyGuaranteePeriod,
} from '../../types/tender-contest';
import {
  DEFAULT_FORMAL_REQUIREMENTS,
  DEFAULT_PAYMENT_TERMS,
  parseSelectionCriteria,
} from '../../types/tender-contest';

export interface TenderContestCreatePayload {
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  location: JobLocation;
  estimatedValue: string;
  currency: string;
  submissionDeadline: Date;
  evaluationDeadline?: Date | null;
  requirements: string[];
  evaluationCriteria: Array<Record<string, unknown>>;
  documents?: Array<Record<string, unknown>>;
  isPublic: boolean;
  allowQuestions: boolean;
  minimumExperience: number;
  requiredCertificates: string[];
  insuranceRequired: string;
  advancePayment: boolean;
  performanceBond: boolean;
  status?: 'draft' | 'active';
  managerId: string;
  companyId: string;
  renewedFromContestId?: string | null;
  address?: string;
  latitude?: number;
  longitude?: number;
  buildingId?: string | null;
  subcategoryId?: string | null;
  completionDate?: Date | null;
  siteVisitType?: string;
  siteVisitNotes?: string | null;
  formalRequirements?: Record<string, unknown> | null;
  selectionCriteria?: Record<string, unknown> | null;
  warrantyPeriod?: string | null;
  guaranteePeriod?: string | null;
  depositRequired?: boolean;
  depositInstructions?: string | null;
  paymentTerms?: Record<string, unknown> | null;
  wadium?: number | null;
}

const WARRANTY_LABELS: Record<WarrantyGuaranteePeriod, string> = {
  none: 'Brak',
  min_12: 'Min. 12 miesięcy',
  min_24: 'Min. 24 miesięcy',
  min_36: 'Min. 36 miesięcy',
  other: 'Inny',
};

function formatWarrantyLabel(value: WarrantyGuaranteePeriod | ''): string | null {
  if (!value) return null;
  return WARRANTY_LABELS[value] ?? null;
}

function buildRequirementsStrings(formal: FormalRequirements): string[] {
  const lines: string[] = [];
  if (formal.insuranceOc) {
    const min = formal.insuranceOcMinAmount
      ? ` (min. ${formal.insuranceOcMinAmount.toLocaleString('pl-PL')} zł)`
      : '';
    lines.push(`Aktualna polisa OC wykonawcy${min}`);
  }
  if (formal.zusUsCertificates) {
    lines.push('Zaświadczenia o niezaleganiu w ZUS i US (nie starsze niż 3 miesiące)');
  }
  if (formal.references) {
    const min = formal.referencesMinCount ?? 2;
    const years = formal.referencesYears ?? 3;
    lines.push(`Referencje – min. ${min} podobne realizacje z ostatnich ${years} lat`);
  }
  if (formal.professionalCertificates) {
    lines.push('Certyfikaty zawodowe');
  }
  if (formal.professionalLicenses) {
    lines.push('Uprawnienia zawodowe');
  }
  return lines;
}

export async function buildCreateTenderPayload(
  supabase: SupabaseClient<Database>,
  form: TenderContestFormData,
  uploadedDocs: TenderContestDocumentMeta[],
  managerId: string,
  companyId: string,
  companyCity: string | null | undefined,
  companyAddress: string | null | undefined,
  status: 'draft' | 'active',
): Promise<{ payload: TenderContestCreatePayload | null; error: Error | null }> {
  const loc = await resolveJobLocationFromBuildingOrCompany(
    supabase,
    companyId,
    form.buildingId || null,
    companyCity,
    companyAddress,
  );

  const resolved = await resolveTenderCategoryIds(
    supabase,
    form.category,
    form.subcategory,
    status,
  );
  if (resolved.error || !resolved.categoryId) {
    return {
      payload: null,
      error: new Error(resolved.error?.message || 'Nie znaleziono kategorii'),
    };
  }

  const hasValidSubmissionDeadline =
    form.submissionDeadline && !Number.isNaN(form.submissionDeadline.getTime());

  const submissionDeadline = hasValidSubmissionDeadline
    ? form.submissionDeadline
    : (() => {
        const fallback = new Date();
        fallback.setDate(fallback.getDate() + 30);
        return fallback;
      })();

  let evaluationDeadline: Date | null = form.evaluationDeadline;
  if (
    evaluationDeadline &&
    hasValidSubmissionDeadline &&
    evaluationDeadline.getTime() <= form.submissionDeadline.getTime()
  ) {
    evaluationDeadline = null;
  }

  const requirements = buildRequirementsStrings(form.formalRequirements);

  const evaluationCriteria = form.selectionCriteria.items.map((item) => ({
    id: item.id,
    name: item.name.trim() || item.id,
    description: item.description?.trim() ?? '',
    weight: item.weight,
    type: item.type,
  }));

  const locationJson: JobLocation = { city: loc.city };

  const documents = uploadedDocs.map((d) => ({
    id: d.id,
    name: d.name,
    type: d.type,
    url: d.url,
    path: d.path,
  }));

  const payload: TenderContestCreatePayload = {
    title: form.title.trim() || (status === 'draft' ? 'Szkic konkursu' : ''),
    description: form.description.trim(),
    category: form.category,
    subcategory: form.subcategory,
    location: locationJson,
    estimatedValue: '0',
    currency: 'PLN',
    submissionDeadline,
    evaluationDeadline,
    requirements,
    evaluationCriteria,
    documents,
    isPublic: true,
    allowQuestions: true,
    minimumExperience: 0,
    requiredCertificates: [],
    insuranceRequired: '',
    advancePayment: false,
    performanceBond: false,
    status,
    managerId,
    companyId,
    address: loc.address ?? undefined,
    latitude: loc.latitude ?? undefined,
    longitude: loc.longitude ?? undefined,
    buildingId: form.buildingId || null,
    subcategoryId: resolved.subcategoryId,
    completionDate: form.completionDate,
    siteVisitType: form.siteVisitType,
    siteVisitNotes:
      form.siteVisitType === 'not_required' ? null : form.siteVisitNotes.trim() || null,
    formalRequirements: form.formalRequirements as unknown as Record<string, unknown>,
    selectionCriteria: form.selectionCriteria as unknown as Record<string, unknown>,
    warrantyPeriod: formatWarrantyLabel(form.warrantyPeriod),
    guaranteePeriod: formatWarrantyLabel(form.guaranteePeriod),
    depositRequired: form.depositRequired,
    depositInstructions: form.depositRequired ? form.depositInstructions.trim() || null : null,
    paymentTerms: form.paymentTerms as unknown as Record<string, unknown>,
    wadium: form.depositRequired && form.depositAmount != null ? form.depositAmount : null,
  };

  return { payload, error: null };
}

/** Strips manager/company ids for updateTender (create payload → upsert row). */
export function contestPayloadToUpsertData(
  payload: TenderContestCreatePayload,
): TenderUpsertData {
  const { managerId: _managerId, companyId: _companyId, ...upsert } = payload;
  return upsert;
}

const REVERSE_WARRANTY: Record<string, WarrantyGuaranteePeriod> = {
  Brak: 'none',
  'Min. 12 miesięcy': 'min_12',
  'Min. 24 miesięcy': 'min_24',
  'Min. 36 miesięcy': 'min_36',
  Inny: 'other',
};

export function mapTenderRowToContestForm(
  tender: Record<string, unknown>,
  categoryName?: string,
  subcategoryName?: string,
): TenderContestFormData {
  const formal = (tender.formal_requirements as FormalRequirements | null) ?? {
    ...DEFAULT_FORMAL_REQUIREMENTS,
  };
  const selection = parseSelectionCriteria(
    tender.selection_criteria,
    tender.evaluation_criteria,
  );
  const payment = (tender.payment_terms as PaymentTerms | null) ?? { ...DEFAULT_PAYMENT_TERMS };

  const buildingId = (tender.building_id as string) ?? '';
  const submissionDeadline = tender.submission_deadline
    ? new Date(tender.submission_deadline as string)
    : new Date();
  const evaluationDeadline = tender.evaluation_deadline
    ? new Date(tender.evaluation_deadline as string)
    : null;
  const completionDate = tender.completion_date
    ? new Date(tender.completion_date as string)
    : null;

  return {
    title: (tender.title as string) ?? '',
    description: (tender.description as string) ?? '',
    buildingId,
    category: categoryName ?? '',
    subcategory: subcategoryName ?? '',
    submissionDeadline,
    evaluationDeadline,
    completionDate,
    siteVisitType: ((tender.site_visit_type as SiteVisitType) ?? 'not_required'),
    siteVisitNotes: (tender.site_visit_notes as string) ?? '',
    formalRequirements: { ...DEFAULT_FORMAL_REQUIREMENTS, ...formal },
    selectionCriteria: selection,
    warrantyPeriod: REVERSE_WARRANTY[(tender.warranty_period as string) ?? ''] ?? '',
    guaranteePeriod: REVERSE_WARRANTY[(tender.guarantee_period as string) ?? ''] ?? '',
    depositRequired: Boolean(tender.deposit_required),
    depositAmount: tender.wadium != null ? Number(tender.wadium) : null,
    depositInstructions: (tender.deposit_instructions as string) ?? '',
    paymentTerms: payment,
  };
}

/** Clears schedule fields when duplicating a contest for a new publication round. */
export function clearContestFormDates(form: TenderContestFormData): TenderContestFormData {
  return {
    ...form,
    submissionDeadline: new Date(Number.NaN),
    evaluationDeadline: null,
    completionDate: null,
  };
}

export function parseExistingTenderDocuments(
  documents: unknown,
): TenderContestDocumentMeta[] {
  if (!Array.isArray(documents)) return [];
  return documents
    .filter((d): d is Record<string, unknown> => typeof d === 'object' && d !== null)
    .map((d) => ({
      id: String(d.id ?? crypto.randomUUID()),
      name: String(d.name ?? 'dokument'),
      url: String(d.url ?? ''),
      path: String(d.path ?? ''),
      type: (d.type as TenderContestDocumentMeta['type']) ?? 'other',
    }));
}
