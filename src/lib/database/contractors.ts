import { createClient } from '../supabase/client';
import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { ContractorProfile, ServicePricing } from '../../types/contractor';
import { ilikePattern } from './escape-postgrest-filter';
import { buildKonkursPath } from '../listing/konkurs-slug';

// Re-export ContractorProfile for convenience
export type { ContractorProfile, ServicePricing };

// Additional types for contractor dashboard
export interface ContractorApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  status: 'submitted' | 'under_review' | 'shortlisted' | 'accepted' | 'rejected' | 'cancelled' | 'pending';
  appliedAt: string;
  proposedPrice?: string;
  /** Raw `proposed_timeline` (days) from DB. */
  proposedTimelineDays?: number | null;
  estimatedCompletion?: string;
  /** VAT percent stored with the offer (8 or 23). */
  vatRate?: 8 | 23;
  proposedStartDate?: string | null;
  availableFrom?: string | null;
  guaranteePeriodMonths?: number | null;
  teamSize?: number | null;
  coverLetter?: string;
  experience?: string;
  attachments?: Array<Record<string, unknown>>;
  certificates?: string[];
  notes?: string;
  managerFeedbackMessage?: string;
  reviewedAt?: string;
  jobLocation?: string;
  jobCategory?: string;
  postedTime?: string; // When the job was posted (calculated from published_at or created_at)
}

export interface ContractorBid {
  id: string;
  tenderId: string;
  tenderTitle: string;
  companyName: string;
  status: 'submitted' | 'under_review' | 'shortlisted' | 'accepted' | 'rejected' | 'cancelled' | 'pending'; // pending is legacy, use submitted
  bidAmount: string;
  submittedAt: string;
  validUntil: string;
  // Additional fields for applications view
  location?: string;
  category?: string;
  proposedTimeline?: number; // in days
  technicalProposal?: string;
  managerFeedbackMessage?: string;
  reviewedAt?: string;
  postedTime?: string; // When the tender was posted (calculated from published_at or created_at)
}

export interface ContractorStats {
  totalApplications: number;
  acceptedApplications: number;
  totalBids: number;
  acceptedBids: number;
  completedProjects: number;
  averageRating: number;
  totalEarnings: number;
  responseTime: string;
  onTimeCompletion: number;
}

export interface Certificate {
  id: string;
  name: string;
  type: string;
  number: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  isVerified: boolean;
}

export interface ContractorDashboardData {
  profile: ContractorProfile;
  applications: ContractorApplication[];
  bids: ContractorBid[];
  stats: ContractorStats;
  certificates: Certificate[];
}

// Interface for browse page contractor data
export interface BrowseContractor {
  id: string;
  name: string;
  short_name?: string;
  city: string;
  avatar_url?: string;
  plan_type: 'basic' | 'pro' | 'premium';
  last_active: string;
  is_verified: boolean;
  verification_level: string;
  founded_year?: number;
  employee_count?: string;
  description?: string; // Real description from companies table
  primary_services: string[];
  specializations: string[];
  service_area: string[];
  working_hours: string;
  availability_status: string;
  next_available: string;
  years_in_business: number;
  completed_projects: number;
  certifications: string[];
  hourly_rate_min: string;
  hourly_rate_max: string;
  price_range: string;
  has_oc: boolean;
  has_ac: boolean;
  oc_amount: string;
  ac_amount: string;
  response_time: string;
  on_time_completion: number;
  budget_accuracy: number;
  rehire_rate: number;
  rating: number;
  review_count: number;
}

export interface ContractorFilters {
  city?: string;
  category?: string;
  searchQuery?: string;
  sortBy?: 'rating' | 'jobs' | 'reviews' | 'name';
  limit?: number;
  offset?: number;
}

/**
 * Fetch contractors for the browse page with optional filtering
 */
export async function fetchContractors(
  supabaseOrFilters?: SupabaseClient<Database> | ContractorFilters,
  filtersOrUndefined?: ContractorFilters
): Promise<BrowseContractor[]> {
  // Handle both signatures: (filters) and (supabase, filters)
  let supabase: SupabaseClient<Database>;
  let filters: ContractorFilters;
  
  // Check if first param is a Supabase client (has 'from' method)
  if (supabaseOrFilters && typeof supabaseOrFilters === 'object' && typeof (supabaseOrFilters as SupabaseClient<Database>).from === 'function') {
    // First param is supabase (new signature from data adapter)
    supabase = supabaseOrFilters as SupabaseClient<Database>;
    filters = filtersOrUndefined || {};
  } else {
    // First param is filters (old signature for direct calls)
    filters = (supabaseOrFilters || {}) as ContractorFilters;
    supabase = createClient();
  }
  
  const {
    city,
    searchQuery,
    sortBy = 'rating',
    limit = 50,
    offset = 0
  } = filters;

  try {
    // Use type assertion to avoid "Type instantiation is excessively deep" error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseClient = supabase as any;
    let query = supabaseClient
      .from('companies')
      .select(`
        id,
        name,
        city,
        logo_url,
        is_verified,
        verification_level,
        founded_year,
        employee_count,
        updated_at,
        description,
        plan_type,
        last_active,
        profile_data,
        experience_data,
        insurance_data,
        stats_data
      `)
      .eq('type', 'contractor')
      .eq('is_public', true); // Only show public profiles

    // Apply filters
    if (city) {
      query = query.eq('city', city);
    }

    if (searchQuery) {
      const term = ilikePattern(searchQuery);
      query = query.or(`name.ilike.${term},description.ilike.${term}`);
    }

    // Apply sorting (we'll sort after fetching ratings)
    // For now, just order by name as we'll sort by ratings/reviews after fetching the data
    query = query.order('name', { ascending: true });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching contractors:', error);
      throw new Error('Failed to fetch contractors');
    }

    // Fetch ratings for all contractors
    const contractorIds = ((data || []) as Array<{ id: string }>).map((company: { id: string }) => company.id);
    let ratingsMap: { [key: string]: { company_id: string; average_rating: number; total_reviews: number } } = {};
    
    if (contractorIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: ratingsData } = await (supabase as any)
        .from('company_ratings')
        .select('company_id, average_rating, total_reviews')
        .in('company_id', contractorIds);
      
      if (ratingsData) {
        ratingsMap = (ratingsData as Array<{ company_id: string; average_rating: number; total_reviews: number }>).reduce((acc, rating) => {
          acc[rating.company_id] = rating;
          return acc;
        }, {} as { [key: string]: { company_id: string; average_rating: number; total_reviews: number } });
      }
    }

    // Helper function to safely parse JSONB fields
    const parseJsonbField = (value: unknown, defaultValue: unknown = null): unknown => {
      if (!value) return defaultValue;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return defaultValue;
        }
      }
      return value;
    };

    const getJsonbString = (value: unknown, defaultValue: string = ''): string => {
      if (!value) return defaultValue;
      if (typeof value === 'string') return value;
      return String(value) || defaultValue;
    };

    const getJsonbNumber = (value: unknown, defaultValue: number = 0): number => {
      if (value === null || value === undefined) return defaultValue;
      const num = typeof value === 'string' ? parseFloat(value) : Number(value);
      return isNaN(num) ? defaultValue : num;
    };

    const getJsonbBoolean = (value: unknown, defaultValue: boolean = false): boolean => {
      if (value === null || value === undefined) return defaultValue;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true' || value === '1';
      }
      return Boolean(value) || defaultValue;
    };

    // Transform data to BrowseContractor format
    let contractors: BrowseContractor[] = ((data || []) as Array<Record<string, unknown>>).map((company: Record<string, unknown>) => {
      const companyId = String(company.id ?? '');
      const ratings = ratingsMap[companyId];
      
      // Parse JSONB columns
      const profileData = (company.profile_data as Record<string, unknown>) || {};
      const experienceData = (company.experience_data as Record<string, unknown>) || {};
      const insuranceData = (company.insurance_data as Record<string, unknown>) || {};
      const statsData = (company.stats_data as Record<string, unknown>) || {};

      // Parse array fields from JSONB
      const primaryServices = parseJsonbField(profileData.primary_services, []);
      const specializations = parseJsonbField(profileData.specializations, []);
      const serviceArea = parseJsonbField(profileData.service_area, []);
      const certifications = parseJsonbField(experienceData.certifications, []);

      // Calculate years_in_business from founded_year if not in experience_data
      const yearsInBusinessFromData = getJsonbNumber(experienceData.years_in_business);
      const foundedYear = typeof company.founded_year === 'number' ? company.founded_year : null;
      const yearsInBusiness = yearsInBusinessFromData > 0 
        ? yearsInBusinessFromData 
        : (foundedYear ? new Date().getFullYear() - foundedYear : 0);

      const companyName = String(company.name ?? '');
      const companyCity = String(company.city ?? '');

      return {
        id: companyId,
        name: companyName,
        short_name: companyName.split(' ')[0],
        city: companyCity,
        avatar_url: company.logo_url ? String(company.logo_url) : undefined,
        plan_type: (company.plan_type as 'basic' | 'pro' | 'premium') || 'basic',
        last_active: String(company.last_active || company.updated_at || new Date().toISOString()),
        is_verified: Boolean(company.is_verified),
        verification_level: String(company.verification_level || 'basic'),
        founded_year: typeof company.founded_year === 'number' ? company.founded_year : undefined,
        employee_count: String(company.employee_count || '1-5'),
        description: company.description ? String(company.description) : undefined, // Real description from database
        primary_services: Array.isArray(primaryServices) ? (primaryServices as string[]) : [],
        specializations: Array.isArray(specializations) ? (specializations as string[]) : [],
        service_area: Array.isArray(serviceArea) && serviceArea.length > 0 
          ? (serviceArea as string[]) 
          : (companyCity ? [companyCity] : []),
        working_hours: getJsonbString(profileData.working_hours, '8:00-16:00'),
        availability_status: getJsonbString(profileData.availability_status, 'dostępny'),
        next_available: getJsonbString(profileData.next_available, new Date().toISOString()),
        years_in_business: yearsInBusiness,
        completed_projects: getJsonbNumber(experienceData.completed_projects, 0),
        certifications: Array.isArray(certifications) ? (certifications as string[]) : [],
        hourly_rate_min: getJsonbString(profileData.hourly_rate_min, '0'),
        hourly_rate_max: getJsonbString(profileData.hourly_rate_max, '0'),
        price_range: getJsonbString(profileData.price_range, 'Wycena indywidualna'),
        has_oc: getJsonbBoolean(insuranceData.has_oc, false),
        has_ac: getJsonbBoolean(insuranceData.has_ac, false),
        oc_amount: getJsonbString(insuranceData.oc_amount, ''),
        ac_amount: getJsonbString(insuranceData.ac_amount, ''),
        response_time: getJsonbString(statsData.response_time, '24h'),
        on_time_completion: getJsonbNumber(statsData.on_time_completion, 0),
        budget_accuracy: getJsonbNumber(statsData.budget_accuracy, 0),
        rehire_rate: getJsonbNumber(statsData.rehire_rate, 0),
        rating: (ratings as { average_rating?: number })?.average_rating || 0,
        review_count: (ratings as { total_reviews?: number })?.total_reviews || 0
      };
    });

    // Apply sorting after fetching ratings
    switch (sortBy) {
      case 'rating':
        contractors = contractors.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'reviews':
        contractors = contractors.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
        break;
      case 'jobs':
        contractors = contractors.sort((a, b) => (b.completed_projects || 0) - (a.completed_projects || 0));
        break;
      case 'name':
      default:
        contractors = contractors.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return contractors;
  } catch (error) {
    console.error('Error in fetchContractors:', error);
    throw error;
  }
}

