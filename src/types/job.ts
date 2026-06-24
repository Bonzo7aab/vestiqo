import type { Budget } from './budget';
import type {
  FormalRequirements,
  PaymentTerms,
  SelectionCriteria,
  SiteVisitType,
  TenderContestDocumentMeta,
} from './tender-contest';

export interface Job {
  // Core identifiers
  id: string;
  postType: 'job' | 'contest';

  /** Workflow status from DB (contests/tenders: active, evaluation, awarded, …) */
  status?: string;
  
  // Basic info
  title: string;
  company: string; // Company name for display
  companyInfo?: {
    id: string;
    logo_url: string | null;
    is_verified: boolean;
  }; // Company details (use companyInfo.id instead of company_id, companyInfo.logo_url instead of company_logo)
  location: string | { city: string; sublocality_level_1?: string }; // Support both string and object formats
  type: string;
  description: string;
  postedTime: string;
  
  // Budget/Financial
  salary: string; // Display string for salary/budget
  budget: Budget; // Consolidated budget object with all budget fields
  
  // Requirements & Skills
  requirements?: string[];
  responsibilities?: string[];
  skills?: string[];
  // Legacy search field (deprecated - use skills instead)
  /** @deprecated Use skills instead */
  searchKeywords?: string[];
  
  // Metrics (grouped)
  metrics: {
    applications: number;
    visits: number;
    bookmarks: number;
  };
  // Legacy metrics fields (deprecated - use metrics object instead)
  /** @deprecated Use metrics.applications instead */
  applications?: number;
  /** @deprecated Use metrics.visits instead */
  visits_count?: number;
  /** @deprecated Use metrics.bookmarks instead */
  bookmarks_count?: number;
  
  // Verification & Priority
  verified: boolean;
  urgency: 'low' | 'medium' | 'high';
  // Legacy urgency field (deprecated - derive from urgency === 'high')
  /** @deprecated Use urgency === 'high' instead */
  urgent?: boolean;
  
  // Categorization
  category: string | { name: string; slug?: string };
  subcategory?: string;
  clientType?: string;
  
  // Trust indicators (grouped)
  trust?: {
    verified: boolean;
    isPremium: boolean;
    hasInsurance: boolean;
    completedJobs: number;
    certificates: string[];
  };
  // Legacy trust fields (deprecated - use trust object instead)
  /** @deprecated Use trust.isPremium instead */
  isPremium?: boolean;
  /** @deprecated Use trust.hasInsurance instead */
  hasInsurance?: boolean;
  /** @deprecated Use trust.completedJobs instead */
  completedJobs?: number;
  /** @deprecated Use trust.certificates instead */
  certificates?: string[];
  // Legacy premium field (deprecated - duplicate of isPremium, use trust.isPremium instead)
  /** @deprecated Use trust.isPremium or isPremium instead */
  premium?: boolean;
  
  // Timeline
  deadline?: string;
  projectDuration?: string;
  
  // Contact info (grouped)
  contact?: {
    person: string;
    phone: string;
    email: string;
  };
  // Legacy contact fields (deprecated - use contact object instead)
  /** @deprecated Use contact.person instead */
  contactPerson?: string;
  /** @deprecated Use contact.phone instead */
  contactPhone?: string;
  /** @deprecated Use contact.email instead */
  contactEmail?: string;
  
  // Building/Property details (grouped)
  building?: {
    type: string;
    year: number;
    surface: string;
    address?: string;
    additionalInfo?: string;
  };
  // Legacy building fields (deprecated - use building object instead)
  /** @deprecated Use building.type instead */
  buildingType?: string;
  /** @deprecated Use building.year instead */
  buildingYear?: number;
  /** @deprecated Use building.surface instead */
  surface?: string;
  /** @deprecated Use building.additionalInfo instead */
  additionalInfo?: string;
  /** @deprecated Use building.address instead */
  address?: string;
  
  // Media
  images?: string[];
  
  // Location coordinates
  lat?: number;
  lng?: number;
  
  // Tender-specific info
  tenderInfo?: TenderInfo;

  /** OPD-53 contest (konkurs) display fields — present when tender was created via contest form */
  contestInfo?: ContestInfo;
}

export interface ContestInfo {
  entityName: string | null;
  entityAddress: string | null;
  documents: TenderContestDocumentMeta[];
  submissionDeadline: string;
  evaluationDeadline: string | null;
  completionDate: string | null;
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

export interface TenderInfo {
  tenderType: string;
  phases: Array<{
    name: string;
    status: 'completed' | 'active' | 'pending';
    deadline: string;
  }>;
  currentPhase: string;
  wadium: string;
  evaluationCriteria: Array<{
    name: string;
    weight: number;
  }>;
  documentsRequired: string[];
  submissionDeadline: string;
  projectDuration: string;
  technicalSpecifications: {
    [key: string]: string | number;
  };
}

export type PostType = 'job' | 'contest';
export type TenderPhaseStatus = 'completed' | 'active' | 'pending';
