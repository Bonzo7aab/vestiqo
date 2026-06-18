import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import type { Application } from '../../types/application';
import type { Budget, BudgetInput } from '../../types/budget';
import { budgetFromDatabase, budgetToDatabase, formatBudget } from '../../types/budget';
import {
  resolveCategoryIdsFromFilterKeys,
  resolveSubcategoryIdsFromFilterKeys,
} from '../config/categoryConfig';
import { fetchAllCategories, fetchAllCategoriesWithSubcategories } from './categories';
import { JOB_WORKFLOW_STATUSES, isJobWorkflowStatusRegression } from '../job-workflow-status';
import {
  TENDER_WORKFLOW_STATUSES,
  isTenderWorkflowStatusRegression,
} from '../tender-workflow-status';
import { mapTenderRowToContestDisplay } from '../contest/map-tender-contest-display';
import {
  contestIdColumn,
  contestOffersTable,
  contestsTable,
  ensureContestsSchemaResolved,
  normalizeContestRow,
  normalizeContestRows,
  shouldApplyContestTendersFilter,
} from './schema-compat';

/** Matches contest rows in DB (see opd70_remove_legacy_tenders migration). */
export const CONTEST_TENDERS_OR_FILTER =
  'building_id.not.is.null,selection_criteria.not.is.null,formal_requirements.not.is.null';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyContestTendersFilter(query: any): any {
  return query.or(CONTEST_TENDERS_OR_FILTER);
}

/** Job statuses visible on the public map/listing (accepting or reviewing offers). */
export const PUBLIC_LISTING_JOB_STATUSES = [
  'active',
  'collecting_offers',
  'selecting_offer',
] as const;

export interface JobFilters {
  categories?: string[];
  subcategories?: string[];
  locations?: string[];
  budgetMin?: number;
  budgetMax?: number;
  postType?: 'job' | 'contest' | 'all';
  status?: string;
  sortBy?: 'newest' | 'oldest' | 'budget_low' | 'budget_high' | 'deadline';
  searchQuery?: string;
  limit?: number;
  offset?: number;
  bounds?: { north: number; south: number; east: number; west: number };
  dateAdded?: string[]; // ['today', 'last-week', 'last-month', 'last-3-months', 'last-6-months', 'last-year']
  /** When `contest`, only rows with contest fields (excludes legacy przetargi). */
  tenderScope?: 'contest' | 'all';
}

export interface JobLocation {
  city: string;
  sublocality_level_1?: string;
}

/** Shared shape for createTender / updateTender (legacy wizard + OPD-53 contest). */
export interface TenderUpsertData {
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  location: JobLocation | string;
  estimatedValue: string;
  currency: string;
  submissionDeadline: Date;
  evaluationDeadline?: Date | null;
  requirements: string[];
  evaluationCriteria: Array<Record<string, unknown>>;
  documents?: Array<Record<string, unknown>>;
  isPublic: boolean;
  allowQuestions: boolean;
  questionsDeadline?: Date;
  minimumExperience: number;
  requiredCertificates: string[];
  insuranceRequired: string;
  advancePayment: boolean;
  performanceBond: boolean;
  status?: 'draft' | 'active';
  address?: string;
  latitude?: number;
  longitude?: number;
  projectDuration?: string;
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

function tenderLocationJsonb(location: JobLocation | string): JobLocation {
  if (typeof location === 'string') {
    return { city: location };
  }
  return location;
}

function tenderDocumentsJson(
  documents?: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> | null {
  if (!documents?.length) return null;
  return documents.map((doc) => ({
    id: doc.id,
    name: doc.name,
    type: doc.type,
    url: doc.url,
    path: doc.path,
  }));
}

function tenderDbRowFromUpsert(
  tenderData: TenderUpsertData,
  categoryId: string,
  subcategoryId: string | null,
): Record<string, unknown> {
  const locationJsonb = tenderLocationJsonb(tenderData.location);
  const completionDate =
    tenderData.completionDate instanceof Date
      ? tenderData.completionDate.toISOString().split('T')[0]
      : tenderData.completionDate ?? null;

  return {
    title: tenderData.title,
    description: tenderData.description,
    category_id: categoryId,
    subcategory_id: subcategoryId ?? tenderData.subcategoryId ?? null,
    building_id: tenderData.buildingId ?? null,
    location: locationJsonb,
    address: tenderData.address ?? null,
    latitude: tenderData.latitude ?? null,
    longitude: tenderData.longitude ?? null,
    estimated_value: parseFloat(tenderData.estimatedValue),
    currency: tenderData.currency,
    status: tenderData.status || 'draft',
    submission_deadline: tenderData.submissionDeadline.toISOString(),
    evaluation_deadline: tenderData.evaluationDeadline
      ? tenderData.evaluationDeadline.toISOString()
      : null,
    completion_date: completionDate,
    project_duration: tenderData.projectDuration || null,
    is_public: tenderData.isPublic,
    allow_questions: tenderData.allowQuestions ?? true,
    requirements: tenderData.requirements,
    evaluation_criteria: tenderData.evaluationCriteria,
    documents: tenderDocumentsJson(tenderData.documents),
    site_visit_type: tenderData.siteVisitType ?? null,
    site_visit_notes: tenderData.siteVisitNotes ?? null,
    formal_requirements: tenderData.formalRequirements ?? null,
    selection_criteria: tenderData.selectionCriteria ?? null,
    warranty_period: tenderData.warrantyPeriod ?? null,
    guarantee_period: tenderData.guaranteePeriod ?? null,
    deposit_required: tenderData.depositRequired ?? false,
    deposit_instructions: tenderData.depositInstructions ?? null,
    payment_terms: tenderData.paymentTerms ?? null,
    wadium: tenderData.wadium ?? null,
    published_at: tenderData.status === 'active' ? new Date().toISOString() : null,
  };
}

/**
 * Normalize urgency value to ensure it's one of the valid values
 */
function normalizeUrgency(urgency: string | null | undefined): 'low' | 'medium' | 'high' {
  if (!urgency) {
    return 'medium';
  }
  const normalized = urgency.toLowerCase().trim();
  const result = ['low', 'medium', 'high'].includes(normalized)
    ? normalized as 'low' | 'medium' | 'high'
    : 'medium';
  return result;
}

export interface JobWithCompany {
  id: string;
  title: string;
  description: string;
  location: JobLocation | string; // Support both formats for backward compatibility
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  budget_min: number | null;
  budget_max: number | null;
  budget_type: string | null;
  currency: string;
  // Consolidated budget object (computed from above fields)
  budget?: Budget;
  project_duration: string | null;
  deadline: string | null;
  urgency: string;
  status: string;
  type: string;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  building_type: string | null;
  building_year: number | null;
  surface_area: string | null;
  additional_info: string | null;
  requirements: string[] | null;
  responsibilities: string[] | null;
  skills_required: string[] | null;
  images: string[] | null;
  applications_count: number;
  views_count: number;
  bookmarks_count: number;
  created_at: string;
  published_at: string | null;
  subcategory: string | null;
  company: {
    id: string;
    name: string;
    logo_url: string | null;
    is_verified: boolean;
  } | null;
  category: {
    name: string;
    slug: string;
  } | null;
}

/**
 * Resolve category for tender upsert. Drafts without a chosen category use the first
 * active main category so the row can be saved and completed later.
 */
export async function resolveTenderCategoryIds(
  supabase: SupabaseClient<Database>,
  categoryName: string,
  subcategoryName?: string | null,
  status?: 'draft' | 'active',
): Promise<
  | { categoryId: string; subcategoryId: string | null; error: null }
  | { categoryId: null; subcategoryId: null; error: PostgrestError }
> {
  if (categoryName.trim()) {
    const resolved = await resolveJobFormCategoryIds(supabase, categoryName, subcategoryName);
    if (resolved.error || !resolved.categoryId) {
      return resolved;
    }
    return resolved;
  }

  if (status !== 'draft') {
    return {
      categoryId: null,
      subcategoryId: null,
      error: new Error('Wybierz kategorię') as PostgrestError,
    };
  }

  const { data: categories, error: categoriesError } = await fetchAllCategories(supabase);
  if (categoriesError || !categories?.length) {
    return {
      categoryId: null,
      subcategoryId: null,
      error: new Error('Brak kategorii w systemie') as PostgrestError,
    };
  }

  return { categoryId: categories[0].id, subcategoryId: null, error: null };
}

/**
 * Resolve main category_id and optional subcategory_id from Polish form labels.
 * Shared by createJob and updateManagerJob.
 */
export async function resolveJobFormCategoryIds(
  supabase: SupabaseClient<Database>,
  categoryName: string,
  subcategoryName?: string | null,
): Promise<
  | { categoryId: string; subcategoryId: string | null; error: null }
  | { categoryId: null; subcategoryId: null; error: PostgrestError }
> {
  const categoryMapping: Record<string, string> = {
    'Utrzymanie Czystości i Zieleni': 'Usługi Sprzątające',
    'Roboty Remontowo-Budowlane': 'Remonty i Budownictwo',
    'Instalacje i systemy': 'Instalacje Techniczne',
    'Utrzymanie techniczne i konserwacja': 'Zarządzanie Nieruchomościami',
    'Specjalistyczne usługi': 'Zarządzanie Nieruchomościami',
    'Inne': 'Zarządzanie Nieruchomościami',
  };

  const searchCategoryName = categoryMapping[categoryName] || categoryName;

  let { data: categoryData, error: categoryError } = await supabase
    .from('job_categories')
    .select('id, name')
    .ilike('name', searchCategoryName)
    .eq('is_active', true)
    .maybeSingle();

  if (categoryError || !categoryData) {
    const { data: partialMatch, error: partialError } = await supabase
      .from('job_categories')
      .select('id, name')
      .ilike('name', `%${searchCategoryName}%`)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!partialError && partialMatch) {
      categoryData = partialMatch;
      categoryError = null;
    }
  }

  if (categoryError || !categoryData) {
    const { data: originalMatch, error: originalError } = await supabase
      .from('job_categories')
      .select('id, name')
      .ilike('name', `%${categoryName}%`)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!originalError && originalMatch) {
      categoryData = originalMatch;
      categoryError = null;
    }
  }

  if (categoryError || !categoryData) {
    const { data: allCategories } = await supabase
      .from('job_categories')
      .select('name, slug')
      .eq('is_active', true)
      .limit(20);

    return {
      categoryId: null,
      subcategoryId: null,
      error: new Error(
        `Category "${categoryName}" not found. Available categories: ${allCategories?.map((c: { name: string }) => c.name).join(', ') || 'none'}`,
      ) as PostgrestError,
    };
  }

  const categoryId = categoryData.id;
  let subcategoryId: string | null = null;

  if (subcategoryName && subcategoryName.trim()) {
    const subTrim = subcategoryName.trim();

    let { data: subcategoryData, error: subcategoryError } = await supabase
      .from('job_categories')
      .select('id, name')
      .eq('parent_id', categoryId)
      .ilike('name', subTrim)
      .eq('is_active', true)
      .maybeSingle();

    if (subcategoryError || !subcategoryData) {
      const { data: partialSubcategory, error: partialSubcategoryError } = await supabase
        .from('job_categories')
        .select('id, name')
        .eq('parent_id', categoryId)
        .ilike('name', `%${subTrim}%`)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (!partialSubcategoryError && partialSubcategory) {
        subcategoryData = partialSubcategory;
        subcategoryError = null;
      }
    }

    if (!subcategoryError && subcategoryData) {
      subcategoryId = subcategoryData.id;
    }
  }

  return { categoryId, subcategoryId, error: null };
}

/**
 * Location for jobs table: prefer selected building (company-scoped), else company HQ city.
 */