/**
 * Fetch contractors that have worked with a specific company
 * (contractors with accepted job applications or accepted tender bids)
 */
export async function fetchContractorsByWorkHistory(
  supabase: SupabaseClient<Database>,
  managerCompanyId: string
): Promise<Array<{
  id: string;
  name: string;
  specialization: string;
  rating: number;
  completedJobs: number;
  currentJob: string;
  avatar: string;
}>> {
  try {
    if (!managerCompanyId) {
      return [];
    }

    // Step 1: Get all job IDs for this company
    const { data: companyJobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, title')
      .eq('company_id', managerCompanyId);

    // Step 2: Get all tender IDs for this company
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: companyTenders, error: tendersError } = await (supabase as any)
      .from('contests')
      .select('id, title')
      .eq('company_id', managerCompanyId);

    if (jobsError) {
      console.error('Error fetching company jobs:', jobsError);
    }
    if (tendersError) {
      console.error('Error fetching company tenders:', tendersError);
    }

    const jobIds = (companyJobs || []).map((job: { id: string }) => job.id);
    const tenderIds = (companyTenders || []).map((tender: { id: string }) => tender.id);

    // Step 3: Get accepted applications for these jobs
    type ApplicationWithJob = {
      company_id: string;
      job_id: string;
      submitted_at: string;
      jobs: { title: string } | null;
    };
    let acceptedApplications: ApplicationWithJob[] = [];
    if (jobIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: applications, error: appsError } = await (supabase as any)
        .from('job_applications')
        .select(`
          company_id,
          job_id,
          submitted_at,
          jobs (
            title
          )
        `)
        .in('job_id', jobIds)
        .eq('status', 'accepted');

      if (appsError) {
        console.error('Error fetching accepted applications:', appsError);
      } else {
        acceptedApplications = ((applications || []) as ApplicationWithJob[]);
      }
    }

    // Step 4: Get accepted bids for these tenders
    type BidWithTender = {
      company_id: string;
      contest_id: string;
      submitted_at: string;
      contests: { title: string } | null;
    };
    let acceptedBids: BidWithTender[] = [];
    if (tenderIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: bids, error: bidsError } = await (supabase as any)
        .from('contest_offers')
        .select(`
          company_id,
          contest_id,
          submitted_at,
          contests (
            title
          )
        `)
        .in('contest_id', tenderIds)
        .eq('status', 'accepted');

      if (bidsError) {
        console.error('Error fetching accepted bids:', bidsError);
      } else {
        acceptedBids = ((bids || []) as BidWithTender[]);
      }
    }

    // Collect unique contractor company IDs and their most recent job/tender titles
    const contractorMap = new Map<string, { companyId: string; latestJobTitle: string; latestDate: string }>();

    // Process applications
    for (const app of acceptedApplications) {
      const companyId = app.company_id;
      if (!companyId) continue;

      const jobTitle = app.jobs?.title || '';
      const submittedAt = app.submitted_at || '';

      if (!contractorMap.has(companyId)) {
        contractorMap.set(companyId, { 
          companyId, 
          latestJobTitle: jobTitle,
          latestDate: submittedAt
        });
      } else {
        const existing = contractorMap.get(companyId);
        if (existing && submittedAt > existing.latestDate) {
          existing.latestJobTitle = jobTitle;
          existing.latestDate = submittedAt;
        }
      }
    }

    // Process bids
    for (const bid of acceptedBids) {
      const companyId = bid.company_id;
      if (!companyId) continue;

      const tenderTitle = bid.contests?.title || '';
      const submittedAt = bid.submitted_at || '';

      if (!contractorMap.has(companyId)) {
        contractorMap.set(companyId, { 
          companyId, 
          latestJobTitle: tenderTitle,
          latestDate: submittedAt
        });
      } else {
        const existing = contractorMap.get(companyId);
        if (existing && submittedAt > existing.latestDate) {
          existing.latestJobTitle = tenderTitle;
          existing.latestDate = submittedAt;
        }
      }
    }

    const contractorCompanyIds = Array.from(contractorMap.keys());

    if (contractorCompanyIds.length === 0) {
      return [];
    }

    // Step 5: Fetch contractor company details
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        logo_url,
        profile_data,
        experience_data
      `)
      .in('id', contractorCompanyIds)
      .eq('type', 'contractor');

    if (companiesError) {
      console.error('Error fetching contractor companies:', companiesError);
      return [];
    }

    if (!companies || companies.length === 0) {
      return [];
    }

    // Step 6: Fetch ratings for all contractors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ratingsData } = await (supabase as any)
      .from('company_ratings')
      .select('company_id, average_rating, total_reviews')
      .in('company_id', contractorCompanyIds);

    const ratingsMap: { [key: string]: { company_id: string; average_rating: number; total_reviews: number } } = {};
    if (ratingsData) {
      ratingsData.forEach((rating: { company_id: string; average_rating: number; total_reviews: number }) => {
        ratingsMap[rating.company_id] = rating;
      });
    }

    // Count completed jobs (accepted applications + accepted bids) for each contractor with this company
    const completedJobsMap: { [key: string]: number } = {};
    
    // Count from applications
    for (const app of acceptedApplications) {
      const companyId = app.company_id;
      if (companyId) {
        completedJobsMap[companyId] = (completedJobsMap[companyId] || 0) + 1;
      }
    }

    // Count from bids
    for (const bid of acceptedBids) {
      const companyId = bid.company_id;
      if (companyId) {
        completedJobsMap[companyId] = (completedJobsMap[companyId] || 0) + 1;
      }
    }

    // Helper functions for parsing JSONB
    const parseJsonbField = (value: unknown, defaultValue: unknown = null): unknown => {
      if (!value) return defaultValue;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return defaultValue;
        }
      }
      return value;
    };

    // Format contractors for display
    const contractors = ((companies || []) as unknown as Array<Record<string, unknown>>).map((company: Record<string, unknown>) => {
      const companyId = String(company.id ?? '');
      const ratings = ratingsMap[companyId] || {};
      const profileData = (company.profile_data as Record<string, unknown>) || {};
      const specializations = parseJsonbField(profileData.specializations, []);
      
      // Get specialization (first one from specializations array, or use primary_services, or default)
      const primaryServices = parseJsonbField(profileData.primary_services, []);
      let specialization = 'Usługi ogólne';
      if (Array.isArray(specializations) && specializations.length > 0) {
        specialization = String(specializations[0]);
      } else if (Array.isArray(primaryServices) && primaryServices.length > 0) {
        specialization = String(primaryServices[0]);
      }

      const contractorInfo = contractorMap.get(companyId);
      const currentJob = contractorInfo?.latestJobTitle || 'Brak aktualnych projektów';
      const completedJobs = completedJobsMap[companyId] || 0;

      return {
        id: companyId,
        name: String(company.name ?? ''),
        specialization: specialization,
        rating: (ratings as { average_rating?: number })?.average_rating || 0,
        completedJobs: completedJobs,
        currentJob: currentJob,
        avatar: company.logo_url ? String(company.logo_url) : ''
      };
    });

    // Sort by rating (highest first)
    contractors.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    return contractors;
  } catch (error) {
    console.error('Error in fetchContractorsByWorkHistory:', error);
    return [];
  }
}

/**
 * Fetch a single contractor by ID with full profile data
 * @param id - Contractor company ID
 * @param supabaseClient - Optional Supabase client (for server-side usage)
 */
export async function fetchContractorById(
  id: string,
  supabaseClient?: SupabaseClient
): Promise<ContractorProfile | null> {
  const supabase = supabaseClient || createClient();

  try {
    // Fetch company data (don't filter by type to be more flexible)
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select(`
        *,
        profile_data,
        experience_data,
        insurance_data,
        stats_data
      `)
      .eq('id', id)
      .single();

    if (companyError || !company) {
      console.error('Error fetching contractor:', companyError);
      return null;
    }

    // Fetch real ratings data (use maybeSingle to handle missing records)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ratingsData } = await (supabase as any)
      .from('company_ratings')
      .select('average_rating, total_reviews, rating_breakdown, category_ratings')
      .eq('company_id', id)
      .maybeSingle();

    // Parse JSONB fields (cast to any to access JSONB fields that TypeScript doesn't infer from select('*'))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const companyWithJsonb = company as any;
    // eslint-disable @typescript-eslint/no-explicit-any
    const profileData = companyWithJsonb.profile_data || {};
    const experienceData = companyWithJsonb.experience_data || {};
    const insuranceData = companyWithJsonb.insurance_data || {};
    const statsData = companyWithJsonb.stats_data || {};

    // Helper functions for parsing JSONB
    const parseJsonbField = (value: unknown, defaultValue: unknown = null): unknown => {
      if (!value) return defaultValue;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return defaultValue;
        }
      }
      return value;
    };

    const getJsonbString = (value: unknown, defaultValue: string = ''): string => {
      if (!value) return defaultValue;
      if (typeof value === 'string') return value;
      return String(value) || defaultValue;
    };

    const getJsonbNumber = (value: unknown, defaultValue: number = 0): number => {
      if (value === null || value === undefined) return defaultValue;
      const num = typeof value === 'string' ? parseFloat(value) : Number(value);
      return isNaN(num) ? defaultValue : num;
    };

    const getJsonbBoolean = (value: unknown, defaultValue: boolean = false): boolean => {
      if (value === null || value === undefined) return defaultValue;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true' || value === '1';
      }
      return Boolean(value) || defaultValue;
    };

    // Parse services from profile_data
    const primaryServices = parseJsonbField(profileData.primary_services, []);
    const secondaryServices = parseJsonbField(profileData.secondary_services, []);
    const specializations = parseJsonbField(profileData.specializations, []);

    // Parse service pricing from profile_data
    const servicePricing = parseJsonbField(profileData.service_pricing, {});

    // Transform to ContractorProfile format with real data
    const contractor: ContractorProfile = {
      id: companyWithJsonb.id,
      name: companyWithJsonb.name,
      companyName: companyWithJsonb.name,
      companyType: 'sp_z_oo',
      avatar: companyWithJsonb.logo_url,
      coverImage: '/api/placeholder/800/300',
      location: {
        city: companyWithJsonb.city || 'Warszawa',
        district: companyWithJsonb.city || 'Warszawa',
        coordinates: { lat: 52.2297, lng: 21.0122 }
      },
      contactInfo: {
        phone: companyWithJsonb.phone || '',
        email: companyWithJsonb.email || '',
        website: companyWithJsonb.website,
        address: companyWithJsonb.address || ''
      },
      businessInfo: {
        nip: companyWithJsonb.nip || '',
        regon: companyWithJsonb.regon || '',
        krs: companyWithJsonb.krs,
        yearEstablished: companyWithJsonb.founded_year || 2020,
        employeeCount: companyWithJsonb.employee_count || '1-5'
      },
      rating: {
        overall: ratingsData?.average_rating || 0,
        reviewsCount: ratingsData?.total_reviews || 0,
        categories: {
          quality: ratingsData?.category_ratings?.quality || 0,
          timeliness: ratingsData?.category_ratings?.timeliness || 0,
          communication: ratingsData?.category_ratings?.communication || 0,
          pricing: ratingsData?.category_ratings?.pricing || 0
        }
      },
      verification: {
        status:
          companyWithJsonb.registry_status === 'active' || companyWithJsonb.is_verified
            ? 'verified'
            : 'unverified',
        badges: companyWithJsonb.verification_level ? [companyWithJsonb.verification_level] : [],
        documents: [],
        lastVerified: companyWithJsonb.updated_at
      },
      services: {
        primary: Array.isArray(primaryServices) ? primaryServices : [],
        secondary: Array.isArray(secondaryServices) ? secondaryServices : [],
        specializations: Array.isArray(specializations) ? specializations : []
      },
      experience: {
        yearsInBusiness: getJsonbNumber(experienceData.years_in_business, companyWithJsonb.founded_year ? new Date().getFullYear() - companyWithJsonb.founded_year : 5),
        completedProjects: getJsonbNumber(experienceData.completed_projects, 0),
        projectTypes: (parseJsonbField(experienceData.project_types, {}) as Record<string, number>) || {},
        certifications: (parseJsonbField(experienceData.certifications, []) as string[]) || []
      },
      portfolio: {
        images: ['/api/placeholder/400/300'],
        featuredProjects: []
      },
      pricing: {
        hourlyRate: {
          min: getJsonbNumber(profileData.hourly_rate_min, 50),
          max: getJsonbNumber(profileData.hourly_rate_max, 150)
        },
        projectBased: getJsonbBoolean(profileData.project_based, true),
        negotiable: getJsonbBoolean(profileData.negotiable, true),
        paymentTerms: (parseJsonbField(profileData.payment_terms, ['Zaliczka', 'Płatność etapowa', 'Faktura VAT']) as string[]) || ['Zaliczka', 'Płatność etapowa', 'Faktura VAT'],
        servicePricing: servicePricing && typeof servicePricing === 'object' ? servicePricing as Record<string, ServicePricing> : undefined
      },
      availability: {
        status: getJsonbString(profileData.availability_status, 'dostępny') as 'dostępny' | 'ograniczona_dostępność' | 'zajęty',
        nextAvailable: getJsonbString(profileData.next_available, new Date().toISOString()),
        workingHours: getJsonbString(profileData.working_hours, '8:00-16:00'),
        serviceArea: (parseJsonbField(profileData.service_area, [companyWithJsonb.city || 'Warszawa']) as string[]) || [companyWithJsonb.city || 'Warszawa']
      },
      insurance: {
        hasOC: getJsonbBoolean(insuranceData.has_oc, false),
        ocAmount: getJsonbString(insuranceData.oc_amount, '0'),
        hasAC: getJsonbBoolean(insuranceData.has_ac, false),
        acAmount: getJsonbString(insuranceData.ac_amount, '0'),
        validUntil: getJsonbString(insuranceData.valid_until, undefined)
      },
      reviews: [],
      stats: {
        responseTime: getJsonbString(statsData.response_time, '24h'),
        onTimeCompletion: getJsonbNumber(statsData.on_time_completion, 0),
        budgetAccuracy: getJsonbNumber(statsData.budget_accuracy, 0),
        rehireRate: getJsonbNumber(statsData.rehire_rate, 0)
      },
      plan: 'basic',
      joinedDate: companyWithJsonb.created_at,
      lastActive: companyWithJsonb.updated_at
    };

    return contractor;
  } catch (error) {
    console.error('Error in fetchContractorById:', error);
    throw error;
  }
}


/**
 * Fetch contractor dashboard data
 */
export async function fetchContractorDashboardData(supabase: SupabaseClient<Database>, contractorId: string): Promise<ContractorDashboardData> {
  try {
    // Fetch contractor profile
    const profile = await fetchContractorById(contractorId);
    if (!profile) {
      throw new Error('Contractor not found');
    }

    // Fetch applications with complete job details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: applications } = await (supabase as any)
      .from('job_applications')
      .select(`
        id,
        job_id,
        proposed_price,
        proposed_timeline,
        vat_rate,
        proposed_start_date,
        available_from,
        guarantee_period,
        team_size,
        cover_letter,
        experience,
        attachments,
        certificates,
        notes,
        manager_feedback_message,
        reviewed_at,
        status,
        submitted_at,
        created_at,
        job:jobs (
          id,
          title,
          description,
          location,
          budget_min,
          budget_max,
          budget_type,
          currency,
          deadline,
          urgency,
          category:job_categories (
            id,
            name
          ),
          company:companies (
            id,
            name,
            logo_url,
            is_verified
          )
        )
      `)
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false });

    // Helper function to convert days to readable format
    const formatTimeline = (days: number | null | undefined): string | undefined => {
      if (!days) return undefined;
      if (days < 7) return `${days} ${days === 1 ? 'dzień' : 'dni'}`;
      if (days < 30) {
        const weeks = Math.floor(days / 7);
        const remainingDays = days % 7;
        if (remainingDays === 0) {
          return `${weeks} ${weeks === 1 ? 'tydzień' : weeks < 5 ? 'tygodnie' : 'tygodni'}`;
        }
        return `${weeks} ${weeks === 1 ? 'tydzień' : 'tygodnie'} ${remainingDays} ${remainingDays === 1 ? 'dzień' : 'dni'}`;
      }
      const months = Math.floor(days / 30);
      const remainingDays = days % 30;
      if (remainingDays === 0) {
        return `${months} ${months === 1 ? 'miesiąc' : months < 5 ? 'miesiące' : 'miesięcy'}`;
      }
      return `${months} ${months === 1 ? 'miesiąc' : 'miesiące'} ${remainingDays} ${remainingDays === 1 ? 'dzień' : 'dni'}`;
    };

    const formattedApplications: ContractorApplication[] = ((applications as Array<Record<string, unknown>>) || []).map((app: Record<string, unknown>) => {
      const job = app.job as Record<string, unknown> | undefined;
      const loc = job?.location;
      return {
        id: String(app.id ?? ''),
        jobId: String(app.job_id ?? ''),
        jobTitle: String(job?.title ?? ''),
        companyName: String((job?.company as Record<string, unknown>)?.name ?? ''),
        status: String(app.status ?? 'pending') as 'submitted' | 'under_review' | 'shortlisted' | 'accepted' | 'rejected' | 'cancelled' | 'pending',
        appliedAt: String(app.submitted_at ?? app.created_at ?? ''),
        proposedPrice: app.proposed_price != null ? String(app.proposed_price) : undefined,
        proposedTimelineDays:
          app.proposed_timeline !== null && app.proposed_timeline !== undefined
            ? Number(app.proposed_timeline)
            : null,
        estimatedCompletion: formatTimeline(app.proposed_timeline as number | null | undefined),
        vatRate: app.vat_rate === 8 ? 8 : 23,
        proposedStartDate: (app.proposed_start_date as string | null) ?? null,
        availableFrom: (app.available_from as string | null) ?? null,
        guaranteePeriodMonths:
          app.guarantee_period !== null && app.guarantee_period !== undefined
            ? Number(app.guarantee_period)
            : null,
        teamSize: app.team_size !== null && app.team_size !== undefined ? Number(app.team_size) : null,
        coverLetter: String(app.cover_letter ?? ''),
        experience: String(app.experience ?? ''),
        attachments: (app.attachments as Array<Record<string, unknown>>) || [],
        certificates: (app.certificates as string[]) || [],
        notes: app.notes as string | undefined,
        managerFeedbackMessage: app.manager_feedback_message as string | undefined,
        reviewedAt: app.reviewed_at as string | undefined,
        jobLocation:
          typeof loc === 'string'
            ? loc
            : String((loc as Record<string, unknown> | undefined)?.city ?? 'Nieznana lokalizacja'),
        jobCategory: String(((job?.category as Record<string, unknown>)?.name as string) ?? 'Inne usługi'),
      };
    }) || [];

    // Fetch bids with more details for applications view
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bids } = await (supabase as any)
      .from('contest_offers')
      .select(`
        id,
        contest_id,
        bid_amount,
        proposed_timeline,
        technical_proposal,
        status,
        submitted_at,
        evaluated_at,
        valid_until,
        contests (
          title,
          location,
          job_categories (
            name
          ),
          companies (
            name
          )
        )
      `)
      .eq('company_id', contractorId)
      .order('submitted_at', { ascending: false });

    const formattedBids: ContractorBid[] = ((bids as Array<Record<string, unknown>>) || []).map((bid: Record<string, unknown>) => ({
      id: String(bid.id ?? ''),
      tenderId: String(bid.contest_id ?? ''),
      tenderTitle: String((bid.contests as Record<string, unknown>)?.title ?? ''),
      companyName: String(((bid.contests as Record<string, unknown>)?.companies as Record<string, unknown>)?.name ?? ''),
      status: String(bid.status ?? 'pending') as 'submitted' | 'under_review' | 'shortlisted' | 'accepted' | 'rejected' | 'cancelled' | 'pending',
      bidAmount: String(bid.bid_amount ?? ''),
      submittedAt: String(bid.submitted_at ?? ''),
      validUntil: String(bid.valid_until ?? ''),
      location: typeof (bid.contests as Record<string, unknown>)?.location === 'string' 
        ? (bid.contests as Record<string, unknown>).location as string
        : String(((bid.contests as Record<string, unknown>)?.location as Record<string, unknown>)?.city ?? 'Nieznana lokalizacja'),
      category: String(((bid.contests as Record<string, unknown>)?.job_categories as Record<string, unknown>)?.name ?? 'Przetarg'),
      proposedTimeline: bid.proposed_timeline as number | undefined,
      technicalProposal: bid.technical_proposal as string | undefined,
      reviewedAt: bid.evaluated_at as string | undefined // Use evaluated_at for tender_bids
    })) || [];

    // Fetch certificates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: certificates } = await (supabase as any)
      .from('certificates')
      .select('*')
      .eq('company_id', contractorId);

    const formattedCertificates: Certificate[] = ((certificates as Array<Record<string, unknown>>) || []).map((cert: Record<string, unknown>) => ({
      id: String(cert.id ?? ''),
      name: String(cert.name ?? ''),
      type: String(cert.type ?? ''),
      number: String(cert.number ?? ''),
      issuer: String(cert.issuer ?? ''),
      issueDate: String(cert.issue_date ?? ''),
      expiryDate: String(cert.expiry_date ?? ''),
      isVerified: Boolean(cert.is_verified ?? false)
    })) || [];

    // Calculate stats
    const stats: ContractorStats = {
      totalApplications: formattedApplications.length,
      acceptedApplications: formattedApplications.filter(app => app.status === 'accepted').length,
      totalBids: formattedBids.length,
      acceptedBids: formattedBids.filter(bid => bid.status === 'accepted').length,
      completedProjects: profile.experience.completedProjects,
      averageRating: profile.rating.overall,
      totalEarnings: 0, // Would need to calculate from completed projects
      responseTime: profile.stats.responseTime,
      onTimeCompletion: profile.stats.onTimeCompletion
    };

    return {
      profile,
      applications: formattedApplications,
      bids: formattedBids,
      stats,
      certificates: formattedCertificates
    };
  } catch (error) {
    console.error('Error fetching contractor dashboard data:', error);
    throw error;
  }
}

/**
 * Fetch contractor dashboard stats (for dashboard tab)
 */
export async function fetchContractorDashboardStats(
  supabase: SupabaseClient<Database>,
  companyId: string,
  contractorUserId: string
): Promise<{ profile: ContractorProfile; stats: ContractorStats }> {
  try {
    // Fetch contractor profile (company-scoped public profile)
    const profile = await fetchContractorById(companyId);
    if (!profile) {
      throw new Error('Contractor not found');
    }

    // Count offers by auth user (contractor_id), not company_id, so stats match RLS and survive primary-company changes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: applicationsCount } = await (supabase as any)
      .from('job_applications')
      .select('*', { count: 'exact', head: true })
      .eq('contractor_id', contractorUserId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: acceptedApplicationsCount } = await (supabase as any)
      .from('job_applications')
      .select('*', { count: 'exact', head: true })
      .eq('contractor_id', contractorUserId)
      .eq('status', 'accepted');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: bidsCount } = await (supabase as any)
      .from('contest_offers')
      .select('*', { count: 'exact', head: true })
      .eq('contractor_id', contractorUserId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: acceptedBidsCount } = await (supabase as any)
      .from('contest_offers')
      .select('*', { count: 'exact', head: true })
      .eq('contractor_id', contractorUserId)
      .eq('status', 'accepted');

    // Calculate stats
    const stats: ContractorStats = {
      totalApplications: applicationsCount || 0,
      acceptedApplications: acceptedApplicationsCount || 0,
      totalBids: bidsCount || 0,
      acceptedBids: acceptedBidsCount || 0,
      completedProjects: profile.experience.completedProjects,
      averageRating: profile.rating.overall,
      totalEarnings: 0, // Would need to calculate from completed projects
      responseTime: profile.stats.responseTime,
      onTimeCompletion: profile.stats.onTimeCompletion
    };

    return { profile, stats };
  } catch (error) {
    console.error('Error fetching contractor dashboard stats:', error);
    throw error;
  }
}

/**
 * Fetch contractor applications and bids (for applications tab).
 * @param contractorUserId — `user_profiles.id` / `auth.users.id` (matches `job_applications.contractor_id` / RLS).
 */
export async function fetchContractorApplications(
  supabase: SupabaseClient<Database>,
  contractorUserId: string
): Promise<{ applications: ContractorApplication[]; bids: ContractorBid[] }> {
  try {
    // Helper function to convert days to readable format
    const formatTimeline = (days: number | null | undefined): string | undefined => {
      if (!days) return undefined;
      if (days < 7) return `${days} ${days === 1 ? 'dzień' : 'dni'}`;
      if (days < 30) {
        const weeks = Math.floor(days / 7);
        const remainingDays = days % 7;
        if (remainingDays === 0) {
          return `${weeks} ${weeks === 1 ? 'tydzień' : weeks < 5 ? 'tygodnie' : 'tygodni'}`;
        }
        return `${weeks} ${weeks === 1 ? 'tydzień' : 'tygodnie'} ${remainingDays} ${remainingDays === 1 ? 'dzień' : 'dni'}`;
      }
      const months = Math.floor(days / 30);
      const remainingDays = days % 30;
      if (remainingDays === 0) {
        return `${months} ${months === 1 ? 'miesiąc' : months < 5 ? 'miesiące' : 'miesięcy'}`;
      }
      return `${months} ${months === 1 ? 'miesiąc' : 'miesiące'} ${remainingDays} ${remainingDays === 1 ? 'dzień' : 'dni'}`;
    };

    // Helper function to convert date to "time ago" format
    const getTimeAgo = (date: string | null | undefined): string | undefined => {
      if (!date) return undefined;
      const now = new Date();
      const past = new Date(date);
      const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

      if (diffInSeconds < 60) return 'Przed chwilą';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min temu`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} godz. temu`;
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} dni temu`;
      
      return past.toLocaleDateString('pl-PL');
    };

    // Fetch applications with complete job details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: applications } = await (supabase as any)
      .from('job_applications')
      .select(`
        id,
        job_id,
        proposed_price,
        proposed_timeline,
        vat_rate,
        proposed_start_date,
        available_from,
        guarantee_period,
        team_size,
        cover_letter,
        experience,
        attachments,
        certificates,
        notes,
        manager_feedback_message,
        reviewed_at,
        status,
        submitted_at,
        jobs (
          title,
          location,
          published_at,
          created_at,
          companies (
            name
          ),
          job_categories!jobs_category_id_fkey (
            name
          )
        )
      `)
      .eq('contractor_id', contractorUserId)
      .neq('admin_moderation_status', 'suspended')
      .order('submitted_at', { ascending: false });

    const formattedApplications: ContractorApplication[] = applications?.map(app => ({
      id: app.id,
      jobId: app.job_id,
      jobTitle: app.jobs?.title || '',
      companyName: app.jobs?.companies?.name || '',
      status: app.status || 'pending',
      appliedAt: app.submitted_at,
      proposedPrice: app.proposed_price,
      proposedTimelineDays:
        app.proposed_timeline !== null && app.proposed_timeline !== undefined
          ? Number(app.proposed_timeline)
          : null,
      estimatedCompletion: formatTimeline(app.proposed_timeline),
      vatRate: app.vat_rate === 8 ? 8 : 23,
      proposedStartDate: app.proposed_start_date ?? null,
      availableFrom: app.available_from ?? null,
      guaranteePeriodMonths:
        app.guarantee_period !== null && app.guarantee_period !== undefined
          ? Number(app.guarantee_period)
          : null,
      teamSize:
        app.team_size !== null && app.team_size !== undefined ? Number(app.team_size) : null,
      coverLetter: app.cover_letter,
      experience: app.experience || '',
      attachments: app.attachments || [],
      certificates: app.certificates || [],
      notes: app.notes || undefined,
      managerFeedbackMessage: app.manager_feedback_message || undefined,
      reviewedAt: app.reviewed_at || undefined,
      jobLocation: typeof app.jobs?.location === 'string' 
        ? app.jobs.location 
        : app.jobs?.location?.city || 'Nieznana lokalizacja',
      jobCategory: app.jobs?.job_categories?.name || 'Inne usługi',
      postedTime: getTimeAgo(app.jobs?.published_at || app.jobs?.created_at)
    })) || [];

    // Fetch bids with more details for applications view
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bids } = await (supabase as any)
      .from('contest_offers')
      .select(`
        id,
        contest_id,
        bid_amount,
        proposed_timeline,
        technical_proposal,
        manager_feedback_message,
        status,
        submitted_at,
        evaluated_at,
        valid_until,
        contests (
          title,
          location,
          published_at,
          created_at,
          job_categories!tenders_category_id_fkey (
            name
          ),
          companies (
            name
          )
        )
      `)
      .eq('contractor_id', contractorUserId)
      .neq('admin_moderation_status', 'suspended')
      .order('submitted_at', { ascending: false });

    type BidWithTenderDetails = {
      id: string;
      contest_id: string;
      status: string;
      bid_amount?: string;
      submitted_at: string;
      valid_until?: string;
      proposed_timeline?: number;
      technical_proposal?: string;
      manager_feedback_message?: string;
      evaluated_at?: string;
      contests?: {
        title?: string;
        location?: string | { city?: string };
        published_at?: string;
        created_at?: string;
        companies?: { name?: string } | null;
        job_categories?: { name?: string } | null;
      } | null;
    };
    const formattedBids: ContractorBid[] = ((bids || []) as BidWithTenderDetails[]).map(bid => ({
      id: bid.id,
      tenderId: bid.contest_id,
      tenderTitle: bid.contests?.title || '',
      companyName: bid.contests?.companies?.name || '',
      status: (bid.status || 'pending') as ContractorBid['status'],
      bidAmount: bid.bid_amount || '',
      submittedAt: bid.submitted_at,
      validUntil: bid.valid_until || '',
      location: typeof bid.contests?.location === 'string' 
        ? bid.contests.location 
        : bid.contests?.location?.city || 'Nieznana lokalizacja',
      category: bid.contests?.job_categories?.name || 'Przetarg',
      proposedTimeline: bid.proposed_timeline || undefined,
      technicalProposal: bid.technical_proposal || undefined,
      managerFeedbackMessage: bid.manager_feedback_message || undefined,
      reviewedAt: bid.evaluated_at || undefined,
      postedTime: getTimeAgo(bid.contests?.published_at || bid.contests?.created_at)
    }));

    return {
      applications: formattedApplications,
      bids: formattedBids
    };
  } catch (error) {
    console.error('Error fetching contractor applications:', error);
    throw error;
  }
}

