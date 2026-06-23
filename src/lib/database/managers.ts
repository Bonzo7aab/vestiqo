import { createClient } from '../supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ManagerProfile } from '../../types/manager';
import { ilikePattern } from './escape-postgrest-filter';

// Re-export ManagerProfile for convenience
export type { ManagerProfile };

// Interface for browse page manager data
export interface BrowseManager {
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
  buildings_count: number;
  units_count: number;
  total_area: number;
  organization_type: string;
  primary_needs: string[];
  frequent_services: string[];
  managed_property_types: string[];
  years_active: number;
  published_jobs: number;
  completed_projects: number;
  active_contractors: number;
  average_response_time: string;
  payment_punctuality: number;
  project_completion_rate: number;
  contractor_retention_rate: number;
  rating: number;
  review_count: number;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
}

export interface ManagerFilters {
  city?: string;
  organizationType?: string;
  searchQuery?: string;
  sortBy?: 'rating' | 'buildings' | 'units' | 'experience' | 'name';
  limit?: number;
  offset?: number;
}

/**
 * Fetch managers for the browse page with optional filtering
 */
export async function fetchManagers(filters: ManagerFilters = {}): Promise<BrowseManager[]> {
  const supabase = createClient();
  
  const {
    city,
    organizationType,
    searchQuery,
    sortBy = 'rating',
    limit = 50,
    offset = 0
  } = filters;

  try {
    let query = supabase
      .from('companies')
      .select('*')
      .in('type', ['property_management', 'housing_association', 'cooperative', 'condo_management', 'spółdzielnia', 'wspólnota']);

    // Apply filters
    if (city) {
      query = query.eq('city', city);
    }

    if (organizationType) {
      // Filter by organization_type in manager_data JSONB
      query = query.eq('manager_data->>organization_type', organizationType);
    }

    if (searchQuery) {
      const term = ilikePattern(searchQuery);
      query = query.or(`name.ilike.${term},description.ilike.${term}`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching managers:', error);
      throw new Error('Failed to fetch managers');
    }

    // Fetch ratings for all managers
    const managerIds = (data || []).map(company => company.id);
    let ratingsMap: { [key: string]: { average_rating: number; total_reviews: number } } = {};
    
    if (managerIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: ratingsData } = await (supabase as any)
        .from('company_ratings')
        .select('company_id, average_rating, total_reviews')
        .in('company_id', managerIds);
      
      if (ratingsData) {
        ratingsMap = ((ratingsData as Array<Record<string, unknown>>) || []).reduce((acc: { [key: string]: { average_rating: number; total_reviews: number } }, rating: Record<string, unknown>) => {
          acc[String(rating.company_id ?? '')] = {
            average_rating: Number(rating.average_rating ?? 0),
            total_reviews: Number(rating.total_reviews ?? 0)
          };
          return acc;
        }, {}) as { [key: string]: { average_rating: number; total_reviews: number } };
      }
    }

    // Transform data to BrowseManager format
    let managers: BrowseManager[] = ((data || []) as Array<Record<string, unknown>>).map((company: Record<string, unknown>) => {
      const ratings = ratingsMap[company.id as string];
      const managerData = (company.manager_data || {}) as Record<string, unknown>;
      const experienceData = (company.experience_data || {}) as Record<string, unknown>;
      const statsData = (company.stats_data || {}) as Record<string, unknown>;
      
      return {
        id: company.id as string,
        name: company.name as string,
        short_name: company.short_name as string | undefined,
        city: (company.city as string) || '',
        avatar_url: company.avatar_url as string | undefined,
        plan_type: ((company.plan_type || 'basic') as string) as 'basic' | 'pro' | 'premium',
        last_active: (company.last_active || company.updated_at || new Date().toISOString()) as string,
        is_verified: (company.is_verified as boolean) || false,
        verification_level: ((company.verification_level || 'none') as string),
        founded_year: company.founded_year as number | undefined,
        employee_count: company.employee_count as string | undefined,
        buildings_count: (managerData.buildings_count || 0) as number,
        units_count: (managerData.units_count || 0) as number,
        total_area: (managerData.total_area || 0) as number,
        organization_type: ((managerData.organization_type || company.type) as string),
        primary_needs: (managerData.primary_needs || []) as string[],
        frequent_services: (managerData.frequent_services || []) as string[],
        managed_property_types: (managerData.managed_property_types || []) as string[],
        years_active: (experienceData.years_active || 0) as number,
        published_jobs: (experienceData.published_jobs || 0) as number,
        completed_projects: (experienceData.completed_projects || 0) as number,
        active_contractors: (experienceData.active_contractors || 0) as number,
        average_response_time: (statsData.average_response_time || '') as string,
        payment_punctuality: (statsData.payment_punctuality || 0) as number,
        project_completion_rate: (statsData.project_completion_rate || 0) as number,
        contractor_retention_rate: (statsData.contractor_retention_rate || 0) as number,
        rating: (ratings?.average_rating || 0) as number,
        review_count: (ratings?.total_reviews || 0) as number,
        phone: company.phone as string | undefined,
        email: company.email as string | undefined,
        website: company.website as string | undefined,
        address: company.address as string | undefined
      };
    }) as BrowseManager[];

    // Apply sorting
    switch (sortBy) {
      case 'rating':
        managers = managers.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'name':
        managers = managers.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'buildings':
        managers = managers.sort((a, b) => (b.buildings_count || 0) - (a.buildings_count || 0));
        break;
      case 'units':
        managers = managers.sort((a, b) => (b.units_count || 0) - (a.units_count || 0));
        break;
      case 'experience':
        managers = managers.sort((a, b) => (b.years_active || 0) - (a.years_active || 0));
        break;
      default:
        managers = managers.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return managers;
  } catch (error) {
    console.error('Error in fetchManagers:', error);
    throw error;
  }
}

/**
 * Fetch a single manager by ID with full profile data
 * @param id - Manager company ID
 * @param supabaseClient - Optional Supabase client (for server-side usage)
 */
export async function fetchManagerById(
  id: string, 
  supabaseClient?: SupabaseClient
): Promise<ManagerProfile | null> {
  const supabase = supabaseClient || createClient();

  try {
    // Fetch company data - use maybeSingle to avoid throwing errors when no row found
    // Use * to select all columns (including JSONB columns like manager_data, experience_data, etc.)
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .in('type', ['property_management', 'housing_association', 'cooperative', 'condo_management', 'spółdzielnia', 'wspólnota'])
      .maybeSingle();

    // Check for meaningful errors (not just empty objects)
    if (companyError && (companyError.message || companyError.code || companyError.details)) {
      // Log more details about the error
      console.error('Error fetching manager:', {
        error: companyError,
        message: companyError.message,
        details: companyError.details,
        hint: companyError.hint,
        code: companyError.code,
        id
      });
      return null;
    }

    if (!company) {
      // Company not found or doesn't match type filter
      console.log(`Manager not found for ID: ${id} (may not match manager type filter)`);
      return null;
    }

    // Fetch real ratings data - use maybeSingle since ratings might not exist
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ratingsData } = await (supabase as any)
      .from('company_ratings')
      .select('average_rating, total_reviews, rating_breakdown, category_ratings')
      .eq('company_id', id)
      .maybeSingle();

    // Fetch reviews
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: reviewsData } = await (supabase as any)
      .from('company_reviews')
      .select(`
        id,
        rating,
        title,
        comment,
        categories,
        created_at,
        user_profiles!company_reviews_reviewer_id_fkey (
          first_name,
          last_name,
          user_type
        )
      `)
      .eq('company_id', id)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(10);

    // Parse JSONB fields - they might be strings or already parsed objects
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const managerDataRaw = (company as any).manager_data;
    const managerData = typeof managerDataRaw === 'string' 
      ? JSON.parse(managerDataRaw) 
      : (managerDataRaw || {});
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const experienceDataRaw = (company as any).experience_data;
    const experienceData = typeof experienceDataRaw === 'string'
      ? JSON.parse(experienceDataRaw)
      : (experienceDataRaw || {});
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const statsDataRaw = (company as any).stats_data;
    const statsData = typeof statsDataRaw === 'string'
      ? JSON.parse(statsDataRaw)
      : (statsDataRaw || {});

    // Transform to ManagerProfile format with real data
    const manager: ManagerProfile = {
      id: company.id,
      name: company.name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      organizationType: managerData.organization_type || company.type as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      avatar: (company as any).avatar_url,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      coverImage: (company as any).cover_image_url,
      location: {
        city: company.city || 'Warszawa',
        district: company.city || 'Warszawa',
        coordinates: { lat: 52.2297, lng: 21.0122 }
      },
      contactInfo: {
        phone: company.phone || '',
        email: company.email || '',
        website: company.website,
        address: company.address || '',
        contactPerson: '',
        position: ''
      },
      businessInfo: {
        nip: company.nip || '',
        regon: company.regon || '',
        krs: company.krs,
        yearEstablished: company.founded_year || 2020,
        legalForm: managerData.organization_type || 'Wspólnota Mieszkaniowa'
      },
      rating: {
        overall: ratingsData?.average_rating || 0,
        reviewsCount: ratingsData?.total_reviews || 0,
        categories: {
          paymentTimeliness: ratingsData?.category_ratings?.payment_timeliness || 0,
          communication: ratingsData?.category_ratings?.communication || 0,
          projectClarity: ratingsData?.category_ratings?.project_clarity || 0,
          professionalism: ratingsData?.category_ratings?.professionalism || 0
        }
      },
      verification: {
        status: company.is_verified ? 'verified' : 'unverified',
        badges: [],
        documents: [],
        lastVerified: company.updated_at
      },
      managedProperties: {
        buildingsCount: managerData.buildings_count || 0,
        unitsCount: managerData.units_count || 0,
        totalArea: managerData.total_area || 0,
        propertyTypes: managerData.managed_property_types || [],
        constructionYears: managerData.construction_years || { min: 2000, max: 2024 },
        averageUnitSize: managerData.average_unit_size || 70
      },
      services: {
        primaryNeeds: managerData.primary_needs || [],
        frequentServices: managerData.frequent_services || [],
        specialRequirements: managerData.special_requirements || []
      },
      experience: {
        yearsActive: experienceData.years_active || 0,
        publishedJobs: experienceData.published_jobs || 0,
        completedProjects: experienceData.completed_projects || 0,
        activeContractors: experienceData.active_contractors || 0,
        budgetRange: experienceData.budget_range || { min: 0, max: 0 }
      },
      portfolio: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        images: (company as any).portfolio_data?.images || [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        managedBuildings: (company as any).portfolio_data?.managedBuildings || []
      },
      financials: {
        averageProjectBudget: managerData.average_project_budget || '0 zł',
        paymentTerms: managerData.payment_terms || [],
        budgetPreferences: '',
        fundingSources: []
      },
      requirements: {
        requiredCertificates: managerData.required_certificates || [],
        insuranceRequirements: managerData.insurance_requirements || '',
        preferredPaymentMethods: managerData.preferred_payment_methods || [],
        workingHours: managerData.working_hours || '',
        specialRequests: managerData.special_requests || []
      },
      reviews: (reviewsData || []).map((review: Record<string, unknown>) => ({
        id: review.id,
        author: (review.user_profiles as { first_name?: string; last_name?: string } | null) ? 
          `${((review.user_profiles as { first_name?: string; last_name?: string }).first_name || '')} ${((review.user_profiles as { first_name?: string; last_name?: string }).last_name || '')}` : 
          'Anonimowy użytkownik',
        authorCompany: ((review.user_profiles as { user_type?: string } | null)?.user_type === 'manager') ? 'Wspólnota mieszkaniowa' : 'Firma wykonawcza',
        rating: (review.rating as number) || 0,
        title: review.title || '',
        date: review.created_at,
        project: review.job_id ? 'Projekt remontowy' : 'Współpraca',
        comment: review.comment || '',
        categories: review.categories || {},
        response: undefined,
        helpful: 0
      })),
      stats: {
        averageResponseTime: statsData.average_response_time || '',
        paymentPunctuality: statsData.payment_punctuality || 0,
        projectCompletionRate: statsData.project_completion_rate || 0,
        contractorRetentionRate: statsData.contractor_retention_rate || 0,
        averageProjectDuration: statsData.average_project_duration || ''
      },
      preferences: {
        preferredContractorSize: managerData.preferred_contractor_size || [],
        workSchedulePreference: managerData.work_schedule_preference || '',
        communicationStyle: managerData.communication_style || '',
        budgetFlexibility: managerData.budget_flexibility || ''
      },
      recentActivity: {
        lastJobPosted: '',
        totalJobsThisYear: 0,
        averageJobsPerMonth: 0,
        seasonalActivity: {}
      },
      joinedDate: company.created_at,
      lastActive: company.updated_at
    };

    return manager;
  } catch (error) {
    console.error('Error in fetchManagerById:', error);
    throw error;
  }
}

/**
 * Get top rated managers
 */
export async function getTopRatedManagers(limit: number = 5): Promise<BrowseManager[]> {
  return fetchManagers({ sortBy: 'rating', limit });
}

/**
 * Get managers by city
 */
export async function getManagersByCity(city: string): Promise<BrowseManager[]> {
  return fetchManagers({ city, limit: 50 });
}

/**
 * Get managers by organization type
 */
export async function getManagersByType(organizationType: string): Promise<BrowseManager[]> {
  return fetchManagers({ organizationType, limit: 50 });
}

/**
 * Search managers by query
 */
export async function searchManagers(query: string): Promise<BrowseManager[]> {
  return fetchManagers({ searchQuery: query, limit: 50 });
}
