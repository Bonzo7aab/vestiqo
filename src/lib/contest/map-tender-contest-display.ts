/**
 * Contest (Konkurs) domain helpers for rows stored in DB table `tenders`
 * and offers in `tender_bids`. Legacy table names are intentional — see
 * database/SCHEMA_INVENTORY.md § Legacy naming.
 */
import type { TenderWithCompany } from '../database/jobs';
import type {
  FormalRequirements,
  PaymentTerms,
  SelectionCriteria,
  SiteVisitType,
  TenderContestDocumentMeta,
} from '../../types/tender-contest';
import {
  DEFAULT_FORMAL_REQUIREMENTS,
  DEFAULT_PAYMENT_TERMS,
  parseSelectionCriteria,
} from '../../types/tender-contest';
import { mapTenderRowToContestForm, parseExistingTenderDocuments } from './build-tender-payload';
const SITE_VISIT_LABELS: Record<SiteVisitType, string> = {
  not_required: 'Niewymagana',
  optional: 'Opcjonalna',
  mandatory: 'Obowiązkowa',
};

export function isContestTender(row: Pick<
  TenderWithCompany,
  'managed_entity_id' | 'selection_criteria' | 'formal_requirements'
>): boolean {
  return Boolean(
    row.managed_entity_id || row.selection_criteria || row.formal_requirements,
  );
}

function buildFormalRequirementLines(formal: FormalRequirements): string[] {
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

export function formatPaymentTermsLabel(payment: PaymentTerms): string {
  if (payment.mode === 'standard_14') {
    return '14 dni od daty odbioru';
  }
  const days = payment.customDays ?? 0;
  return days > 0 ? `${days} dni od daty odbioru` : 'Do uzgodnienia';
}

export interface ContestDisplayInfo {
  entityName: string | null;
  entityAddress: string | null;
  documents: TenderContestDocumentMeta[];
  submissionDeadline: string;
  evaluationDeadline: string | null;
  completionDate: string | null;
  publishedAt: string | null;
  siteVisitType: SiteVisitType;
  siteVisitTypeLabel: string;
  siteVisitNotes: string | null;
  formalRequirements: FormalRequirements;
  formalRequirementLines: string[];
  selectionCriteria: SelectionCriteria;
  warrantyPeriod: string | null;
  guaranteePeriod: string | null;
  depositRequired: boolean;
  depositAmount: number | null;
  depositInstructions: string | null;
  paymentTerms: PaymentTerms;
  paymentTermsLabel: string;
}

export function mapTenderRowToContestDisplay(
  tender: TenderWithCompany,
): ContestDisplayInfo {
  const row = tender as unknown as Record<string, unknown>;
  const form = mapTenderRowToContestForm(
    row,
    tender.category?.name,
    tender.subcategory?.name,
  );

  const entity = tender.managed_entity;
  const formal = { ...DEFAULT_FORMAL_REQUIREMENTS, ...form.formalRequirements };
  const payment = form.paymentTerms ?? { ...DEFAULT_PAYMENT_TERMS };
  const documents = parseExistingTenderDocuments(tender.documents);

  const completionDate = tender.completion_date
    ? tender.completion_date.split('T')[0]
    : form.completionDate
      ? form.completionDate.toISOString().split('T')[0]
      : null;

  return {
    entityName: entity?.name ?? null,
    entityAddress: entity?.address ?? tender.address ?? null,
    documents,
    submissionDeadline: tender.submission_deadline,
    evaluationDeadline: tender.evaluation_deadline ?? null,
    completionDate,
    publishedAt: tender.published_at ?? tender.created_at ?? null,
    siteVisitType: form.siteVisitType,
    siteVisitTypeLabel: SITE_VISIT_LABELS[form.siteVisitType],
    siteVisitNotes:
      form.siteVisitType === 'not_required' ? null : form.siteVisitNotes.trim() || null,
    formalRequirements: formal,
    formalRequirementLines: buildFormalRequirementLines(formal),
    selectionCriteria: form.selectionCriteria,
    warrantyPeriod: tender.warranty_period ?? null,
    guaranteePeriod: tender.guarantee_period ?? null,
    depositRequired: form.depositRequired,
    depositAmount: form.depositAmount,
    depositInstructions: form.depositInstructions.trim() || null,
    paymentTerms: payment,
    paymentTermsLabel: formatPaymentTermsLabel(payment),
  };
}