/**
 * Fetch contractor analytics data (for analytics tab)
 */
export async function fetchContractorAnalytics(
  supabase: SupabaseClient<Database>,
  contractorId: string
): Promise<{ stats: ContractorStats; ratingSummary: Awaited<ReturnType<typeof fetchContractorRatingSummary>> }> {
  try {
    // Fetch contractor profile for stats
    const profile = await fetchContractorById(contractorId);
    if (!profile) {
      throw new Error('Contractor not found');
    }

    // Fetch applications count for stats
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: applicationsCount } = await (supabase as any)
      .from('job_applications')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', contractorId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: acceptedApplicationsCount } = await (supabase as any)
      .from('job_applications')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', contractorId)
      .eq('status', 'accepted');

    // Fetch bids count for stats
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: bidsCount } = await (supabase as any)
      .from('contest_offers')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', contractorId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: acceptedBidsCount } = await (supabase as any)
      .from('contest_offers')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', contractorId)
      .eq('status', 'accepted');

    // Calculate stats
    const stats: ContractorStats = {
      totalApplications: applicationsCount || 0,
      acceptedApplications: acceptedApplicationsCount || 0,
      totalBids: bidsCount || 0,
      acceptedBids: acceptedBidsCount || 0,
      completedProjects: profile.experience.completedProjects,
      averageRating: profile.rating.overall,
      totalEarnings: 0,
      responseTime: profile.stats.responseTime,
      onTimeCompletion: profile.stats.onTimeCompletion
    };

    // Fetch rating summary
    const ratingSummary = await fetchContractorRatingSummary(contractorId);

    return { stats, ratingSummary };
  } catch (error) {
    console.error('Error fetching contractor analytics:', error);
    throw error;
  }
}

