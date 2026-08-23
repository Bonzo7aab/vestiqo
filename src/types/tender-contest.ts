export type SiteVisitType = 'not_required' | 'optional' | 'mandatory';

export type WarrantyGuaranteePeriod =
  | 'none'
  | 'min_12'
  | 'min_24'
  | 'min_36'
  | 'other';

export type PaymentTermsMode = 'standard_14' | 'custom';

export interface FormalRequirements {
  insuranceOc?: boolean;
  insuranceOcMinAmount?: number;
  zusUsCertificates?: boolean;
  references?: boolean;
  referencesMinCount?: number;
  referencesYears?: number;
  professionalCertificates?: boolean;
  professionalLicenses?: boolean;
  /** Qualification catalog ids required when professionalLicenses is set. */
  professionalLicenseTypes?: string[];
}

export type SelectionCriterionType = 'price' | 'quality' | 'time' | 'experience' | 'other';

export interface SelectionCriterionItem {
  id: string;
  name: string;
  weight: number;
  type: SelectionCriterionType;
  description?: string;
}

export interface SelectionCriteria {
  items: SelectionCriterionItem[];
}

export interface PaymentTerms {
  mode: PaymentTermsMode;
  customDays?: number;
}

export interface TenderContestDocumentMeta {
  id: string;
  name: string;
  url: string;
  path: string;
  type: 'specification' | 'requirements' | 'drawings' | 'other';
  size?: number;
}

export interface TenderContestFormData {
  title: string;
  description: string;
  managedEntityId: string;
  category: string;
  subcategory: string;
  submissionDeadline: Date;
  evaluationDeadline: Date | null;
  completionDate: Date | null;
  siteVisitType: SiteVisitType;
  siteVisitNotes: string;
  formalRequirements: FormalRequirements;
  selectionCriteria: SelectionCriteria;
  warrantyPeriod: WarrantyGuaranteePeriod | '';
  guaranteePeriod: WarrantyGuaranteePeriod | '';
  depositRequired: boolean;
  depositAmount: number | null;
  depositInstructions: string;
  paymentTerms: PaymentTerms;
}

export const DEFAULT_FORMAL_REQUIREMENTS: FormalRequirements = {
  insuranceOc: false,
  insuranceOcMinAmount: undefined,
  zusUsCertificates: false,
  references: false,
  referencesMinCount: 2,
  referencesYears: 3,
  professionalCertificates: false,
  professionalLicenses: false,
  professionalLicenseTypes: [],
};

export const DEFAULT_SELECTION_CRITERIA_ITEMS: SelectionCriterionItem[] = [
  {
    id: 'price',
    name: 'Cena',
    weight: 80,
    type: 'price',
    description: 'Cena oferty',
  },
  {
    id: 'warranty',
    name: 'Okres gwarancji',
    weight: 20,
    type: 'quality',
    description: 'Okres gwarancji oferowany przez wykonawcę',
  },
];

export const DEFAULT_SELECTION_CRITERIA: SelectionCriteria = {
  items: DEFAULT_SELECTION_CRITERIA_ITEMS.map((item) => ({ ...item })),
};

export function selectionCriteriaTotalWeight(items: SelectionCriterionItem[]): number {
  return items.reduce((sum, item) => sum + item.weight, 0);
}

/** Parses selection_criteria JSONB or legacy { pricePercent, warrantyPercent }. */
export function parseSelectionCriteria(
  raw: unknown,
  evaluationCriteria?: unknown,
): SelectionCriteria {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const record = raw as Record<string, unknown>;
    if (Array.isArray(record.items) && record.items.length > 0) {
      return {
        items: record.items
          .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
          .map((entry, index) => ({
            id: String(entry.id ?? `criterion-${index}`),
            name: String(entry.name ?? ''),
            weight: Number(entry.weight) || 0,
            type: (entry.type as SelectionCriterionType) ?? 'other',
            description: entry.description != null ? String(entry.description) : undefined,
          })),
      };
    }
    if (
      typeof record.pricePercent === 'number' &&
      typeof record.warrantyPercent === 'number'
    ) {
      return {
        items: [
          {
            id: 'price',
            name: 'Cena',
            weight: record.pricePercent,
            type: 'price',
            description: 'Cena oferty',
          },
          {
            id: 'warranty',
            name: 'Okres gwarancji',
            weight: record.warrantyPercent,
            type: 'quality',
            description: 'Okres gwarancji oferowany przez wykonawcę',
          },
        ],
      };
    }
  }

  if (Array.isArray(evaluationCriteria) && evaluationCriteria.length > 0) {
    return {
      items: evaluationCriteria
        .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
        .map((entry, index) => ({
          id: String(entry.id ?? `criterion-${index}`),
          name: String(entry.name ?? ''),
          weight: Number(entry.weight) || 0,
          type: (entry.type as SelectionCriterionType) ?? 'other',
          description: entry.description != null ? String(entry.description) : undefined,
        })),
    };
  }

  return {
    items: DEFAULT_SELECTION_CRITERIA_ITEMS.map((item) => ({ ...item })),
  };
}

export const DEFAULT_PAYMENT_TERMS: PaymentTerms = {
  mode: 'standard_14',
  customDays: undefined,
};

export function createEmptyTenderContestForm(): TenderContestFormData {
  return {
    title: '',
    description: '',
    managedEntityId: '',
    category: '',
    subcategory: '',
    submissionDeadline: new Date(),
    evaluationDeadline: null,
    completionDate: null,
    siteVisitType: 'not_required',
    siteVisitNotes: '',
    formalRequirements: { ...DEFAULT_FORMAL_REQUIREMENTS },
    selectionCriteria: { ...DEFAULT_SELECTION_CRITERIA },
    warrantyPeriod: '',
    guaranteePeriod: '',
    depositRequired: false,
    depositAmount: null,
    depositInstructions: '',
    paymentTerms: { ...DEFAULT_PAYMENT_TERMS },
  };
}