export async function resolveJobLocationFromBuildingOrCompany(
  supabase: SupabaseClient<Database>,
  companyId: string,
  buildingId: string | null | undefined,
  companyCity: string | null | undefined,
  companyAddress: string | null | undefined,
): Promise<{ city: string; address: string | null; latitude: number | null; longitude: number | null }> {
  if (buildingId) {
    const { data: b, error } = await supabase
      .from('buildings')
      .select('city, street_address, latitude, longitude')
      .eq('id', buildingId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (!error && b) {
      return {
        city: b.city || '—',
        address: b.street_address || null,
        latitude: b.latitude != null ? Number(b.latitude) : null,
        longitude: b.longitude != null ? Number(b.longitude) : null,
      };
    }
  }

  const city = (companyCity && companyCity.trim()) || 'Warszawa';
  return {
    city,
    address: companyAddress?.trim() || null,
    latitude: null,
    longitude: null,
  };
}

/**
 * Update an existing job owned by the manager. Allowed only for draft/active jobs with zero applications.
 */
export async function updateManagerJob(
  supabase: SupabaseClient<Database>,
  params: {
    jobId: string;
    managerId: string;
    companyId: string;
    title: string;
    description: string;
    category: string;
    subcategory?: string;
    buildingId?: string | null;
    budgetMin?: number | null;
    budgetMax?: number | null;
    budgetType?: 'fixed' | 'hourly' | 'negotiable' | 'range';
    currency?: string;
    deadline?: Date | string | null;
    urgency?: 'low' | 'medium' | 'high';
    type?: 'regular' | 'urgent' | 'premium';
    isPublic?: boolean;
    requirements?: string[];
    additionalInfo?: string | null;
    images?: string[] | null;
  },
): Promise<{ data: JobWithCompany | null; error: PostgrestError | null }> {
  try {
    const jobId = params.jobId?.trim();
    if (!jobId) {
      return { data: null, error: new Error('Missing job id') as PostgrestError };
    }

    const { data: existing, error: fetchErr } = await supabase
      .from('jobs')
      .select('id, manager_id, company_id, status, published_at')
      .eq('id', jobId)
      .maybeSingle();

    if (fetchErr || !existing) {
      return { data: null, error: fetchErr || (new Error('Job not found') as PostgrestError) };
    }

    if (existing.manager_id !== params.managerId) {
      return { data: null, error: new Error('Brak uprawnień do edycji tego zgłoszenia') as PostgrestError };
    }

    if (existing.company_id !== params.companyId) {
      return { data: null, error: new Error('Zgłoszenie nie należy do tej firmy') as PostgrestError };
    }

    const status = existing.status as string;
    const editableStatus =
      status === 'active' ? 'collecting_offers' : status;
    if (editableStatus !== 'draft' && editableStatus !== 'collecting_offers') {
      return {
        data: null,
        error: new Error(
          'Edycja jest możliwa tylko dla zgłoszeń ze statusem szkic lub zbieranie ofert',
        ) as PostgrestError,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error: countErr } = await (supabase as any)
      .from('job_applications')
      .select('*', { count: 'exact', head: true })
      .eq('job_id', jobId);

    if (countErr) {
      return { data: null, error: countErr as PostgrestError };
    }

    if (count !== null && count > 0) {
      return {
        data: null,
        error: new Error('Nie można edytować zgłoszenia po otrzymaniu ofert') as PostgrestError,
      };
    }

    const resolved = await resolveJobFormCategoryIds(supabase, params.category, params.subcategory);
    if (resolved.error || !resolved.categoryId) {
      return { data: null, error: resolved.error };
    }

    const { fetchUserPrimaryCompany } = await import('./companies');
    const { data: companyRow } = await fetchUserPrimaryCompany(supabase, params.managerId);
    const loc = await resolveJobLocationFromBuildingOrCompany(
      supabase,
      params.companyId,
      params.buildingId ?? null,
      companyRow?.city ?? null,
      companyRow?.address ?? null,
    );

    let deadlineDate: string | null = null;
    if (params.deadline) {
      if (typeof params.deadline === 'string') {
        deadlineDate = params.deadline;
      } else {
        deadlineDate = params.deadline.toISOString().split('T')[0];
      }
    }

    const budgetInput: BudgetInput = {
      min: params.budgetMin,
      max: params.budgetMax,
      type: params.budgetType || 'fixed',
      currency: params.currency || 'PLN',
    };
    const budgetDb = budgetToDatabase(budgetInput);

    const locationJsonb = {
      city: loc.city,
    };

    const updatePayload: Record<string, unknown> = {
      title: params.title,
      description: params.description,
      category_id: resolved.categoryId,
      subcategory_id: resolved.subcategoryId,
      building_id: params.buildingId ?? null,
      location: locationJsonb,
      address: loc.address,
      latitude: loc.latitude,
      longitude: loc.longitude,
      budget_min: budgetDb.budget_min,
      budget_max: budgetDb.budget_max,
      budget_type: budgetDb.budget_type,
      currency: budgetDb.currency,
      deadline: deadlineDate,
      urgency: params.urgency ?? 'medium',
      type: params.type ?? 'regular',
      is_public: params.isPublic !== undefined ? params.isPublic : true,
      requirements: params.requirements ?? null,
      additional_info: params.additionalInfo ?? null,
      images: params.images ?? null,
      updated_at: new Date().toISOString(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedJob, error: updateError } = await (supabase as any)
      .from('jobs')
      .update(updatePayload)
      .eq('id', jobId)
      .eq('manager_id', params.managerId)
      .select(
        `
        *,
        company:companies!jobs_company_id_fkey (
          id,
          name,
          logo_url,
          is_verified
        ),
        category:job_categories!jobs_category_id_fkey (
          name,
          slug
        ),
        subcategory:job_categories!jobs_subcategory_id_fkey (
          name,
          slug
        )
      `,
      )
      .single();

    if (updateError) {
      console.error('Error updating job:', updateError);
      return { data: null, error: updateError };
    }

    return { data: updatedJob as JobWithCompany, error: null };
  } catch (err) {
    console.error('Error in updateManagerJob:', err);
    return { data: null, error: err as PostgrestError };
  }
}

export async function updateManagerJobWorkflowStatus(
  supabase: SupabaseClient<Database>,
  params: {
    jobId: string;
    managerId: string;
    companyId: string;
    status: string;
  },
): Promise<{ error: PostgrestError | null }> {
  const allowed = new Set<string>([...JOB_WORKFLOW_STATUSES, 'draft']);

  if (!allowed.has(params.status)) {
    return {
      error: new Error('Nieprawidłowy status zgłoszenia') as PostgrestError,
    };
  }

  try {
    const jobId = params.jobId.trim();
    const { data: existing, error: fetchErr } = await supabase
      .from('jobs')
      .select('id, manager_id, company_id, status, published_at')
      .eq('id', jobId)
      .maybeSingle();

    if (fetchErr || !existing) {
      return { error: fetchErr || (new Error('Nie znaleziono zgłoszenia') as PostgrestError) };
    }

    if (existing.manager_id !== params.managerId) {
      return { error: new Error('Brak uprawnień') as PostgrestError };
    }

    if (existing.company_id !== params.companyId) {
      return { error: new Error('Zgłoszenie nie należy do tej firmy') as PostgrestError };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: acceptedApp } = await (supabase as any)
      .from('job_applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('status', 'accepted')
      .maybeSingle();

    const hasSelectedOffer = Boolean(acceptedApp);

    if (
      isJobWorkflowStatusRegression(String(existing.status), params.status, hasSelectedOffer)
    ) {
      return {
        error: new Error(
          hasSelectedOffer
            ? 'Po wyborze oferty nie można cofnąć statusu zgłoszenia'
            : 'Nie można cofnąć statusu zgłoszenia',
        ) as PostgrestError,
      };
    }

    const updatePayload: Record<string, unknown> = {
      status: params.status,
      updated_at: new Date().toISOString(),
    };

    if (params.status !== 'draft' && existing.status === 'draft' && !existing.published_at) {
      updatePayload.published_at = new Date().toISOString();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('jobs')
      .update(updatePayload)
      .eq('id', jobId)
      .eq('manager_id', params.managerId);

    return { error: updateError };
  } catch (err) {
    console.error('Error in updateManagerJobWorkflowStatus:', err);
    return { error: err as PostgrestError };
  }
}

export async function updateManagerTenderWorkflowStatus(
  supabase: SupabaseClient<Database>,
  params: {
    tenderId: string;
    managerId: string;
    companyId: string;
    status: string;
  },
): Promise<{ error: PostgrestError | null }> {
  const allowed = new Set<string>([...TENDER_WORKFLOW_STATUSES, 'draft', 'paused', 'cancelled']);

  if (!allowed.has(params.status)) {
    return {
      error: new Error('Nieprawidłowy status przetargu') as PostgrestError,
    };
  }

  try {
    await ensureContestsSchemaResolved(supabase);
    const tenderId = params.tenderId.trim();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: fetchErr } = await (supabase as any)
      .from(contestsTable())
      .select('id, manager_id, company_id, status')
      .eq('id', tenderId)
      .maybeSingle();

    if (fetchErr || !existing) {
      return { error: fetchErr || (new Error('Nie znaleziono przetargu') as PostgrestError) };
    }

    if (existing.manager_id !== params.managerId) {
      return { error: new Error('Brak uprawnień') as PostgrestError };
    }

    if (existing.company_id !== params.companyId) {
      return { error: new Error('Przetarg nie należy do tej firmy') as PostgrestError };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: acceptedBid } = await (supabase as any)
      .from(contestOffersTable())
      .select('id')
      .eq(contestIdColumn(), tenderId)
      .eq('status', 'accepted')
      .maybeSingle();

    const hasSelectedOffer = Boolean(acceptedBid);

    if (
      isTenderWorkflowStatusRegression(String(existing.status), params.status, hasSelectedOffer)
    ) {
      return {
        error: new Error(
          hasSelectedOffer
            ? 'Po wyborze oferty nie można cofnąć statusu przetargu'
            : 'Nie można cofnąć statusu przetargu',
        ) as PostgrestError,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from(contestsTable())
      .update({
        status: params.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenderId)
      .eq('manager_id', params.managerId);

    return { error: updateError };
  } catch (err) {
    console.error('Error in updateManagerTenderWorkflowStatus:', err);
    return { error: err as PostgrestError };
  }
}

// Helper types for tables not yet in Database type
interface JobApplicationRow {
  id: string;
  job_id: string;
  contractor_id: string;
  company_id: string | null;
  status: string;
  [key: string]: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface TenderRow {
  id: string;
  title: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  estimated_value: number;
  currency: string;
  status: string;
  submission_deadline: string;
  evaluation_deadline: string | null;
  views_count: number;
  offers_count: number;
  [key: string]: unknown;
}

interface TenderBidRow {
  id: string;
  contest_id: string;
  contractor_id: string;
  company_id: string | null;
  status: string;
  [key: string]: unknown;
}

export interface TenderWithCompany {
  id: string;
  title: string;
  description: string;
  location: JobLocation | string; // Support both formats for backward compatibility
  latitude: number | null;
  longitude: number | null;
  estimated_value: number;
  currency: string;
  status: string;
  submission_deadline: string;
  evaluation_deadline: string | null;
  project_duration: string | null;
  is_public: boolean;
  requirements: string[] | null;
  evaluation_criteria: Record<string, unknown> | null;
  documents?: Array<Record<string, unknown>> | null;
  phases: Record<string, unknown> | null;
  current_phase: string | null;
  wadium: number | null;
  building_id?: string | null;
  completion_date?: string | null;
  site_visit_type?: string | null;
  site_visit_notes?: string | null;
  formal_requirements?: Record<string, unknown> | null;
  selection_criteria?: Record<string, unknown> | null;
  warranty_period?: string | null;
  guarantee_period?: string | null;
  deposit_required?: boolean | null;
  deposit_instructions?: string | null;
  payment_terms?: Record<string, unknown> | null;
  allow_questions?: boolean | null;
  offers_count: number;
  views_count: number;
  created_at: string;
  published_at: string | null;
  company: {
    id: string;
    name: string;
    logo_url: string | null;
    is_verified: boolean;
  } | null;
  category: {
    name: string;
    slug: string;
  } | null;
  subcategory?: {
    name: string;
    slug: string;
  } | null;
  building?: {
    id: string;
    name: string;
    street_address: string | null;
    city: string | null;
  } | null;
  address?: string | null;
}

/**
 * Fetch jobs from the database with optional filters
 */
export async function fetchJobs(
  supabase: SupabaseClient<Database>,
  filters: JobFilters = {}
): Promise<{ data: JobWithCompany[] | null; error: PostgrestError | null }> {
  try {
    let query = supabase
      .from('jobs')
      .select(`
        *,
        company:companies!jobs_company_id_fkey (
          id,
          name,
          logo_url,
          is_verified
        ),
        category:job_categories!jobs_category_id_fkey (
          name,
          slug
        ),
        subcategory:job_categories!jobs_subcategory_id_fkey (
          name,
          slug
        )
      `)
      .eq('is_public', true);

    if (!filters.status || filters.status === 'all' || filters.status === 'active') {
      query = query.in('status', [...PUBLIC_LISTING_JOB_STATUSES]);
    } else {
      query = query.eq(
        'status',
        filters.status as Database['public']['Tables']['jobs']['Row']['status'],
      );
    }

    // Apply category and subcategory filters
    // Jobs have category_id = main category, subcategory_id = subcategory (FK to job_categories)
    if (filters.categories && filters.categories.length > 0 || filters.subcategories && filters.subcategories.length > 0) {
      const { data: allCategories } = await fetchAllCategoriesWithSubcategories(supabase);
      const mainCategoryIds: string[] = [];
      const subcategoryIds: string[] = [];

      if (allCategories) {
        if (filters.categories && filters.categories.length > 0) {
          mainCategoryIds.push(
            ...resolveCategoryIdsFromFilterKeys(allCategories, filters.categories),
          );
        }

        if (filters.subcategories && filters.subcategories.length > 0) {
          subcategoryIds.push(
            ...resolveSubcategoryIdsFromFilterKeys(allCategories, filters.subcategories),
          );
        }
      }

      // Filter by main category (category_id)
      if (mainCategoryIds.length > 0) {
        query = query.in('category_id', mainCategoryIds);
      }
      // Filter by subcategory (subcategory_id)
      if (subcategoryIds.length > 0) {
        query = query.in('subcategory_id', subcategoryIds);
      }
    }

    if (filters.locations && filters.locations.length > 0) {
      // Filter by city in JSONB location object
      query = query.or(
        filters.locations.map(city => `location->>'city'.eq.${city}`).join(',')
      );
    }

    if (filters.budgetMin !== undefined) {
      query = query.gte('budget_min', filters.budgetMin);
    }

    if (filters.budgetMax !== undefined) {
      query = query.lte('budget_max', filters.budgetMax);
    }

    if (filters.searchQuery) {
      query = query.or(
        `title.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`
      );
    }

    // Apply date added filtering (created_at)
    if (filters.dateAdded && filters.dateAdded.length > 0) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      todayStart.setHours(0, 0, 0, 0);
      
      // Calculate the earliest date from all selected filters
      let earliestDate: Date | null = null;
      
      for (const dateFilter of filters.dateAdded) {
        let filterStartDate: Date;
        
        switch (dateFilter) {
          case 'today':
            filterStartDate = new Date(todayStart);
            break;
          case 'last-week':
            // Last 7 days
            filterStartDate = new Date(todayStart);
            filterStartDate.setTime(filterStartDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'last-month':
            // Last 30 days (more reliable than setMonth)
            filterStartDate = new Date(todayStart);
            filterStartDate.setTime(filterStartDate.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'last-3-months':
            // Last 90 days
            filterStartDate = new Date(todayStart);
            filterStartDate.setTime(filterStartDate.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case 'last-6-months':
            // Last 180 days
            filterStartDate = new Date(todayStart);
            filterStartDate.setTime(filterStartDate.getTime() - 180 * 24 * 60 * 60 * 1000);
            break;
          case 'last-year':
            // Last 365 days
            filterStartDate = new Date(todayStart);
            filterStartDate.setTime(filterStartDate.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            continue;
        }
        
        // Use the earliest date (most inclusive filter)
        if (!earliestDate || filterStartDate < earliestDate) {
          earliestDate = filterStartDate;
        }
      }
      
      // Apply the date filter - jobs created_at >= earliestDate
      if (earliestDate) {
        query = query.gte('created_at', earliestDate.toISOString());
      }
    }

    // Apply bounds filtering (geographic bounds)
    if (filters.bounds) {
      query = query
        .gte('latitude', filters.bounds.south)
        .lte('latitude', filters.bounds.north)
        .gte('longitude', filters.bounds.west)
        .lte('longitude', filters.bounds.east);
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'budget_low':
        query = query.order('budget_min', { ascending: true, nullsFirst: false });
        break;
      case 'budget_high':
        query = query.order('budget_max', { ascending: false, nullsFirst: false });
        break;
      case 'deadline':
        query = query.order('deadline', { ascending: true, nullsFirst: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    // Calculate applications_count dynamically if not already accurate
    if (data && data.length > 0) {
      const jobIds = data.map((job) => job.id);
      
      // Fetch counts for all jobs at once
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: countsData, error: countsError } = await (supabase as any)
        .from('job_applications')
        .select('job_id')
        .in('job_id', jobIds) as { data: JobApplicationRow[] | null; error: PostgrestError | null };

      if (!countsError && countsData) {
        // Count applications per job
        const countsMap: { [key: string]: number } = {};
        countsData?.forEach((app: JobApplicationRow) => {
          countsMap[app.job_id] = (countsMap[app.job_id] || 0) + 1;
        });

        // Update applications_count for each job
        data.forEach((job) => {
          job.applications_count = countsMap[job.id] || 0;
        });
      }
    }

    return { data: data as unknown as JobWithCompany[], error };
  } catch (err) {
    console.error('Error fetching jobs:', err);
    return { data: null, error: err };
  }
}

/**
 * Fetch tenders from the database with optional filters
 */
export async function fetchTenders(
  supabase: SupabaseClient<Database>,
  filters: JobFilters = {},
  managerId?: string // If provided, include manager's drafts even if not public
): Promise<{ data: TenderWithCompany[] | null; error: PostgrestError | null }> {
  try {
    await ensureContestsSchemaResolved(supabase);

    // Type assertion needed as tenders table may not be in generated types yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from(contestsTable())
      .select(`
        *,
        company:companies!tenders_company_id_fkey (
          id,
          name,
          logo_url,
          is_verified
        ),
        category:job_categories!tenders_category_id_fkey (
          name,
          slug
        ),
        subcategory:job_categories!tenders_subcategory_id_fkey (
          name,
          slug
        )
      `);

    if (shouldApplyContestTendersFilter(filters.tenderScope)) {
      query = applyContestTendersFilter(query);
    }

    // Apply status filter
    // Only filter by status if explicitly set and not 'all'
    // If managerId is provided, RLS policies will allow them to see their own tenders regardless of status
    if (filters.status && filters.status !== 'all') {
      query = query.eq(
        'status',
        filters.status as Database['public']['Tables']['jobs']['Row']['status'],
      );
    }
    // If no status filter and no managerId, default to active (public view)
    else if (!filters.status && !managerId) {
      query = query.eq('status', 'active');
    }

    // For public tenders, only show public ones
    // For managers viewing their own tenders, show all (including drafts)
    if (managerId) {
      // Manager can see their own tenders regardless of public status
      // Filter by manager_id to get manager's contests (RLS will handle permissions)
      query = query.eq('manager_id', managerId);
    } else {
      // Public view - only show public tenders
      query = query.eq('is_public', true);
    }

    // Apply filters (using any to avoid type issues with tenders table)
    if (filters.categories && filters.categories.length > 0) {
      query = query.in('category_id', filters.categories);
    }

    if (filters.locations && filters.locations.length > 0) {
      query = query.in('location', filters.locations);
    }

    if (filters.searchQuery) {
      query = query.or(
        `title.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`
      );
    }

    // Apply date added filtering (created_at)
    if (filters.dateAdded && filters.dateAdded.length > 0) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      todayStart.setHours(0, 0, 0, 0);
      
      // Calculate the earliest date from all selected filters
      let earliestDate: Date | null = null;
      
      for (const dateFilter of filters.dateAdded) {
        let filterStartDate: Date;
        
        switch (dateFilter) {
          case 'today':
            filterStartDate = new Date(todayStart);
            break;
          case 'last-week':
            // Last 7 days
            filterStartDate = new Date(todayStart);
            filterStartDate.setTime(filterStartDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'last-month':
            // Last 30 days (more reliable than setMonth)
            filterStartDate = new Date(todayStart);
            filterStartDate.setTime(filterStartDate.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'last-3-months':
            // Last 90 days
            filterStartDate = new Date(todayStart);
            filterStartDate.setTime(filterStartDate.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case 'last-6-months':
            // Last 180 days
            filterStartDate = new Date(todayStart);
            filterStartDate.setTime(filterStartDate.getTime() - 180 * 24 * 60 * 60 * 1000);
            break;
          case 'last-year':
            // Last 365 days
            filterStartDate = new Date(todayStart);
            filterStartDate.setTime(filterStartDate.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            continue;
        }
        
        // Use the earliest date (most inclusive filter)
        if (!earliestDate || filterStartDate < earliestDate) {
          earliestDate = filterStartDate;
        }
      }
      
      // Apply the date filter - tenders created_at >= earliestDate
      if (earliestDate) {
        query = query.gte('created_at', earliestDate.toISOString());
      }
    }

    // Apply bounds filtering (geographic bounds)
    if (filters.bounds) {
      query = query
        .gte('latitude', filters.bounds.south)
        .lte('latitude', filters.bounds.north)
        .gte('longitude', filters.bounds.west)
        .lte('longitude', filters.bounds.east);
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'deadline':
        query = query.order('submission_deadline', { ascending: true });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error fetching tenders:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error: error
      });
      return { data: null, error };
    }

    // Calculate offers_count dynamically if not already accurate
    if (data && data.length > 0) {
      const tenderIds = (data || []).map((tender: TenderWithCompany) => tender.id);
      
      // Fetch counts for all tenders at once
      const contestIdField = contestIdColumn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: countsData, error: countsError } = await (supabase as any)
        .from(contestOffersTable())
        .select(contestIdField)
        .in(contestIdField, tenderIds)
        .neq('status', 'draft')
        .neq('status', 'cancelled') as { data: TenderBidRow[] | null; error: PostgrestError | null };

      if (!countsError && countsData) {
        // Count bids per tender
        const countsMap: { [key: string]: number } = {};
        countsData?.forEach((bid: TenderBidRow) => {
          const parentId = bid[contestIdField as keyof TenderBidRow] as string;
          countsMap[parentId] = (countsMap[parentId] || 0) + 1;
        });

        // Update offers_count for each tender
        data.forEach((tender: TenderWithCompany) => {
          (tender as TenderWithCompany & { offers_count: number }).offers_count = countsMap[tender.id] || 0;
        });
      }
    }

    return { data: normalizeContestRows(data as Record<string, unknown>[]) as unknown as TenderWithCompany[], error };
  } catch (err) {
    console.error('Exception fetching tenders:', err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { data: null, error: new Error(errorMessage) as PostgrestError };
  }
}

/**
 * Fetch public browse listings (contests only — no legacy jobs or przetargi).
 */
export async function fetchJobsAndTenders(
  supabase: SupabaseClient<Database>,
  filters: JobFilters = {}
) {
  const tendersResult = await fetchTenders(supabase, {
    ...filters,
    tenderScope: 'contest',
  });

  if (tendersResult.error) {
    return {
      data: null,
      error: tendersResult.error,
    };
  }

  const contests = (tendersResult.data || []).map((tender) => {
    const locationData =
      typeof tender.location === 'string'
        ? { city: tender.location }
        : tender.location || { city: 'Unknown' };

    const contestInfo = mapTenderRowToContestDisplay(tender);

    return {
      id: tender.id,
      title: tender.title,
      description: tender.description,
      company: tender.company?.name || 'Unknown',
      companyInfo: tender.company
        ? {
            id: tender.company.id,
            logo_url: tender.company.logo_url,
            is_verified: tender.company.is_verified,
          }
        : undefined,
      location: locationData,
      type: 'Konkurs',
      postType: 'contest' as const,
      status: tender.status,
      salary: `${tender.estimated_value} ${tender.currency}`,
      budget: `${tender.estimated_value} ${tender.currency}`,
      category: tender.category
        ? { name: tender.category.name, slug: tender.category.slug }
        : 'Inne',
      subcategory: tender.subcategory?.name,
      deadline: tender.submission_deadline,
      urgency: 'medium' as const,
      metrics: {
        applications: tender.offers_count,
        visits: tender.views_count || 0,
        bookmarks: 0,
      },
      applications: tender.offers_count,
      visits_count: tender.views_count || 0,
      bookmarks_count: 0,
      verified: tender.company?.is_verified || false,
      urgent: false,
      premium: false,
      postedTime: getTimeAgo(tender.created_at),
      created_at: tender.created_at,
      lat: ensureValidCoordinates(
        tender.latitude,
        tender.longitude,
        locationData.city || '',
        tender.id,
      )?.lat,
      lng: ensureValidCoordinates(
        tender.latitude,
        tender.longitude,
        locationData.city || '',
        tender.id,
      )?.lng,
      clientType: mapCompanyTypeToClientType(undefined),
      contestInfo,
      tenderInfo: contestInfo
        ? {
            tenderType: 'Konkurs ofert',
            phases: tender.phases || [],
            currentPhase: tender.current_phase || 'Składanie ofert',
            wadium: tender.wadium ? `${tender.wadium} ${tender.currency}` : '0 PLN',
            evaluationCriteria: tender.evaluation_criteria || [],
            documentsRequired: tender.requirements || [],
            submissionDeadline: tender.submission_deadline,
            projectDuration: tender.project_duration || 'Do uzgodnienia',
          }
        : undefined,
    };
  });

  const sorted = [...contests];
  if (filters.sortBy === 'newest' || !filters.sortBy) {
    sorted.sort(
      (a, b) => new Date(b.postedTime).getTime() - new Date(a.postedTime).getTime(),
    );
  }

  return { data: sorted, error: null };
}

/** Treat as “no row” / invalid id — do not log as application error */
function isBenignJobOrTenderLookupError(error: PostgrestError | null | undefined): boolean {
  if (!error) return false;
  const code = String((error as PostgrestError).code ?? '');
  const msg = String(error.message ?? '').toLowerCase();
  if (code === 'PGRST116') return true;
  if (msg.includes('0 rows') || msg.includes('single json object')) return true;
  if (code === '22P02' || msg.includes('invalid input syntax for type uuid')) return true;
  return false;
}

/**
 * Fetch a single job by ID
 */
export async function fetchJobById(
  supabase: SupabaseClient<Database>,
  jobId: string
): Promise<{ data: JobWithCompany | null; error: PostgrestError | null }> {
  const id = jobId?.trim();
  if (!id) {
    return { data: null, error: null };
  }
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        company:companies!jobs_company_id_fkey (
          id,
          name,
          logo_url,
          is_verified
        ),
        category:job_categories!jobs_category_id_fkey (
          name,
          slug
        ),
        subcategory:job_categories!jobs_subcategory_id_fkey (
          name,
          slug
        )
      `)
      .eq('id', id)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid throwing on 0 rows

    // Handle "not found" error (PGRST116) as a normal case, not an error
    if (error) {
      // Check for PGRST116 in multiple ways since error structure can vary
      const errorCode = (error as PostgrestError).code || error?.code;
      if (
        errorCode === 'PGRST116' ||
        error.message?.includes('0 rows') ||
        error.message?.includes('single JSON object') ||
        isBenignJobOrTenderLookupError(error as PostgrestError)
      ) {
        // Job not found - this is expected, not an error
        return { data: null, error: null };
      }
      const e = error as PostgrestError;
      console.error('Error fetching job:', { message: e.message, code: e.code, details: e.details, hint: e.hint });
      return { data: null, error };
    }

    // If no data, job doesn't exist
    if (!data) {
      return { data: null, error: null };
    }

    // Calculate applications_count dynamically if job exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error: countsError } = await (supabase as any)
      .from('job_applications')
      .select('*', { count: 'exact', head: true })
      .eq('job_id', id);

    if (!countsError && count !== null) {
      data.applications_count = count;
    }

    return { data: data as unknown as JobWithCompany, error: null };
  } catch (err) {
    const error = err as PostgrestError | Error;
    // Handle "not found" error (PGRST116) as a normal case
    const errorCode = (error as PostgrestError)?.code || ((error as unknown as { error?: { code?: string } })?.error?.code);
    if (
      errorCode === 'PGRST116' ||
      error?.message?.includes('0 rows') ||
      error?.message?.includes('single JSON object') ||
      isBenignJobOrTenderLookupError(error as PostgrestError)
    ) {
      return { data: null, error: null };
    }
    const e = error as PostgrestError;
    console.error('Error fetching job:', { message: e.message, code: e.code, details: e.details, hint: e.hint });
    return { data: null, error: err };
  }
}

/**
 * Fetch a single tender by ID
 */
export async function fetchTenderById(
  supabase: SupabaseClient<Database>,
  tenderId: string
): Promise<{ data: TenderWithCompany | null; error: PostgrestError | null }> {
  const id = tenderId?.trim();
  if (!id) {
    return { data: null, error: null };
  }
  try {
    await ensureContestsSchemaResolved(supabase);

    // Type assertion needed as tenders table may not be in generated types yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (supabase as any)
      .from(contestsTable())
      .select(`
        *,
        company:companies!tenders_company_id_fkey (
          id,
          name,
          logo_url,
          is_verified
        ),
        category:job_categories!tenders_category_id_fkey (
          name,
          slug
        ),
        subcategory:job_categories!tenders_subcategory_id_fkey (
          name,
          slug
        ),
        building:buildings!tenders_building_id_fkey (
          id,
          name,
          street_address,
          city
        )
      `)
      .eq('id', id)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid throwing on 0 rows

    // Handle "not found" error (PGRST116) as a normal case, not an error
    if (result.error) {
      // Check for PGRST116 in multiple ways since error structure can vary
      const errorCode = result.error.code || result.error?.code;
      if (
        errorCode === 'PGRST116' ||
        result.error.message?.includes('0 rows') ||
        result.error.message?.includes('single JSON object') ||
        isBenignJobOrTenderLookupError(result.error as PostgrestError)
      ) {
        // Tender not found - this is expected, not an error
        return { data: null, error: null };
      }
      const e = result.error as PostgrestError;
      console.error('Error fetching tender:', { message: e.message, code: e.code, details: e.details, hint: e.hint });
      return { data: null, error: result.error };
    }

    // If no data, tender doesn't exist
    if (!result.data) {
      return { data: null, error: null };
    }

    // Calculate offers_count dynamically if tender exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error: countsError } = await (supabase as any)
      .from(contestOffersTable())
      .select('*', { count: 'exact', head: true })
      .eq(contestIdColumn(), id)
      .neq('status', 'draft')
      .neq('status', 'cancelled');

    if (!countsError && count !== null && result.data) {
      (result.data as unknown as { offers_count?: number }).offers_count = count;
    }

    return {
      data: normalizeContestRow(result.data as Record<string, unknown>) as unknown as TenderWithCompany,
      error: null,
    };
  } catch (err) {
    const error = err as PostgrestError | Error;
    // Handle "not found" error (PGRST116) as a normal case
    const errorCode = (error as PostgrestError)?.code || ((error as unknown as { error?: { code?: string } })?.error?.code);
    if (
      errorCode === 'PGRST116' ||
      error?.message?.includes('0 rows') ||
      error?.message?.includes('single JSON object') ||
      isBenignJobOrTenderLookupError(error as PostgrestError)
    ) {
      return { data: null, error: null };
    }
    const e = error as PostgrestError;
    console.error('Error fetching tender:', { message: e.message, code: e.code, details: e.details, hint: e.hint });
    return { data: null, error: err };
  }
}

/**
 * Increment views_count for a job
 */
export async function incrementJobViews(
  supabase: SupabaseClient<Database>,
  jobId: string
): Promise<{ data: { views_count: number } | null; error: PostgrestError | null }> {
  try {
    // Fetch current views_count
    const { data: currentJob, error: fetchError } = await supabase
      .from('jobs')
      .select('views_count')
      .eq('id', jobId)
      .single();

    // Handle "not found" error (PGRST116) - job doesn't exist
      if (fetchError && (fetchError as PostgrestError).code === 'PGRST116') {
      return { data: null, error: new Error('Job not found') as PostgrestError };
    }

    if (fetchError) {
      return { data: null, error: fetchError };
    }

    if (!currentJob) {
      return { data: null, error: new Error('Job not found') as PostgrestError };
    }

    const newViewsCount = (currentJob.views_count || 0) + 1;

    // Increment and update
    const { error: updateError } = await supabase
      .from('jobs')
      .update({ views_count: newViewsCount })
      .eq('id', jobId);

    if (updateError) {
      return { data: null, error: updateError };
    }

    return { data: { views_count: newViewsCount }, error: null };
  } catch (err) {
    console.error('Error incrementing job views:', err);
    return { data: null, error: err };
  }
}

/**
 * Increment views_count for a tender
 */
export async function incrementTenderViews(
  supabase: SupabaseClient<Database>,
  tenderId: string
): Promise<{ data: { views_count: number } | null; error: PostgrestError | null }> {
  try {
    // Fetch current views_count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: currentTender, error: fetchError } = await (supabase as any)
      .from(contestsTable())
      .select('views_count')
      .eq('id', tenderId)
      .single();

    // Handle "not found" error (PGRST116) - tender doesn't exist
    if (fetchError && (fetchError as PostgrestError).code === 'PGRST116') {
      return { data: null, error: new Error('Tender not found') as PostgrestError };
    }

    if (fetchError) {
      return { data: null, error: fetchError };
    }

    if (!currentTender) {
      return { data: null, error: new Error('Tender not found') as PostgrestError };
    }

    const newViewsCount = ((currentTender as unknown as { views_count?: number })?.views_count || 0) + 1;

    // Increment and update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from(contestsTable())
      .update({ views_count: newViewsCount })
      .eq('id', tenderId);

    if (updateError) {
      return { data: null, error: updateError };
    }

    return { data: { views_count: newViewsCount }, error: null };
  } catch (err) {
    console.error('Error incrementing tender views:', err);
    return { data: null, error: err };
  }
}

/**
 * Map company type to client type for filtering
 */
function mapCompanyTypeToClientType(companyType?: string): string {
  switch (companyType) {
    case 'spółdzielnia':
      return 'Spółdzielnia Mieszkaniowa';
    case 'wspólnota':
      return 'Wspólnota Mieszkaniowa';
    case 'housing_association':
      return 'Wspólnota Mieszkaniowa';
    case 'cooperative':
      return 'Spółdzielnia Mieszkaniowa';
    case 'condo_management':
      return 'Wspólnota Mieszkaniowa';
    case 'property_management':
      return 'Wspólnota Mieszkaniowa';
    default:
      return 'Wspólnota Mieszkaniowa';
  }
}

/**
 * Validate and ensure coordinates exist, with fallback to city center + random scattering
 */
function ensureValidCoordinates(lat?: number | null, lng?: number | null, location?: string, jobId?: string): { lat: number; lng: number } | null {
  // If coordinates exist and are valid
  if (lat && lng && lat !== 0 && lng !== 0 && 
      lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    return { lat, lng };
  }

  // Fallback to city center coordinates with random scattering
  if (location) {
    const cityCoords = findCityCoordinates(location);
    if (cityCoords) {
      console.warn(`Using city fallback coordinates for location: ${location}`);
      return addRandomScattering(cityCoords, jobId);
    }
  }

  // Default to Warsaw center with scattering if no coordinates available
  console.warn(`No valid coordinates found for location: ${location}, using Warsaw center`);
  return addRandomScattering({ lat: 52.2297, lng: 21.0122 }, jobId);
}

/**
 * Add random scattering around coordinates to avoid overlapping markers
 */
function addRandomScattering(coords: { lat: number; lng: number }, jobId?: string): { lat: number; lng: number } {
  // Use job ID if available for more consistent scattering per job
  const seed = jobId || coords.lat.toString() + coords.lng.toString();
  
  // Create a deterministic hash from the seed
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Generate pseudo-random offsets using multiple hash variations
  const latHash = hash % 1000;
  const lngHash = (hash * 17) % 1000; // Different multiplier for longitude
  
  // Convert to offsets (roughly ±0.015 degrees = ±1.5km radius)
  const latOffset = ((latHash - 500) / 100000) * 15; // ±0.015 degrees
  const lngOffset = ((lngHash - 500) / 100000) * 15; // ±0.015 degrees
  
  return {
    lat: coords.lat + latOffset,
    lng: coords.lng + lngOffset
  };
}

/**
 * Find city coordinates from location string
 */
function findCityCoordinates(location: string): { lat: number; lng: number } | null {
  const normalizedLocation = location.toLowerCase().trim();
  
  const cityMap: Record<string, { lat: number; lng: number }> = {
    'warszawa': { lat: 52.2297, lng: 21.0122 },
    'kraków': { lat: 50.0647, lng: 19.9450 },
    'krakow': { lat: 50.0647, lng: 19.9450 },
    'gdańsk': { lat: 54.3520, lng: 18.6466 },
    'gdansk': { lat: 54.3520, lng: 18.6466 },
    'wrocław': { lat: 51.1079, lng: 17.0385 },
    'wroclaw': { lat: 51.1079, lng: 17.0385 },
    'poznań': { lat: 52.4064, lng: 16.9252 },
    'poznan': { lat: 52.4064, lng: 16.9252 },
    'łódź': { lat: 51.7592, lng: 19.4550 },
    'lodz': { lat: 51.7592, lng: 19.4550 },
    'katowice': { lat: 50.2649, lng: 19.0238 },
    'szczecin': { lat: 53.4285, lng: 14.5528 },
    'lublin': { lat: 51.2465, lng: 22.5684 },
    'białystok': { lat: 53.1325, lng: 23.1688 },
    'bialystok': { lat: 53.1325, lng: 23.1688 },
    'bydgoszcz': { lat: 53.1235, lng: 18.0084 },
    'ursynów': { lat: 52.1394, lng: 21.0458 },
    'ursynow': { lat: 52.1394, lng: 21.0458 },
    'mokotów': { lat: 52.1735, lng: 21.0422 },
    'mokotow': { lat: 52.1735, lng: 21.0422 },
  };

  for (const [cityName, coords] of Object.entries(cityMap)) {
    if (normalizedLocation.includes(cityName)) {
      return coords;
    }
  }
  
  return null;
}

/**
 * Helper function to convert date to "time ago" format
 */
function getTimeAgo(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Przed chwilą';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min temu`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} godz. temu`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} dni temu`;
  
  return past.toLocaleDateString('pl-PL');
}

/**
 * Create a new tender in the database
 */
export async function createTender(
  supabase: SupabaseClient<Database>,
  tenderData: TenderUpsertData & {
    managerId: string;
    companyId: string;
  },
): Promise<{ data: TenderWithCompany | null; error: PostgrestError | null }> {
  try {
    const resolved = await resolveTenderCategoryIds(
      supabase,
      tenderData.category,
      tenderData.subcategory,
      tenderData.status,
    );
    if (resolved.error || !resolved.categoryId) {
      return { data: null, error: resolved.error };
    }

    const insertRow = {
      ...tenderDbRowFromUpsert(tenderData, resolved.categoryId, resolved.subcategoryId),
      manager_id: tenderData.managerId,
      company_id: tenderData.companyId,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: insertedTender, error: insertError } = await (supabase as any)
      .from(contestsTable())
      .insert(insertRow)
      .select(`
        *,
        company:companies!tenders_company_id_fkey (
          id,
          name,
          logo_url,
          is_verified
        ),
        category:job_categories!tenders_category_id_fkey (
          name,
          slug
        )
      `)
      .single();

    if (insertError) {
      console.error('Error creating tender:', insertError);
      return {
        data: null,
        error: (insertError instanceof Error
          ? insertError
          : new Error(
              String(
                (insertError as { message?: string })?.message || 'Unknown database error',
              ),
            )) as PostgrestError,
      };
    }

    return { data: insertedTender as unknown as TenderWithCompany, error: null };
  } catch (err) {
    console.error('Error creating tender:', err);
    return { data: null, error: err };
  }
}

/**
 * Update an existing draft tender in the database
 * Only draft tenders can be updated
 */
export async function updateTender(
  supabase: SupabaseClient<Database>,
  tenderId: string,
  tenderData: TenderUpsertData,
): Promise<{ data: TenderWithCompany | null; error: PostgrestError | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingTender, error: fetchError } = await (supabase as any)
      .from(contestsTable())
      .select('id, status')
      .eq('id', tenderId)
      .single();

    if (fetchError || !existingTender) {
      return {
        data: null,
        error: new Error('Konkurs nie został znaleziony') as PostgrestError,
      };
    }

    if ((existingTender as unknown as { status?: string })?.status !== 'draft') {
      return {
        data: null,
        error: new Error('Tylko konkursy w statusie szkicu mogą być edytowane') as PostgrestError,
      };
    }

    const resolved = await resolveTenderCategoryIds(
      supabase,
      tenderData.category,
      tenderData.subcategory,
      tenderData.status,
    );
    if (resolved.error || !resolved.categoryId) {
      return { data: null, error: resolved.error };
    }

    const updateRow = {
      ...tenderDbRowFromUpsert(tenderData, resolved.categoryId, resolved.subcategoryId),
      updated_at: new Date().toISOString(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedTender, error: updateError } = await (supabase as any)
      .from(contestsTable())
      .update(updateRow)
      .eq('id', tenderId)
      .select(`
        *,
        company:companies!tenders_company_id_fkey (
          id,
          name,
          logo_url,
          is_verified
        ),
        category:job_categories!tenders_category_id_fkey (
          name,
          slug
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating tender:', updateError);
      return { data: null, error: updateError };
    }

    return { data: updatedTender as unknown as TenderWithCompany, error: null };
  } catch (err) {
    console.error('Error updating tender:', err);
    return { data: null, error: err };
  }
}

/**
 * Create a new job in the database
 */
export async function createJob(
  supabase: SupabaseClient<Database>,
  jobData: {
    title: string;
    description: string;
    category: string; // Category name, will be converted to category_id
    subcategory?: string;
    location?: JobLocation | string;
    address?: string;
    latitude?: number;
    longitude?: number;
    sublocalityLevel1?: string;
    budgetMin?: number;
    budgetMax?: number;
    budgetType?: 'fixed' | 'hourly' | 'negotiable' | 'range';
    currency?: string;
    projectDuration?: string;
    deadline?: Date | string;
    urgency?: 'low' | 'medium' | 'high';
    status?: Database['public']['Tables']['jobs']['Row']['status'];
    type?: 'regular' | 'urgent' | 'premium';
    isPublic?: boolean;
    contactPerson?: string;
    contactPhone?: string;
    contactEmail?: string;
    buildingType?: string;
    buildingYear?: number;
    surfaceArea?: string;
    additionalInfo?: string;
    requirements?: string[];
    responsibilities?: string[];
    skillsRequired?: string[];
    images?: string[];
    managerId: string; // User profile ID
    companyId: string; // Company ID
    buildingId?: string | null;
  }
): Promise<{ data: JobWithCompany | null; error: PostgrestError | null }> {
  try {
    const { canUserUsePlatformFeatures } = await import('../verification/can-use-platform');
    const access = await canUserUsePlatformFeatures(supabase, jobData.managerId);
    if (!access.allowed) {
      return {
        data: null,
        error: new Error(access.message ?? 'Konto nie jest zweryfikowane.') as PostgrestError,
      };
    }

    const resolved = await resolveJobFormCategoryIds(supabase, jobData.category, jobData.subcategory);
    if (resolved.error || !resolved.categoryId) {
      return { data: null, error: resolved.error };
    }
    const categoryId = resolved.categoryId;
    const subcategoryId = resolved.subcategoryId;

    // Parse deadline if provided
    let deadlineDate: string | null = null;
    if (jobData.deadline) {
      if (typeof jobData.deadline === 'string') {
        deadlineDate = jobData.deadline;
      } else {
        deadlineDate = jobData.deadline.toISOString().split('T')[0];
      }
    }

    // Parse budget values using Budget type
    const budgetInput: BudgetInput = {
      min: jobData.budgetMin,
      max: jobData.budgetMax,
      type: jobData.budgetType || 'fixed',
      currency: jobData.currency || 'PLN',
    };
    const budgetDb = budgetToDatabase(budgetInput);

    const { fetchUserPrimaryCompany } = await import('./companies');
    const { data: companyRow } = await fetchUserPrimaryCompany(supabase, jobData.managerId);

    let locationJsonb: { city: string; sublocality_level_1?: string };
    let latitudeVal: number | null = jobData.latitude ?? null;
    let longitudeVal: number | null = jobData.longitude ?? null;
    let addressVal: string | null = jobData.address ?? null;

    if (jobData.buildingId) {
      const loc = await resolveJobLocationFromBuildingOrCompany(
        supabase,
        jobData.companyId,
        jobData.buildingId,
        companyRow?.city ?? null,
        companyRow?.address ?? null,
      );
      locationJsonb = { city: loc.city };
      latitudeVal = loc.latitude;
      longitudeVal = loc.longitude;
      addressVal = loc.address;
    } else if (jobData.location !== undefined && jobData.location !== null && jobData.location !== '') {
      if (typeof jobData.location === 'string') {
        locationJsonb = {
          city: jobData.location,
          ...(jobData.sublocalityLevel1 ? { sublocality_level_1: jobData.sublocalityLevel1 } : {}),
        };
      } else {
        locationJsonb = {
          city: jobData.location.city,
          ...(jobData.location.sublocality_level_1 || jobData.sublocalityLevel1
            ? { sublocality_level_1: jobData.location.sublocality_level_1 || jobData.sublocalityLevel1 }
            : {}),
        };
      }
    } else {
      const loc = await resolveJobLocationFromBuildingOrCompany(
        supabase,
        jobData.companyId,
        null,
        companyRow?.city ?? null,
        companyRow?.address ?? null,
      );
      locationJsonb = { city: loc.city };
      latitudeVal = loc.latitude;
      longitudeVal = loc.longitude;
      addressVal = loc.address;
    }

    // Prepare insert data
    const insertData = {
      title: jobData.title,
      description: jobData.description,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      building_id: jobData.buildingId ?? null,
      manager_id: jobData.managerId,
      company_id: jobData.companyId,
      location: locationJsonb,
      address: addressVal,
      latitude: latitudeVal,
      longitude: longitudeVal,
      budget_min: budgetDb.budget_min,
      budget_max: budgetDb.budget_max,
      budget_type: budgetDb.budget_type,
      currency: budgetDb.currency,
      project_duration: jobData.projectDuration || null,
      deadline: deadlineDate,
      urgency: jobData.urgency || 'medium',
      status: jobData.status || 'collecting_offers',
      type: jobData.type || 'regular',
      is_public: jobData.isPublic !== undefined ? jobData.isPublic : true,
      contact_person: jobData.contactPerson || null,
      contact_phone: jobData.contactPhone || null,
      contact_email: jobData.contactEmail || null,
      building_type: jobData.buildingType || null,
      building_year: jobData.buildingYear || null,
      surface_area: jobData.surfaceArea || null,
      additional_info: jobData.additionalInfo || null,
      requirements: jobData.requirements || null,
      responsibilities: jobData.responsibilities || null,
      skills_required: jobData.skillsRequired || null,
      images: jobData.images || null,
      published_at:
        jobData.status && jobData.status !== 'draft'
          ? new Date().toISOString()
          : null,
    };

    console.log('Inserting job with data:', {
      ...insertData,
      manager_id: jobData.managerId,
      company_id: jobData.companyId,
      category_id: categoryId,
    });

    // Insert job
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: insertedJob, error: insertError } = await (supabase as any)
      .from('jobs')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(insertData as any)
      .select(`
        *,
        company:companies!jobs_company_id_fkey (
          id,
          name,
          logo_url,
          is_verified
        ),
        category:job_categories!jobs_category_id_fkey (
          name,
          slug
        )
      `)
      .single();

    if (insertError) {
      console.error('Error creating job:', {
        error: insertError,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
      });
      return { data: null, error: insertError };
    }

    return { data: insertedJob as JobWithCompany, error: null };
  } catch (err) {
    console.error('Error creating job:', err);
    return { data: null, error: err };
  }
}

/**
 * Convert estimated completion string to days
 * Examples: "1 miesiąc" -> 30, "2 tygodnie" -> 14, "1-3 dni" -> 2, "2-4 tygodnie" -> 21
 */
function convertEstimatedCompletionToDays(estimatedCompletion: string): number | null {
  try {
    if (!estimatedCompletion) return null;

    const lower = estimatedCompletion.toLowerCase().trim();

    // Ranges like "1-3 dni", "2-4 tygodnie" — parse leading "a-b" instead of stripping Polish words (avoids breaking "tygodnie")
    if (lower.includes('-')) {
      const hasDay = lower.includes('dzień') || lower.includes('dni');
      const hasWeek = lower.includes('tydzień') || lower.includes('tygodnie') || lower.includes('tygodni');
      const hasMonth = lower.includes('miesiąc') || lower.includes('miesięcy');

      if (hasDay || hasWeek || hasMonth) {
        const rangeMatch = lower.match(/^(\d+)\s*-\s*(\d+)/);
        if (rangeMatch) {
          const first = parseInt(rangeMatch[1], 10);
          const second = parseInt(rangeMatch[2], 10);
          if (!Number.isNaN(first) && !Number.isNaN(second)) {
            const average = Math.round((first + second) / 2);
            if (hasDay) return average;
            if (hasWeek) return average * 7;
            if (hasMonth) return average * 30;
          }
        }
      } else {
        const parts = lower.split('-').map((p) => p.trim());
        if (parts.length === 2) {
          const first = parseInt(parts[0], 10);
          const second = parseInt(parts[1], 10);
          if (!Number.isNaN(first) && !Number.isNaN(second)) {
            return Math.round((first + second) / 2);
          }
        }
      }
    }

    if (lower.includes('dzień') || lower.includes('dni')) {
      const days = parseInt(lower, 10);
      return Number.isNaN(days) ? null : days;
    }

    if (lower.includes('tydzień') || lower.includes('tygodnie') || lower.includes('tygodni')) {
      const weeks = parseInt(lower, 10);
      return Number.isNaN(weeks) ? null : weeks * 7;
    }

    if (lower.includes('miesiąc') || lower.includes('miesięcy')) {
      const months = parseInt(lower, 10);
      return Number.isNaN(months) ? null : months * 30;
    }

    const number = parseInt(lower, 10);
    return Number.isNaN(number) ? null : number;
  } catch (e) {
    console.warn('convertEstimatedCompletionToDays failed:', estimatedCompletion, e);
    return null;
  }
}

function formatJobApplicationInsertError(insertError: unknown): string {
  if (insertError instanceof Error) return insertError.message;
  const o = insertError as Record<string, unknown>;
  const msg = [o.message, o.details, o.hint, o.code].filter(Boolean).join(' — ');
  if (msg) return String(msg);
  try {
    return JSON.stringify(insertError);
  } catch {
    return String(insertError);
  }
}

function isMissingVatRateColumnError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('vat_rate') &&
    (m.includes('does not exist') ||
      m.includes('nie istnieje') ||
      m.includes('column') ||
      m.includes('schema cache'))
  );
}

/** Payload for creating a job application (`proposed_price` stored as net PLN before VAT). */
export interface CreateJobApplicationInput {
  proposedPrice: number;
  coverLetter: string;
  additionalNotes?: string;
  /** VAT percent: only 8 or 23; default 23 when omitted. */
  vatRate?: 8 | 23;
  /** Working days for job offers (KAN-17); takes precedence over `estimatedCompletion`. */
  workingDays?: number;
  /** ISO date `YYYY-MM-DD` — stored as `available_from` and `proposed_start_date`. */
  startDate?: string;
  guaranteeMonths?: number;
  /** Legacy completion string (e.g. tender modal); used when `workingDays` is not set. */
  estimatedCompletion?: string;
  attachments?: Array<{ id: string; name: string; type: string; url: string; size: number }>;
}

/**
 * Create a new job application
 */
export async function createJobApplication(
  supabase: SupabaseClient<Database>,
  jobId: string,
  contractorId: string,
  applicationData: CreateJobApplicationInput
): Promise<{ data: Record<string, unknown> | null; error: PostgrestError | null }> {
  try {
    const { canUserUsePlatformFeatures } = await import('../verification/can-use-platform');
    const access = await canUserUsePlatformFeatures(supabase, contractorId);
    if (!access.allowed) {
      return {
        data: null,
        error: new Error(access.message ?? 'Konto wykonawcy nie jest zweryfikowane.') as PostgrestError,
      };
    }

    // Fetch contractor's primary company
    const { fetchUserPrimaryCompany } = await import('./companies');
    const { data: company, error: companyError } = await fetchUserPrimaryCompany(supabase, contractorId);
    
    if (companyError) {
      console.error('Error fetching contractor company:', companyError);
      return { 
        data: null, 
        error: (companyError instanceof Error 
          ? companyError 
          : new Error(((companyError as unknown as { message?: string })?.message || 'Failed to fetch contractor company') as string)) as PostgrestError
      };
    }
    
    if (!company) {
      return { 
        data: null, 
        error: new Error('Contractor must have a company to submit applications') as PostgrestError
      };
    }
    
    let proposedTimeline: number | null = null;
    const workingDaysNum = Number(applicationData.workingDays);
    if (Number.isFinite(workingDaysNum) && workingDaysNum > 0) {
      proposedTimeline = Math.floor(workingDaysNum);
    } else if (applicationData.estimatedCompletion) {
      proposedTimeline = convertEstimatedCompletionToDays(applicationData.estimatedCompletion);
    }
    
    // Ensure proposed_price is a valid number (net PLN)
    const proposedPrice = typeof applicationData.proposedPrice === 'number' 
      ? applicationData.proposedPrice 
      : parseFloat(String(applicationData.proposedPrice)) || 0;
    
    if (proposedPrice <= 0) {
      return {
        data: null,
        error: new Error('Proposed price must be greater than 0') as PostgrestError
      };
    }
    
    // Validate required fields
    if (!applicationData.coverLetter || applicationData.coverLetter.trim().length === 0) {
      return {
        data: null,
        error: new Error('Cover letter is required') as PostgrestError
      };
    }
    
    const vatRate: 8 | 23 = applicationData.vatRate === 8 ? 8 : 23;
    
    // Prepare insert data
    const insertData: Record<string, unknown> = {
      job_id: jobId,
      contractor_id: contractorId,
      company_id: company.id,
      proposed_price: proposedPrice,
      currency: 'PLN',
      vat_rate: vatRate,
      cover_letter: applicationData.coverLetter.trim(),
      notes: applicationData.additionalNotes?.trim() || null,
      status: 'submitted',
    };
    
    if (proposedTimeline !== null) {
      insertData.proposed_timeline = proposedTimeline;
    }

    const startRaw = applicationData.startDate?.trim();
    if (startRaw && /^\d{4}-\d{2}-\d{2}$/.test(startRaw)) {
      insertData.available_from = startRaw;
      insertData.proposed_start_date = startRaw;
    }

    const guaranteeMonthsNum = Number(applicationData.guaranteeMonths);
    if (Number.isFinite(guaranteeMonthsNum) && guaranteeMonthsNum > 0) {
      insertData.guarantee_period = Math.floor(guaranteeMonthsNum);
    }

    if (Array.isArray(applicationData.attachments) && applicationData.attachments.length > 0) {
      insertData.attachments = applicationData.attachments;
    }
    
    // Log the data being inserted for debugging
    console.log('Inserting job application with data:', {
      job_id: jobId,
      contractor_id: contractorId,
      company_id: company.id,
      proposed_price: applicationData.proposedPrice,
      vat_rate: vatRate,
      proposed_timeline: proposedTimeline,
      cover_letter_length: applicationData.coverLetter?.length || 0,
      status: 'submitted'
    });
    
    // Insert application (using type assertion since job_applications may not be in generated types)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: insertedApplication, error: insertError } = await (supabase as any)
      .from('job_applications')
      .insert(insertData)
      .select()
      .single();
    
    if (insertError) {
      const msg = formatJobApplicationInsertError(insertError);
      console.error('Error creating job application:', msg, insertError);
      const friendly =
        isMissingVatRateColumnError(msg)
          ? 'Brak kolumny vat_rate w tabeli job_applications. Uruchom migrację (np. database/56_job_applications_vat_rate.sql lub odpowiedni plik w supabase/migrations).'
          : msg;
      return {
        data: null,
        error: new Error(friendly) as PostgrestError,
      };
    }
    
    // Verify that data was actually inserted
    if (!insertedApplication || !(insertedApplication as unknown as { id?: string })?.id) {
      console.error('Application insert returned no data:', {
        insertedApplication,
        insertData
      });
      return {
        data: null,
        error: new Error('Application was not created - no data returned from database') as PostgrestError
      };
    }
    
    console.log('Job application created successfully:', {
      id: (insertedApplication as unknown as JobApplicationRow)?.id,
      job_id: (insertedApplication as unknown as JobApplicationRow)?.job_id,
      contractor_id: (insertedApplication as unknown as JobApplicationRow)?.contractor_id,
      company_id: (insertedApplication as unknown as JobApplicationRow)?.company_id,
      status: (insertedApplication as unknown as JobApplicationRow)?.status
    });
    return { data: insertedApplication as unknown as JobApplicationRow, error: null };
  } catch (err) {
    const msg =
      err instanceof Error
        ? `${err.message}\n${err.stack ?? ''}`
        : formatJobApplicationInsertError(err);
    console.error('Error creating job application (exception):', msg, err);
    return {
      data: null,
      error: (err instanceof Error
        ? err
        : new Error(
            ((err as unknown as { message?: string })?.message ||
              formatJobApplicationInsertError(err) ||
              'Unknown error occurred') as string,
          )) as PostgrestError,
    };
  }
}

/**
 * Fetch job applications for a specific job
 */
export async function fetchJobApplicationsByJobId(
  supabase: SupabaseClient<Database>,
  jobId: string
): Promise<{ data: Application[] | null; error: PostgrestError | null }> {
  try {
    // Use type assertion since job_applications may not be in generated types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: applications, error } = await (supabase as any)
      .from('job_applications')
      .select(`
        id,
        job_id,
        contractor_id,
        proposed_price,
        proposed_timeline,
        proposed_start_date,
        vat_rate,
        cover_letter,
        experience,
        team_size,
        available_from,
        guarantee_period,
        status,
        notes,
        attachments,
        certificates,
        submitted_at,
        reviewed_at,
        decision_at,
        contractor:user_profiles!job_applications_contractor_id_fkey (
          id,
          first_name,
          last_name,
          avatar_url
        ),
        company:companies!job_applications_company_id_fkey (
          id,
          name,
          logo_url
        )
      `)
      .eq('job_id', jobId)
      .neq('admin_moderation_status', 'suspended')
      .order('submitted_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching job applications:', error);
      return { data: null, error };
    }
    
    // Transform to Application type format
    const formattedApplications = await Promise.all(
      ((applications as JobApplicationRow[]) || []).map(async (app: JobApplicationRow) => {
        // Fetch contractor profile for additional data (rating, completed jobs, location)
        const { fetchContractorById } = await import('./contractors');
        const contractorProfile = await fetchContractorById(String((app.company as Record<string, unknown>)?.id ?? ''));
        
        const timelineDays =
          app.proposed_timeline !== null && app.proposed_timeline !== undefined && app.proposed_timeline !== ''
            ? Number(app.proposed_timeline)
            : null;

        // Convert proposed_timeline (days) back to readable string
        let proposedTimeline = 'Nie określono';
        if (timelineDays !== null && !Number.isNaN(timelineDays)) {
          const days = timelineDays;
          if (days < 7) {
            proposedTimeline = `${days} ${days === 1 ? 'dzień' : 'dni'}`;
          } else if (days < 30) {
            const weeks = Math.round(days / 7);
            proposedTimeline = `${weeks} ${weeks === 1 ? 'tydzień' : weeks < 5 ? 'tygodnie' : 'tygodni'}`;
          } else {
            const months = Math.round(days / 30);
            proposedTimeline = `${months} ${months === 1 ? 'miesiąc' : months < 5 ? 'miesiące' : 'miesięcy'}`;
          }
        }

        const vatRaw = Number(app.vat_rate);
        const vatRate: 8 | 23 = vatRaw === 8 ? 8 : 23;

        const startRaw = app.available_from ?? app.proposed_start_date;
        
        const formattedAttachments = Array.isArray(app.attachments)
          ? (app.attachments as Array<Record<string, unknown>>).map((attachment, index) => ({
              id: String(attachment.id ?? `attachment-${index}`),
              name: String(attachment.name ?? 'Załącznik'),
              type:
                (attachment.type === 'portfolio' ||
                  attachment.type === 'reference' ||
                  attachment.type === 'certificate' ||
                  attachment.type === 'other'
                  ? attachment.type
                  : 'other') as 'portfolio' | 'reference' | 'certificate' | 'other',
              url: String(attachment.url ?? ''),
              size: Number(attachment.size ?? 0),
            }))
          : [];

        return {
          id: String(app.id),
          jobId: String(app.job_id),
          contractorId: String(app.contractor_id),
          contractorCompanyId: String((app.company as Record<string, unknown>)?.id ?? ''),
          contractorName: app.contractor 
            ? `${String((app.contractor as Record<string, unknown>).first_name ?? '')} ${String((app.contractor as Record<string, unknown>).last_name ?? '')}`.trim() 
            : 'Nieznany wykonawca',
          contractorCompany: String((app.company as Record<string, unknown>)?.name ?? 'Nieznana firma'),
          contractorAvatar: String((app.contractor as Record<string, unknown>)?.avatar_url ?? (app.company as Record<string, unknown>)?.logo_url ?? ''),
          contractorRating: contractorProfile?.rating?.overall || 0,
          contractorCompletedJobs: contractorProfile?.experience?.completedProjects || 0,
          contractorLocation: contractorProfile?.location?.city || 'Nieznana lokalizacja',
          proposedPrice: Number(app.proposed_price ?? 0),
          proposedTimeline: proposedTimeline,
          timelineDays: timelineDays !== null && !Number.isNaN(timelineDays) ? timelineDays : null,
          vatRate,
          coverLetter: String(app.cover_letter ?? ''),
          experience: String(app.experience ?? ''),
          teamSize: Number(app.team_size ?? 1),
          availableFrom: startRaw
            ? String(startRaw)
            : new Date().toISOString().slice(0, 10),
          guaranteePeriod: app.guarantee_period ? `${String(app.guarantee_period)} miesięcy` : '12 miesięcy',
          attachments: formattedAttachments,
          certificates: Array.isArray(app.certificates) ? app.certificates.map((certificate) => String(certificate)) : [],
          status: (app.status as 'submitted' | 'under_review' | 'accepted' | 'rejected') || 'submitted',
          submittedAt: new Date(String(app.submitted_at ?? '')),
          lastUpdated: app.reviewed_at ? new Date(String(app.reviewed_at)) : new Date(String(app.submitted_at ?? '')),
          reviewNotes: typeof app.notes === 'string' ? app.notes : undefined,
        };
      })
    );
    
    return { data: formattedApplications, error: null };
  } catch (err) {
    console.error('Error fetching job applications:', err);
    return { data: null, error: err };
  }
}

/**
 * Create a new tender bid
 */
export async function createTenderBid(
  supabase: SupabaseClient<Database>,
  tenderId: string,
  contractorId: string,
  bidData: {
    proposedPrice: number;
    estimatedCompletion: string;
    coverLetter: string;
    additionalNotes?: string;
  }
): Promise<{ data: Record<string, unknown> | null; error: PostgrestError | null }> {
  try {
    await ensureContestsSchemaResolved(supabase);
    const { canUserUsePlatformFeatures } = await import('../verification/can-use-platform');
    const access = await canUserUsePlatformFeatures(supabase, contractorId);
    if (!access.allowed) {
      return {
        data: null,
        error: new Error(access.message ?? 'Konto wykonawcy nie jest zweryfikowane.') as PostgrestError,
      };
    }

    // Fetch contractor's primary company
    const { fetchUserPrimaryCompany } = await import('./companies');
    const { data: company, error: companyError } = await fetchUserPrimaryCompany(supabase, contractorId);
    
    if (companyError) {
      console.error('Error fetching contractor company:', companyError);
      return { 
        data: null, 
        error: (companyError instanceof Error 
          ? companyError 
          : new Error(((companyError as unknown as { message?: string })?.message || 'Failed to fetch contractor company') as string)) as PostgrestError
      };
    }
    
    if (!company) {
      return { 
        data: null, 
        error: new Error('Contractor must have a company to submit bids') as PostgrestError
      };
    }
    
    // Block only submitted (non-draft, non-cancelled) bids — drafts allowed for contest flow
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingBids, error: checkError } = await (supabase as any)
      .from(contestOffersTable())
      .select('id, status')
      .eq(contestIdColumn(), tenderId)
      .eq('company_id', company.id)
      .in('status', ['submitted', 'under_review', 'shortlisted', 'accepted', 'rejected'])
      .limit(1);
    
    if (checkError) {
      console.error('Error checking for existing bids:', checkError);
      return {
        data: null,
        error: new Error('Failed to check for existing bids') as PostgrestError
      };
    }
    
    if (existingBids && existingBids.length > 0) {
      return {
        data: null,
        error: new Error('Już złożyłeś ofertę na ten przetarg. Nie możesz złożyć więcej niż jednej oferty na ten sam przetarg.') as PostgrestError
      };
    }
    
    // Convert estimated completion to days
    const proposedTimeline = convertEstimatedCompletionToDays(bidData.estimatedCompletion);
    
    // Prepare insert data
    const insertData: Record<string, unknown> = {
      [contestIdColumn()]: tenderId,
      contractor_id: contractorId,
      company_id: company.id,
      bid_amount: bidData.proposedPrice,
      currency: 'PLN',
      technical_proposal: bidData.coverLetter,
      financial_proposal: bidData.additionalNotes || null,
      status: 'submitted',
    };
    
    // Only add proposed_timeline if we successfully converted it
    if (proposedTimeline !== null) {
      insertData.proposed_timeline = proposedTimeline;
    }
    
    // Insert bid (using type assertion since tender_bids may not be in generated types)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: insertedBid, error: insertError } = await (supabase as any)
      .from(contestOffersTable())
      .insert(insertData)
      .select()
      .single();
    
    if (insertError) {
      const error = insertError as { message?: string; details?: string; hint?: string; code?: string };
      console.error('Error creating tender bid:', {
        error: insertError,
        errorMessage: error?.message,
        errorDetails: error?.details,
        errorHint: error?.hint,
        errorCode: error?.code,
        bidData: {
          tenderId,
          contractorId,
          companyId: company.id,
        }
      });
      return { 
        data: null, 
        error: (insertError instanceof Error 
          ? insertError 
          : new Error(((insertError as unknown as { message?: string; details?: string; hint?: string })?.message || (insertError as unknown as { message?: string; details?: string; hint?: string })?.details || (insertError as unknown as { message?: string; details?: string; hint?: string })?.hint || 'Unknown database error') as string)) as PostgrestError
      };
    }
    
    return { data: insertedBid as unknown as TenderBidRow, error: null };
  } catch (err) {
    console.error('Error creating tender bid:', err);
    return { 
      data: null, 
      error: (err instanceof Error 
        ? err 
        : new Error(((err as unknown as { message?: string })?.message || String(err) || 'Unknown error occurred') as string)) as PostgrestError
    };
  }
}

/**
 * Fetch tender bids for a specific tender
 */
export interface FetchTenderBidsOptions {
  /** Exclude draft bids (OPD-66 contest wizard). */
  submittedOnly?: boolean;
}

export async function fetchTenderBidsByTenderId(
  supabase: SupabaseClient<Database>,
  tenderId: string,
  options?: FetchTenderBidsOptions,
): Promise<{ data: Record<string, unknown>[] | null; error: PostgrestError | null }> {
  try {
    await ensureContestsSchemaResolved(supabase);
    const contestIdField = contestIdColumn();
    // Use type assertion since tender_bids may not be in generated types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from(contestOffersTable())
      .select(`
        id,
        ${contestIdField},
        contractor_id,
        bid_amount,
        proposed_timeline,
        proposed_start_date,
        technical_proposal,
        financial_proposal,
        team_description,
        experience_summary,
        project_references,
        certificates,
        attachments,
        offer_details,
        status,
        evaluation_score,
        evaluation_notes,
        submitted_at,
        evaluated_at,
        contractor:user_profiles!tender_bids_contractor_id_fkey (
          id,
          first_name,
          last_name,
          avatar_url
        ),
        company:companies!tender_bids_company_id_fkey (
          id,
          name,
          logo_url
        )
      `)
      .eq(contestIdField, tenderId)
      .neq('admin_moderation_status', 'suspended');

    if (options?.submittedOnly) {
      query = query.neq('status', 'draft').neq('status', 'cancelled');
    }

    const { data: bids, error } = await query.order('submitted_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching tender bids:', error);
      return { data: null, error };
    }
    
    // Transform to TenderBid type format
    const formattedBids = await Promise.all(
      ((bids as TenderBidRow[]) || []).map(async (bid: TenderBidRow) => {
        // Fetch contractor profile for additional data
        const { fetchContractorById } = await import('./contractors');
        const contractorProfile = await fetchContractorById(String((bid.company as Record<string, unknown>)?.id ?? ''));
        
        // Convert proposed_timeline (days) to number
        const proposedTimeline = Number(bid.proposed_timeline ?? 0);
        const offerDetails = bid.offer_details as Record<string, unknown> | null | undefined;
        const netFromOffer =
          typeof offerDetails?.netPrice === 'number'
            ? offerDetails.netPrice
            : bid.bid_amount || 0;
        const vatFromOffer =
          offerDetails?.vatRate === '8' || offerDetails?.vatRate === '23' || offerDetails?.vatRate === 'zw'
            ? offerDetails.vatRate
            : null;
        const grossFromOffer =
          typeof offerDetails?.grossPrice === 'number' ? offerDetails.grossPrice : null;
        const warrantyMonths =
          typeof offerDetails?.warrantyMonths === 'number' ? offerDetails.warrantyMonths : null;
        const guaranteeMonths =
          typeof offerDetails?.guaranteeMonths === 'number'
            ? offerDetails.guaranteeMonths
            : warrantyMonths;

        return {
          id: bid.id,
          contractorCompanyId: String((bid.company as Record<string, unknown>)?.id ?? ''),
          contractorId: bid.contractor_id,
          contractorName: bid.contractor 
            ? `${String((bid.contractor as Record<string, unknown>).first_name ?? '')} ${String((bid.contractor as Record<string, unknown>).last_name ?? '')}`.trim() 
            : 'Nieznany wykonawca',
          contractorCompany: String((bid.company as Record<string, unknown>)?.name ?? 'Nieznana firma'),
          contractorAvatar: String((bid.contractor as Record<string, unknown>)?.avatar_url ?? (bid.company as Record<string, unknown>)?.logo_url ?? ''),
          contractorRating: contractorProfile?.rating?.overall || 0,
          contractorCompletedJobs: contractorProfile?.experience?.completedProjects || 0,
          contractorReviewsCount: contractorProfile?.rating?.reviewsCount ?? 0,
          totalPrice: netFromOffer,
          netPrice: netFromOffer,
          vatRate: vatFromOffer,
          grossPrice: grossFromOffer,
          currency: 'PLN',
          proposedTimeline: proposedTimeline,
          proposedStartDate: bid.proposed_start_date ? new Date(String(bid.proposed_start_date)) : new Date(),
          guaranteePeriod: guaranteeMonths ?? 12,
          warrantyMonths: warrantyMonths,
          description: String(bid.technical_proposal ?? ''),
          technicalProposal: String(bid.technical_proposal ?? ''),
          offerDetails: offerDetails ?? null,
          attachments: (bid.attachments as Array<Record<string, unknown>>) || [],
          criteriaResponses: [], // Would need to be extracted from bid if stored separately
          submittedAt: new Date(String(bid.submitted_at ?? '')),
          status: bid.status || 'submitted',
          evaluation: bid.evaluation_score || bid.evaluation_notes ? {
            criteriaScores: {},
            totalScore: bid.evaluation_score || 0,
            evaluatorNotes: bid.evaluation_notes || '',
            evaluatedAt: bid.evaluated_at ? new Date(String(bid.evaluated_at)) : new Date(),
            evaluatorId: '',
          } : undefined,
        };
      })
    );
    
    return { data: formattedBids, error: null };
  } catch (err) {
    console.error('Error fetching tender bids:', err);
    return { data: null, error: err };
  }
}

/**
 * Cancel a job application (withdraw offer)
 * Only allows cancellation if status is not 'accepted' or 'rejected'
 */
export async function cancelJobApplication(
  supabase: SupabaseClient<Database>,
  applicationId: string,
  contractorId: string
): Promise<{ data: Record<string, unknown> | null; error: PostgrestError | null }> {
  try {
    // Fetch contractor's primary company
    const { fetchUserPrimaryCompany } = await import('./companies');
    const { data: company, error: companyError } = await fetchUserPrimaryCompany(supabase, contractorId);
    
    if (companyError || !company) {
      return { 
        data: null, 
        error: new Error('Contractor must have a company to cancel applications') as PostgrestError
      };
    }

    // First, fetch the application to check ownership and current status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: application, error: fetchError } = await (supabase as any)
      .from('job_applications')
      .select('id, company_id, status')
      .eq('id', applicationId)
      .single();

    if (fetchError) {
      console.error('Error fetching application:', fetchError);
      return {
        data: null,
        error: new Error('Application not found') as PostgrestError
      };
    }

    if (!application) {
      return {
        data: null,
        error: new Error('Application not found') as PostgrestError
      };
    }

    // Check that application belongs to contractor's company
    if ((application as unknown as { company_id?: string })?.company_id !== company.id) {
      return {
        data: null,
        error: new Error('You do not have permission to cancel this application') as PostgrestError
      };
    }

    // Check that status is not 'accepted' or 'rejected'
    if ((application as unknown as { status?: string })?.status === 'accepted' || (application as unknown as { status?: string })?.status === 'rejected') {
      return {
        data: null,
        error: new Error('Cannot cancel an application that has already been accepted or rejected') as PostgrestError
      };
    }

    // Update status to 'cancelled'
    // Filter by both contractor_id (for RLS policy) and company_id (for validation)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updateData, error: updateError } = await (supabase as any)
      .from('job_applications')
      .update({ 
        status: 'cancelled',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', applicationId)
      .eq('contractor_id', contractorId)
      .eq('company_id', company.id)
      .select();

    if (updateError) {
      console.error('Error updating application status:', {
        updateError,
        errorType: typeof updateError,
        errorMessage: updateError?.message,
        errorCode: updateError?.code,
        errorDetails: updateError?.details,
        errorHint: updateError?.hint,
        applicationId,
        companyId: company.id
      });
      
      // Extract error message from various error object structures
      const errorMessage = updateError instanceof Error 
        ? updateError.message 
        : ((updateError as unknown as { message?: string; details?: string; hint?: string; code?: string })?.message || (updateError as unknown as { message?: string; details?: string; hint?: string; code?: string })?.details || (updateError as unknown as { message?: string; details?: string; hint?: string; code?: string })?.hint || (updateError as unknown as { message?: string; details?: string; hint?: string; code?: string })?.code || 'Failed to cancel application') as string;
      
      return {
        data: null,
        error: new Error(errorMessage) as PostgrestError
      };
    }

    // Check if any rows were updated
    if (!updateData || updateData.length === 0) {
      return {
        data: null,
        error: new Error('Application not found or could not be updated. Make sure the database migration has been run to allow "cancelled" status.') as PostgrestError
      };
    }

    const data = (updateData as unknown as Array<Record<string, unknown>>)?.[0];

    return { data, error: null };
  } catch (err) {
    console.error('Error in cancelJobApplication:', err);
    return {
      data: null,
      error: (err instanceof Error 
        ? err 
        : new Error('An unexpected error occurred while cancelling the application')) as PostgrestError
    };
  }
}

/**
 * Cancel a tender bid (withdraw offer)
 * Only allows cancellation if status is not 'accepted' or 'rejected'
 */
export async function cancelTenderBid(
  supabase: SupabaseClient<Database>,
  bidId: string,
  contractorId: string
): Promise<{ data: Record<string, unknown> | null; error: PostgrestError | null }> {
  try {
    // Fetch contractor's primary company
    const { fetchUserPrimaryCompany } = await import('./companies');
    const { data: company, error: companyError } = await fetchUserPrimaryCompany(supabase, contractorId);
    
    if (companyError || !company) {
      return { 
        data: null, 
        error: new Error('Contractor must have a company to cancel bids') as PostgrestError
      };
    }

    const contestIdField = contestIdColumn();
    const parentTable = contestsTable();
    // First, fetch the bid to check ownership and current status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bid, error: fetchError } = await (supabase as any)
      .from(contestOffersTable())
      .select(
        `
        id,
        company_id,
        status,
        ${contestIdField},
        ${parentTable} (
          status,
          submission_deadline,
          building_id,
          selection_criteria,
          formal_requirements
        )
      `,
      )
      .eq('id', bidId)
      .single();

    if (fetchError) {
      console.error('Error fetching bid:', fetchError);
      return {
        data: null,
        error: new Error('Bid not found') as PostgrestError
      };
    }

    if (!bid) {
      return {
        data: null,
        error: new Error('Bid not found') as PostgrestError
      };
    }

    // Check that bid belongs to contractor's company
    if ((bid as unknown as { company_id?: string })?.company_id !== company.id) {
      return {
        data: null,
        error: new Error('You do not have permission to cancel this bid') as PostgrestError
      };
    }

    const bidStatus = (bid as unknown as { status?: string })?.status;
    // Check that status is not 'accepted' or 'rejected'
    if (bidStatus === 'accepted' || bidStatus === 'rejected') {
      return {
        data: null,
        error: new Error('Cannot cancel a bid that has already been accepted or rejected') as PostgrestError
      };
    }

    const tender = (bid as unknown as {
      contests?: {
        status?: string;
        submission_deadline?: string;
        building_id?: string | null;
        selection_criteria?: unknown;
        formal_requirements?: unknown;
      };
    })?.contests;

    if (tender) {
      const { isContestTender } = await import('../contest/map-tender-contest-display');
      const isContest = isContestTender({
        building_id: tender.building_id ?? null,
        selection_criteria: tender.selection_criteria as Record<string, unknown> | null,
        formal_requirements: tender.formal_requirements as Record<string, unknown> | null,
      });

      if (isContest) {
        if (tender.status !== 'active') {
          return {
            data: null,
            error: new Error(
              'Nie można wycofać oferty po zakończeniu zbierania ofert.',
            ) as PostgrestError,
          };
        }
        if (tender.submission_deadline) {
          const deadline = new Date(tender.submission_deadline);
          if (!Number.isNaN(deadline.getTime()) && deadline.getTime() <= Date.now()) {
            return {
              data: null,
              error: new Error(
                'Nie można wycofać oferty po upływie terminu składania ofert.',
              ) as PostgrestError,
            };
          }
        }
      }
    }

    // Update status to 'cancelled'
    // Filter by both contractor_id (for RLS policy) and company_id (for validation)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updateData, error: updateError } = await (supabase as any)
      .from(contestOffersTable())
      .update({ 
        status: 'cancelled',
        evaluated_at: new Date().toISOString()
      })
      .eq('id', bidId)
      .eq('contractor_id', contractorId)
      .eq('company_id', company.id)
      .select();

    if (updateError) {
      console.error('Error updating bid status:', {
        updateError,
        errorType: typeof updateError,
        errorMessage: updateError?.message,
        errorCode: updateError?.code,
        errorDetails: updateError?.details,
        errorHint: updateError?.hint,
        bidId,
        companyId: company.id
      });
      
      // Extract error message from various error object structures
      const errorMessage = updateError instanceof Error 
        ? updateError.message 
        : ((updateError as unknown as { message?: string; details?: string; hint?: string; code?: string })?.message || (updateError as unknown as { message?: string; details?: string; hint?: string; code?: string })?.details || (updateError as unknown as { message?: string; details?: string; hint?: string; code?: string })?.hint || (updateError as unknown as { message?: string; details?: string; hint?: string; code?: string })?.code || 'Failed to cancel bid') as string;
      
      return {
        data: null,
        error: new Error(errorMessage) as PostgrestError
      };
    }

    // Check if any rows were updated
    if (!updateData || updateData.length === 0) {
      return {
        data: null,
        error: new Error('Bid not found or could not be updated. Make sure the database migration has been run to allow "cancelled" status.') as PostgrestError
      };
    }

    const data = (updateData as unknown as Array<Record<string, unknown>>)?.[0];

    return { data, error: null };
  } catch (err) {
    console.error('Error in cancelTenderBid:', err);
    return {
      data: null,
      error: (err instanceof Error 
        ? err 
        : new Error('An unexpected error occurred while cancelling the bid')) as PostgrestError
    };
  }
}

/**
 * Fetch jobs that have been worked on by contractors
 * (jobs with accepted applications)
 */
export async function fetchJobsByWorkHistory(
  supabase: SupabaseClient<Database>,
  managerCompanyId: string
): Promise<Array<{
  id: string;
  title: string;
  category: string;
  status: string;
  budget: string;
  applications: number;
  deadline: string;
  address: string;
}>> {
  try {
    if (!managerCompanyId) {
      return [];
    }

    // Step 1: Get all job IDs for this company
    const { data: companyJobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id')
      .eq('company_id', managerCompanyId);

    if (jobsError) {
      console.error('Error fetching company jobs:', jobsError);
      return [];
    }

    const jobIds = (companyJobs || []).map((job: { id: string }) => job.id);

    if (jobIds.length === 0) {
      return [];
    }

    // Step 2: Get accepted applications for these jobs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: acceptedApplications, error: appsError } = await (supabase as any)
      .from('job_applications')
      .select('job_id')
      .in('job_id', jobIds)
      .eq('status', 'accepted');

    if (appsError) {
      console.error('Error fetching accepted applications:', appsError);
      return [];
    }

    if (!acceptedApplications || (acceptedApplications as unknown as { length?: number })?.length === 0) {
      return [];
    }

    // Step 3: Get distinct job IDs that have accepted applications
    const jobIdsWithApplications: string[] = Array.from(new Set<string>(((acceptedApplications as JobApplicationRow[]) || []).map((app: JobApplicationRow) => app.job_id)));

    if (jobIdsWithApplications.length === 0) {
      return [];
    }

    // Step 4: Fetch job details for these jobs
    const { data: jobsData, error: jobsDataError } = await supabase
      .from('jobs')
      .select(`
        id,
        title,
        budget_min,
        budget_max,
        budget_type,
        currency,
        deadline,
        status,
        location,
        created_at,
        job_categories!jobs_category_id_fkey (name)
      `)
      .in('id', jobIdsWithApplications)
      .order('created_at', { ascending: false });

    if (jobsDataError) {
      console.error('Error fetching jobs data:', jobsDataError);
      return [];
    }

    if (!jobsData || jobsData.length === 0) {
      return [];
    }

    // Step 5: Count accepted applications for each job
    const applicationCounts: { [key: string]: number } = {};
    for (const app of (acceptedApplications as JobApplicationRow[]) || []) {
      const jobId = (app as JobApplicationRow)?.job_id;
      if (jobId) {
        applicationCounts[jobId] = (applicationCounts[jobId] || 0) + 1;
      }
    }

    // Step 6: Format jobs for display
    const formattedJobs = jobsData.map((job: Record<string, unknown>) => {
      const location = typeof job.location === 'string' 
        ? job.location 
        : ((job.location as unknown as { city?: string })?.city || 'Nieznana lokalizacja') as string;

      // Format budget
      const budget = budgetFromDatabase({
        budget_min: (job.budget_min as number) ?? null,
        budget_max: (job.budget_max as number) ?? null,
        budget_type: ((job.budget_type || 'fixed') as string) as 'fixed' | 'hourly' | 'negotiable' | 'range',
        currency: (job.currency as string) || 'PLN',
      });
      const budgetStr = formatBudget(budget);

      return {
        id: job.id as string,
        title: job.title as string,
        category: (((job.job_categories as unknown as { name?: string })?.name as string) || 'Inne') as string,
        status: (job.status as string) || 'active',
        budget: budgetStr,
        applications: applicationCounts[job.id as string] || 0,
        deadline: (job.deadline as string) || '',
        address: location as string
      };
    });

    return formattedJobs;
  } catch (error) {
    console.error('Error in fetchJobsByWorkHistory:', error);
    return [];
  }
}