/**
 * Fetch completed projects for contractor
 */
export async function fetchCompletedProjects(supabase: SupabaseClient<Database>, contractorId: string, limit: number = 10): Promise<Array<Record<string, unknown>>> {
  try {
    const { data: projects } = await supabase
      .from('portfolio_projects')
      .select(`
        id,
        title,
        description,
        budget_range,
        duration,
        completion_date,
        client_name,
        client_feedback,
        is_featured,
        portfolio_project_images (
          file_uploads (
            file_path
          )
        )
      `)
      .eq('company_id', contractorId)
      .order('completion_date', { ascending: false })
      .limit(limit);

    return projects || [];
  } catch (error) {
    console.error('Error fetching completed projects:', error);
    throw error;
  }
}

/**
 * Fetch platform project history for contractor (completed jobs where application was accepted)
 */
export interface PlatformProject {
  id: string;
  applicationId: string;
  jobId: string;
  title: string;
  description: string;
  location: string;
  clientCompany: string;
  clientCompanyId: string;
  budget?: number;
  budgetMax?: number;
  proposedPrice?: number;
  currency: string;
  completionDate?: string;
  appliedAt: string;
  decisionAt?: string;
  duration?: string;
  category?: string;
}

export async function fetchPlatformProjectHistory(
  supabase: SupabaseClient<Database>,
  companyId: string,
  limit: number = 50
): Promise<PlatformProject[]> {
  try {
    // Query job_applications with accepted status, join with jobs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: applications, error } = await (supabase as any)
      .from('job_applications')
      .select(`
        id,
        job_id,
        proposed_price,
        currency,
        submitted_at,
        decision_at,
        jobs!inner (
          id,
          title,
          description,
          location,
          budget_min,
          budget_max,
          currency,
          project_duration,
          updated_at,
          status,
          companies (
            id,
            name
          ),
          job_categories (
            name
          )
        )
      `)
      .eq('company_id', companyId)
      .eq('status', 'accepted')
      .order('decision_at', { ascending: false })
      .limit(limit * 2); // Fetch more to filter for completed jobs

    if (error) {
      console.error('Error fetching platform project history:', error);
      throw error;
    }

    if (!applications || applications.length === 0) {
      return [];
    }

    // Transform the data to PlatformProject format, filtering for completed jobs
    type ApplicationWithJob = {
      id: string;
      job_id: string;
      proposed_price?: number;
      currency?: string;
      submitted_at: string;
      decision_at?: string;
      jobs: {
        id: string;
        title: string;
        description?: string;
        location: string;
        budget_min?: number;
        budget_max?: number;
        currency?: string;
        project_duration?: string;
        updated_at?: string;
        status: string;
        companies?: { id: string; name: string } | null;
        job_categories?: { name: string } | null;
      } | null;
    };
    const projects: PlatformProject[] = (applications as ApplicationWithJob[])
      .filter((app) => app.jobs?.status === 'completed') // Filter for completed jobs only
      .slice(0, limit) // Limit to requested amount
      .map((app) => ({
        id: app.job_id,
        applicationId: app.id,
        jobId: app.job_id,
        title: app.jobs?.title || 'Bez tytułu',
        description: app.jobs?.description || '',
        location: app.jobs?.location || '',
        clientCompany: app.jobs?.companies?.name || 'Nieznana firma',
        clientCompanyId: app.jobs?.companies?.id || '',
        budget: app.jobs?.budget_min,
        budgetMax: app.jobs?.budget_max,
        proposedPrice: app.proposed_price,
        currency: app.currency || app.jobs?.currency || 'PLN',
        completionDate: app.jobs?.updated_at, // Use updated_at as completion date approximation
        appliedAt: app.submitted_at,
        decisionAt: app.decision_at,
        duration: app.jobs?.project_duration,
        category: app.jobs?.job_categories?.name,
      }));

    return projects;
  } catch (error) {
    console.error('Error in fetchPlatformProjectHistory:', error);
    throw error;
  }
}

