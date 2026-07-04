import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { formatContestLocation } from '../contest-display';
import { CONTEST_TENDERS_OR_FILTER } from './jobs';
import {
  contestsTable,
  ensureContestsSchemaResolved,
  shouldApplyContestTendersFilter,
} from './schema-compat';

function parseContestLocationDisplay(value: unknown): string | null {
  const formatted = formatContestLocation(value as Parameters<typeof formatContestLocation>[0]);
  if (!formatted || formatted === 'Unknown') return null;
  return formatted;
}

export interface AdminJobListingRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  type: string | null;
  managerId: string;
  managerFullName: string | null;
  managerCompanyName: string | null;
  companyId: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  location: string | null;
  address: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  budgetType: string | null;
  currency: string | null;
  projectDuration: string | null;
  deadline: string | null;
  urgency: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  buildingType: string | null;
  buildingYear: number | null;
  surfaceArea: string | null;
  additionalInfo: string | null;
  requirements: string[] | null;
  responsibilities: string[] | null;
  skillsRequired: string[] | null;
  applicationsCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AdminTenderListingRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  managerId: string;
  managerFullName: string | null;
  managerCompanyName: string | null;
  companyId: string | null;
  categoryId: string | null;
  location: string | null;
  address: string | null;
  estimatedValue: number | null;
  currency: string | null;
  submissionDeadline: string | null;
  evaluationDeadline: string | null;
  projectDuration: string | null;
  requirements: string[] | null;
  wadium: number | null;
  bidsCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

function logSupabaseError(label: string, error: unknown): void {
  if (error && typeof error === 'object') {
    const e = error as { message?: string; details?: string; hint?: string; code?: string };
    console.error(label, {
      message: e.message,
      details: e.details,
      hint: e.hint,
      code: e.code,
    });
  } else {
    console.error(label, error);
  }
}

export async function fetchAdminJobListings(supabase: SupabaseClient<Database>): Promise<AdminJobListingRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data, error } = await sb
    .from('jobs')
    .select(
      `
      id, title, description, status, type, manager_id, company_id, category_id, subcategory_id,
      location, address, budget_min, budget_max, budget_type, currency, project_duration,
      deadline, urgency, contact_person, contact_phone, contact_email, building_type,
      building_year, surface_area, additional_info, requirements, responsibilities,
      skills_required, applications_count, created_at, updated_at,
      manager:user_profiles!jobs_manager_id_fkey ( first_name, last_name ),
      company:companies!jobs_company_id_fkey ( name )
    `
    )
    .order('created_at', { ascending: false })
    .limit(150);

  if (error) {
    logSupabaseError('fetchAdminJobListings', error);
    return [];
  }

  return (data ?? []).map((r: Record<string, unknown>) => {
    const manager = r.manager as { first_name?: string; last_name?: string } | null;
    const company = r.company as { name?: string } | null;
    const managerFullName = manager
      ? [manager.first_name, manager.last_name].filter(Boolean).join(' ').trim() || null
      : null;
    return {
    id: r.id as string,
    title: r.title as string,
    description: (r.description as string) ?? null,
    status: r.status as string,
    type: (r.type as string) ?? null,
    managerId: r.manager_id as string,
    managerFullName,
    managerCompanyName: company?.name ?? null,
    companyId: (r.company_id as string) ?? null,
    categoryId: (r.category_id as string) ?? null,
    subcategoryId: (r.subcategory_id as string) ?? null,
    location: (r.location as string) ?? null,
    address: (r.address as string) ?? null,
    budgetMin: (r.budget_min as number) ?? null,
    budgetMax: (r.budget_max as number) ?? null,
    budgetType: (r.budget_type as string) ?? null,
    currency: (r.currency as string) ?? null,
    projectDuration: (r.project_duration as string) ?? null,
    deadline: (r.deadline as string) ?? null,
    urgency: (r.urgency as string) ?? null,
    contactPerson: (r.contact_person as string) ?? null,
    contactPhone: (r.contact_phone as string) ?? null,
    contactEmail: (r.contact_email as string) ?? null,
    buildingType: (r.building_type as string) ?? null,
    buildingYear: (r.building_year as number) ?? null,
    surfaceArea: (r.surface_area as string) ?? null,
    additionalInfo: (r.additional_info as string) ?? null,
    requirements: (r.requirements as string[]) ?? null,
    responsibilities: (r.responsibilities as string[]) ?? null,
    skillsRequired: (r.skills_required as string[]) ?? null,
    applicationsCount: (r.applications_count as number) ?? 0,
    createdAt: (r.created_at as string) ?? null,
    updatedAt: (r.updated_at as string) ?? null,
    };
  });
}

function isSubmissionDeadlineExpired(deadline: string | null): boolean {
  if (!deadline) return false;
  const deadlineDate = new Date(deadline);
  if (Number.isNaN(deadlineDate.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineAtMidnight = new Date(deadlineDate);
  deadlineAtMidnight.setHours(0, 0, 0, 0);
  return deadlineAtMidnight < today;
}

export async function fetchAdminTenderListings(
  supabase: SupabaseClient<Database>
): Promise<AdminTenderListingRow[]> {
  await ensureContestsSchemaResolved(supabase);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from(contestsTable())
    .select(
      `
      id, title, description, status, manager_id, company_id, category_id,
      location, address, estimated_value, currency, submission_deadline,
      evaluation_deadline, project_duration, requirements, wadium, offers_count,
      created_at, updated_at,
      manager:user_profiles!tenders_manager_id_fkey ( first_name, last_name ),
      company:companies!tenders_company_id_fkey ( name )
    `
    );

  if (shouldApplyContestTendersFilter('contest')) {
    query = query.or(CONTEST_TENDERS_OR_FILTER);
  }

  query = query.eq('status', 'active').eq('is_public', true);

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    logSupabaseError('fetchAdminTenderListings', error);
    return [];
  }

  return (data ?? [])
    .map((r: Record<string, unknown>) => {
      const manager = r.manager as { first_name?: string; last_name?: string } | null;
      const company = r.company as { name?: string } | null;
      const managerFullName = manager
        ? [manager.first_name, manager.last_name].filter(Boolean).join(' ').trim() || null
        : null;
      const submissionDeadline = (r.submission_deadline as string) ?? null;
      return {
        id: r.id as string,
        title: r.title as string,
        description: (r.description as string) ?? null,
        status: r.status as string,
        managerId: r.manager_id as string,
        managerFullName,
        managerCompanyName: company?.name ?? null,
        companyId: (r.company_id as string) ?? null,
        categoryId: (r.category_id as string) ?? null,
        location: parseContestLocationDisplay(r.location),
        address: (r.address as string) ?? null,
        estimatedValue: (r.estimated_value as number) ?? null,
        currency: (r.currency as string) ?? null,
        submissionDeadline,
        evaluationDeadline: (r.evaluation_deadline as string) ?? null,
        projectDuration: (r.project_duration as string) ?? null,
        requirements: (r.requirements as string[]) ?? null,
        wadium: (r.wadium as number) ?? null,
        bidsCount: (r.offers_count as number) ?? 0,
        createdAt: (r.created_at as string) ?? null,
        updatedAt: (r.updated_at as string) ?? null,
      };
    })
    .filter((row) => !isSubmissionDeadlineExpired(row.submissionDeadline));
}