/**
 * Fetch contractor reviews with pagination
 */
export async function fetchContractorReviews(
  contractorId: string,
  limit: number = 10,
  offset: number = 0,
  supabaseClient?: SupabaseClient<Database>,
): Promise<Array<{
  id: string;
  reviewerName: string;
  reviewerType: string;
  rating: number;
  title: string;
  comment: string;
  categories: {
    quality: number;
    timeliness: number;
    communication: number;
    pricing: number;
  };
  createdAt: string;
  helpfulCount: number;
}>> {
  const supabase = supabaseClient ?? createClient();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('company_reviews')
      .select(`
        id,
        rating,
        title,
        comment,
        categories,
        created_at,
        user_profiles (
          first_name,
          last_name,
          user_type
        )
      `)
      .eq('company_id', contractorId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching contractor reviews:', error);
      return [];
    }

    type ReviewWithProfile = {
      id: string;
      rating: number;
      title?: string;
      comment?: string;
      categories?: {
        quality: number;
        timeliness: number;
        communication: number;
        pricing: number;
      };
      created_at: string;
      user_profiles: {
        first_name: string;
        last_name: string;
        user_type: string;
      } | null;
    };
    return (data || []).map((review: ReviewWithProfile) => ({
      id: review.id,
      reviewerName: review.user_profiles ? 
        `${review.user_profiles.first_name} ${review.user_profiles.last_name}` : 
        'Anonimowy użytkownik',
      reviewerType: review.user_profiles?.user_type || 'manager',
      rating: review.rating,
      title: review.title || '',
      comment: review.comment || '',
      categories: review.categories || {
        quality: 0,
        timeliness: 0,
        communication: 0,
        pricing: 0
      },
      createdAt: review.created_at,
      helpfulCount: 0 // Placeholder for helpful votes
    }));
  } catch (error) {
    console.error('Error in fetchContractorReviews:', error);
    return [];
  }
}

/**
 * Fetch contractor rating summary
 */
export async function fetchContractorRatingSummary(
  contractorId: string,
  supabaseClient?: SupabaseClient<Database>,
): Promise<{
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: {
    '5': number;
    '4': number;
    '3': number;
    '2': number;
    '1': number;
  };
  categoryRatings: {
    quality: number;
    timeliness: number;
    communication: number;
    pricing: number;
  };
  lastReviewDate: string | null;
}> {
  const supabase = supabaseClient ?? createClient();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('company_ratings')
      .select(`
        average_rating,
        total_reviews,
        rating_breakdown,
        category_ratings,
        last_review_date
      `)
      .eq('company_id', contractorId)
      .maybeSingle();

    // Return default values if no ratings exist yet
    if (error) {
      console.log('No ratings found for contractor:', contractorId);
    }

    return {
      averageRating: data?.average_rating || 0,
      totalReviews: data?.total_reviews || 0,
      ratingBreakdown: data?.rating_breakdown || {
        '5': 0,
        '4': 0,
        '3': 0,
        '2': 0,
        '1': 0
      },
      categoryRatings: data?.category_ratings || {
        quality: 0,
        timeliness: 0,
        communication: 0,
        pricing: 0
      },
      lastReviewDate: data?.last_review_date || null
    };
  } catch (error) {
    console.error('Error in fetchContractorRatingSummary:', error);
    throw error;
  }
}

/**
 * Create a review for a contractor
 */
export async function createContractorReview(
  supabase: SupabaseClient<Database>,
  contractorId: string,
  reviewerId: string,
  reviewData: {
    rating: number;
    title?: string;
    comment?: string;
    categories?: {
      quality?: number;
      timeliness?: number;
      communication?: number;
      pricing?: number;
    };
    jobId?: string;
    tenderId?: string;
  }
): Promise<{ data: Record<string, unknown> | null; error: Error | null }> {
  const { createCompanyReview } = await import('./reviews');
  const result = await createCompanyReview(supabase, contractorId, reviewerId, {
    rating: reviewData.rating,
    title: reviewData.title,
    comment: reviewData.comment ?? '',
    categories: reviewData.categories,
    jobId: reviewData.jobId,
    tenderId: reviewData.tenderId,
  });
  if (result.error || !result.data) {
    return { data: null, error: result.error };
  }
  return { data: { id: result.data.id }, error: null };
}

/**
 * Get top rated contractors with enhanced data
 */
export async function getTopRatedContractors(limit: number = 5): Promise<BrowseContractor[]> {
  return fetchContractors({ sortBy: 'rating', limit });
}

/**
 * Get contractors by city with enhanced data
 */
export async function getContractorsByCity(city: string): Promise<BrowseContractor[]> {
  return fetchContractors({ city, limit: 50 });
}

/**
 * Get contractors by service category with enhanced data
 */
export async function getContractorsByService(service: string): Promise<BrowseContractor[]> {
  return fetchContractors({ category: service, limit: 50 });
}

/**
 * Activity type for recent activities
 */
export interface ContractorActivity {
  id: string;
  type: 'application_accepted' | 'application_rejected' | 'bid_accepted' | 'bid_rejected' | 'review_received' | 'message_received' | 'status_update';
  title: string;
  description: string;
  timestamp: Date;
  color: string; // for UI indicator
  icon: string; // icon name
  linkUrl?: string; // optional navigation link
}

/**
 * Fetch recent activities for a contractor
 */
export async function fetchContractorRecentActivities(
  supabase: SupabaseClient<Database>,
  contractorId: string,
  userId: string,
  limit: number = 10
): Promise<ContractorActivity[]> {
  try {
    const activities: ContractorActivity[] = [];

    // 1. Fetch recent job applications with status changes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: applications } = await (supabase as any)
      .from('job_applications')
      .select(`
        id,
        job_id,
        status,
        submitted_at,
        reviewed_at,
        decision_at,
        jobs (
          id,
          title
        )
      `)
      .eq('company_id', contractorId)
      .in('status', ['accepted', 'rejected', 'under_review', 'shortlisted'])
      .order('decision_at', { ascending: false, nullsFirst: false })
      .order('reviewed_at', { ascending: false, nullsFirst: false })
      .order('submitted_at', { ascending: false })
      .limit(limit * 2); // Get more to filter later

    type ApplicationWithJob = {
      id: string;
      job_id: string;
      status: string;
      submitted_at: string;
      reviewed_at?: string;
      decision_at?: string;
      jobs: { id: string; title: string } | null;
    };
    if (applications) {
      (applications as ApplicationWithJob[]).forEach((app) => {
        const timestamp = app.decision_at || app.reviewed_at || app.submitted_at;
        if (!timestamp) return;

        const jobTitle = app.jobs?.title || 'zgłoszenie';
        const jobId = app.jobs?.id || app.job_id;
        let activity: ContractorActivity | null = null;

        if (app.status === 'accepted') {
          activity = {
            id: `app-accepted-${app.id}`,
            type: 'application_accepted',
            title: `Wygrałeś ofertę na ${jobTitle}`,
            description: `Twoja aplikacja została zaakceptowana`,
            timestamp: new Date(timestamp),
            color: 'bg-green-500',
            icon: 'CheckCircle',
            linkUrl: jobId ? buildKonkursPath(jobId, jobTitle) : undefined
          };
        } else if (app.status === 'rejected') {
          activity = {
            id: `app-rejected-${app.id}`,
            type: 'application_rejected',
            title: `Oferta na ${jobTitle} została odrzucona`,
            description: `Niestety, Twoja aplikacja nie została zaakceptowana`,
            timestamp: new Date(timestamp),
            color: 'bg-red-500',
            icon: 'XCircle',
            linkUrl: jobId ? buildKonkursPath(jobId, jobTitle) : undefined
          };
        } else if (app.status === 'under_review' || app.status === 'shortlisted') {
          activity = {
            id: `app-review-${app.id}`,
            type: 'status_update',
            title: `Status oferty na ${jobTitle} został zaktualizowany`,
            description: `Twoja aplikacja jest w trakcie przeglądu`,
            timestamp: new Date(timestamp),
            color: 'bg-blue-500',
            icon: 'Clock',
            linkUrl: jobId ? buildKonkursPath(jobId, jobTitle) : undefined
          };
        }

        if (activity) {
          activities.push(activity);
        }
      });
    }

    // 2. Fetch recent tender bids with status changes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bids } = await (supabase as any)
      .from('contest_offers')
      .select(`
        id,
        contest_id,
        status,
        submitted_at,
        evaluated_at,
        contests (
          id,
          title
        )
      `)
      .eq('company_id', contractorId)
      .in('status', ['accepted', 'rejected', 'under_review', 'shortlisted'])
      .order('evaluated_at', { ascending: false, nullsFirst: false })
      .order('submitted_at', { ascending: false })
      .limit(limit * 2);

    type BidWithTender = {
      id: string;
      contest_id: string;
      status: string;
      submitted_at: string;
      evaluated_at?: string;
      contests: { id: string; title: string } | null;
    };
    if (bids) {
      (bids as BidWithTender[]).forEach((bid) => {
        const timestamp = bid.evaluated_at || bid.submitted_at;
        if (!timestamp) return;

        const tenderTitle = bid.contests?.title || 'przetarg';
        const tenderId = bid.contests?.id || bid.contest_id;
        let activity: ContractorActivity | null = null;

        if (bid.status === 'accepted') {
          activity = {
            id: `bid-accepted-${bid.id}`,
            type: 'bid_accepted',
            title: `Wygrana oferta na przetarg ${tenderTitle}`,
            description: `Twoja oferta została zaakceptowana`,
            timestamp: new Date(timestamp),
            color: 'bg-green-500',
            icon: 'CheckCircle',
            linkUrl: tenderId ? buildKonkursPath(tenderId, tenderTitle) : undefined
          };
        } else if (bid.status === 'rejected') {
          activity = {
            id: `bid-rejected-${bid.id}`,
            type: 'bid_rejected',
            title: `Oferta na przetarg ${tenderTitle} została odrzucona`,
            description: `Niestety, Twoja oferta nie została zaakceptowana`,
            timestamp: new Date(timestamp),
            color: 'bg-red-500',
            icon: 'XCircle',
            linkUrl: tenderId ? buildKonkursPath(tenderId, tenderTitle) : undefined
          };
        } else if (bid.status === 'under_review' || bid.status === 'shortlisted') {
          activity = {
            id: `bid-review-${bid.id}`,
            type: 'status_update',
            title: `Status oferty na przetarg ${tenderTitle} został zaktualizowany`,
            description: `Twoja oferta jest w trakcie przeglądu`,
            timestamp: new Date(timestamp),
            color: 'bg-blue-500',
            icon: 'Clock',
            linkUrl: tenderId ? buildKonkursPath(tenderId, tenderTitle) : undefined
          };
        }

        if (activity) {
          activities.push(activity);
        }
      });
    }

    // 3. Fetch recent reviews received
    const { data: reviews } = await supabase
      .from('company_reviews')
      .select(`
        id,
        rating,
        created_at
      `)
      .eq('company_id', contractorId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    type Review = {
      id: string;
      rating: number;
      created_at: string;
    };
    if (reviews) {
      (reviews as Review[]).forEach((review) => {
        activities.push({
          id: `review-${review.id}`,
          type: 'review_received',
          title: `Otrzymałeś nową recenzję (${review.rating} ${review.rating === 1 ? 'gwiazdka' : review.rating < 5 ? 'gwiazdki' : 'gwiazdek'})`,
          description: `Nowa opinia została dodana do Twojego profilu`,
          timestamp: new Date(review.created_at),
          color: 'bg-yellow-500',
          icon: 'Star',
          linkUrl: undefined // Could link to reviews section
        });
      });
    }

    // 4. Fetch recent messages in conversations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: conversations } = await (supabase as any)
      .from('conversations')
      .select(`
        id,
        last_message_at,
        participant_1,
        participant_2
      `)
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
      .order('last_message_at', { ascending: false })
      .limit(limit);

    if (conversations) {
      // Get the most recent message for each conversation
      for (const conv of conversations) {
        if (!conv.last_message_at) continue;

        // Check if the last message was from someone else (not the contractor)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: lastMessage } = await (supabase as any)
          .from('messages')
          .select('id, sender_id, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (lastMessage && lastMessage.sender_id !== userId) {
          activities.push({
            id: `message-${conv.id}-${lastMessage.id}`,
            type: 'message_received',
            title: 'Nowa wiadomość w konwersacji',
            description: `Otrzymałeś nową wiadomość`,
            timestamp: new Date(lastMessage.created_at || conv.last_message_at),
            color: 'bg-blue-500',
            icon: 'MessagesSquare',
            linkUrl: `/wiadomosci?conversation=${conv.id}`
          });
        }
      }
    }

    // Sort all activities by timestamp (most recent first) and limit
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return activities.slice(0, limit);
  } catch (error) {
    console.error('Error fetching contractor recent activities:', error);
    return [];
  }
}

/**
 * Search contractors by query with enhanced data
 */
export async function searchContractors(query: string): Promise<BrowseContractor[]> {
  return fetchContractors({ searchQuery: query, limit: 50 });
}

/**
 * Portfolio project data for create/update
 */
export interface PortfolioProjectInput {
  title: string;
  description?: string;
  categoryId?: string;
  location?: string;
  projectType?: string;
  budgetRange?: string;
  duration?: string;
  completionDate?: string;
  clientName?: string;
  clientFeedback?: string;
  isFeatured?: boolean;
  sortOrder?: number;
}

/**
 * Create a new portfolio project
 */
export async function createPortfolioProject(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  projectData: PortfolioProjectInput
): Promise<{ data: string | null; error: PostgrestError | null }> {
  try {
    const { data, error } = await supabase
      .from('portfolio_projects')
      .insert({
        company_id: companyId,
        title: projectData.title,
        description: projectData.description || null,
        category_id: projectData.categoryId || null,
        location: projectData.location || null,
        project_type: projectData.projectType || null,
        budget_range: projectData.budgetRange || null,
        duration: projectData.duration || null,
        completion_date: projectData.completionDate || null,
        client_name: projectData.clientName || null,
        client_feedback: projectData.clientFeedback || null,
        is_featured: projectData.isFeatured || false,
        sort_order: projectData.sortOrder || 0,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating portfolio project:', error);
      return { data: null, error };
    }

    return { data: data.id, error: null };
  } catch (error) {
    console.error('Error in createPortfolioProject:', error);
    return { data: null, error };
  }
}

/**
 * Update an existing portfolio project
 */
export async function updatePortfolioProject(
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  projectData: Partial<PortfolioProjectInput>
): Promise<{ data: boolean; error: PostgrestError | null }> {
  try {
    const updateData: Database['public']['Tables']['portfolio_projects']['Update'] = {};
    
    if (projectData.title !== undefined) updateData.title = projectData.title;
    if (projectData.description !== undefined) updateData.description = projectData.description || null;
    if (projectData.categoryId !== undefined) updateData.category_id = projectData.categoryId || null;
    if (projectData.location !== undefined) updateData.location = projectData.location || null;
    if (projectData.projectType !== undefined) updateData.project_type = projectData.projectType || null;
    if (projectData.budgetRange !== undefined) updateData.budget_range = projectData.budgetRange || null;
    if (projectData.duration !== undefined) updateData.duration = projectData.duration || null;
    if (projectData.completionDate !== undefined) updateData.completion_date = projectData.completionDate || null;
    if (projectData.clientName !== undefined) updateData.client_name = projectData.clientName || null;
    if (projectData.clientFeedback !== undefined) updateData.client_feedback = projectData.clientFeedback || null;
    if (projectData.isFeatured !== undefined) updateData.is_featured = projectData.isFeatured;
    if (projectData.sortOrder !== undefined) updateData.sort_order = projectData.sortOrder;

    const { error } = await supabase
      .from('portfolio_projects')
      .update(updateData)
      .eq('id', projectId);

    if (error) {
      console.error('Error updating portfolio project:', error);
      return { data: false, error };
    }

    return { data: true, error: null };
  } catch (error) {
    console.error('Error in updatePortfolioProject:', error);
    return { data: false, error };
  }
}

/**
 * Delete a portfolio project
 */
export async function deletePortfolioProject(
  supabase: ReturnType<typeof createClient>,
  projectId: string
): Promise<{ data: boolean; error: PostgrestError | null }> {
  try {
    // Portfolio project images will be deleted via CASCADE
    const { error } = await supabase
      .from('portfolio_projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      console.error('Error deleting portfolio project:', error);
      return { data: false, error };
    }

    return { data: true, error: null };
  } catch (error) {
    console.error('Error in deletePortfolioProject:', error);
    return { data: false, error };
  }
}

/**
 * Add image to portfolio project
 */
export async function addPortfolioProjectImage(
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  fileUploadId: string,
  imageData?: {
    title?: string;
    description?: string;
    altText?: string;
    imageType?: 'before' | 'during' | 'after' | 'general' | 'detail';
    sortOrder?: number;
  }
): Promise<{ data: string | null; error: PostgrestError | null }> {
  try {
    const { data, error } = await supabase
      .from('portfolio_project_images')
      .insert({
        project_id: projectId,
        file_id: fileUploadId,
        title: imageData?.title || null,
        description: imageData?.description || null,
        alt_text: imageData?.altText || null,
        image_type: imageData?.imageType || 'general',
        sort_order: imageData?.sortOrder || 0,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error adding portfolio project image:', error);
      return { data: null, error };
    }

    return { data: data.id, error: null };
  } catch (error) {
    console.error('Error in addPortfolioProjectImage:', error);
    return { data: null, error };
  }
}

/**
 * Remove image from portfolio project
 */
export async function removePortfolioProjectImage(
  supabase: ReturnType<typeof createClient>,
  imageId: string
): Promise<{ data: boolean; error: PostgrestError | null }> {
  try {
    const { error } = await supabase
      .from('portfolio_project_images')
      .delete()
      .eq('id', imageId);

    if (error) {
      console.error('Error removing portfolio project image:', error);
      return { data: false, error };
    }

    return { data: true, error: null };
  } catch (error) {
    console.error('Error in removePortfolioProjectImage:', error);
    return { data: false, error };
  }
}

/**
 * Fetch service pricing for a contractor
 */
export async function fetchContractorServicePricing(
  companyId: string
): Promise<Record<string, ServicePricing>> {
  const supabase = createClient();

  try {
    const { data: company, error } = await supabase
      .from('companies')
      .select('profile_data')
      .eq('id', companyId)
      .single();

    if (error || !company) {
      console.error('Error fetching contractor service pricing:', error);
      return {};
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const companyWithJsonb = company as any;
    const profileData = companyWithJsonb.profile_data || {};
    const servicePricing = profileData.service_pricing || {};

    // Validate and return service pricing
    if (typeof servicePricing === 'object' && servicePricing !== null && !Array.isArray(servicePricing)) {
      return servicePricing as Record<string, ServicePricing>;
    }

    return {};
  } catch (error) {
    console.error('Error in fetchContractorServicePricing:', error);
    return {};
  }
}

/**
 * Update service pricing for a contractor
 */
export async function updateContractorServicePricing(
  companyId: string,
  servicePricing: Record<string, ServicePricing>
): Promise<{ data: boolean; error: Error | null }> {
  const supabase = createClient();

  try {
    // Fetch current profile_data
    const { data: company, error: fetchError } = await supabase
      .from('companies')
      .select('profile_data')
      .eq('id', companyId)
      .single();

    if (fetchError || !company) {
      return { data: false, error: new Error('Failed to fetch company data') };
    }

    // Merge service pricing into profile_data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const companyWithJsonb = company as any;
    const profileData = companyWithJsonb.profile_data || {};
    const updatedProfileData = {
      ...profileData,
      service_pricing: servicePricing
    };

    // Update the company record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('companies')
      .update({ profile_data: updatedProfileData })
      .eq('id', companyId);

    if (updateError) {
      console.error('Error updating contractor service pricing:', updateError);
      return { data: false, error: new Error('Failed to update service pricing') };
    }

    return { data: true, error: null };
  } catch (error) {
    console.error('Error in updateContractorServicePricing:', error);
    return {
      data: false,
      error: error instanceof Error ? error : new Error('Unknown error occurred')
    };
  }
}

/**
 * Update contractor services (primary, secondary, specializations)
 */
export async function updateContractorServices(
  companyId: string,
  services: {
    primary: string[];
    secondary: string[];
    specializations: string[];
  }
): Promise<{ data: boolean; error: Error | null }> {
  const supabase = createClient();

  try {
    // Fetch current profile_data
    const { data: company, error: fetchError } = await supabase
      .from('companies')
      .select('profile_data')
      .eq('id', companyId)
      .single();

    if (fetchError || !company) {
      return { data: false, error: new Error('Failed to fetch company data') };
    }

    // Merge services into profile_data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const companyWithJsonb = company as any;
    const profileData = companyWithJsonb.profile_data || {};
    const updatedProfileData = {
      ...profileData,
      primary_services: services.primary,
      secondary_services: services.secondary,
      specializations: services.specializations
    };

    // Update the company record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('companies')
      .update({ profile_data: updatedProfileData })
      .eq('id', companyId);

    if (updateError) {
      console.error('Error updating contractor services:', updateError);
      return { data: false, error: new Error('Failed to update services') };
    }

    return { data: true, error: null };
  } catch (error) {
    console.error('Error in updateContractorServices:', error);
    return {
      data: false,
      error: error instanceof Error ? error : new Error('Unknown error occurred')
    };
  }
}