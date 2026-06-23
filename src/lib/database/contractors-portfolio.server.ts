import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { createClient } from '../supabase/server';
import { resolvePortfolioImageUrls } from '../storage/portfolio-read';

export interface ContractorPortfolioProject {
  id: string;
  title: string;
  description: string;
  images: string[];
  budget: string;
  duration: string;
  year: number;
  category: string;
  location: string;
  projectType: string;
  clientName: string;
  clientFeedback: string;
  isFeatured: boolean;
}

export interface PortfolioProjectDetails {
  id: string;
  title: string;
  description?: string;
  category?: string;
  location?: string;
  projectType?: string;
  budget?: string;
  duration?: string;
  completionDate?: string;
  clientName?: string;
  clientFeedback?: string;
  isFeatured?: boolean;
  images?: string[];
}

export async function fetchPortfolioProjectById(
  supabase: SupabaseClient<Database>,
  projectId: string,
): Promise<PortfolioProjectDetails | null> {
  try {
    const { data, error } = await supabase
      .from('portfolio_projects')
      .select(`
        id,
        title,
        description,
        location,
        project_type,
        budget_range,
        duration,
        completion_date,
        client_name,
        client_feedback,
        is_featured,
        job_categories (
          name
        ),
        portfolio_project_images (
          file_uploads (
            file_path
          )
        )
      `)
      .eq('id', projectId)
      .single();

    if (error || !data) {
      console.error('Error fetching portfolio project:', error);
      return null;
    }

    const imageUrls = await resolvePortfolioImageUrls(
      supabase,
      (data.portfolio_project_images || []) as Array<{
        file_uploads: { file_path: string } | null;
      }>,
    );

    return {
      id: data.id,
      title: data.title,
      description: data.description || undefined,
      category: data.job_categories?.name || undefined,
      location: data.location || undefined,
      projectType: data.project_type || undefined,
      budget: data.budget_range || undefined,
      duration: data.duration || undefined,
      completionDate: data.completion_date
        ? new Date(data.completion_date).toISOString().split('T')[0]
        : undefined,
      clientName: data.client_name || undefined,
      clientFeedback: data.client_feedback || undefined,
      isFeatured: data.is_featured || false,
      images: imageUrls,
    };
  } catch (error) {
    console.error('Error in fetchPortfolioProjectById:', error);
    return null;
  }
}

export async function fetchContractorPortfolio(
  contractorId: string,
): Promise<ContractorPortfolioProject[]> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('portfolio_projects')
      .select(`
        id,
        title,
        description,
        location,
        project_type,
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
        ),
        job_categories (
          name
        )
      `)
      .eq('company_id', contractorId)
      .order('is_featured', { ascending: false })
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching contractor portfolio:', error);
      throw new Error('Failed to fetch contractor portfolio');
    }

    return Promise.all(
      (data || []).map(async (project) => {
        const imageUrls = await resolvePortfolioImageUrls(supabase, project.portfolio_project_images);

        return {
          id: project.id,
          title: project.title,
          description: project.description || '',
          images: imageUrls,
          budget: project.budget_range || '',
          duration: project.duration || '',
          year: project.completion_date
            ? new Date(project.completion_date).getFullYear()
            : new Date().getFullYear(),
          category: project.job_categories?.name || '',
          location: project.location || '',
          projectType: project.project_type || '',
          clientName: project.client_name || '',
          clientFeedback: project.client_feedback || '',
          isFeatured: project.is_featured,
        };
      }),
    );
  } catch (error) {
    console.error('Error in fetchContractorPortfolio:', error);
    throw error;
  }
}

export async function fetchContractorFeaturedPortfolio(
  contractorId: string,
  limit = 6,
): Promise<ContractorPortfolioProject[]> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('portfolio_projects')
      .select(`
        id,
        title,
        description,
        location,
        project_type,
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
        ),
        job_categories (
          name
        )
      `)
      .eq('company_id', contractorId)
      .eq('is_featured', true)
      .order('sort_order', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching contractor featured portfolio:', error);
      throw new Error('Failed to fetch contractor featured portfolio');
    }

    return Promise.all(
      (data || []).map(async (project) => {
        const imageUrls = await resolvePortfolioImageUrls(supabase, project.portfolio_project_images);

        return {
          id: project.id,
          title: project.title,
          description: project.description || '',
          images: imageUrls,
          budget: project.budget_range || '',
          duration: project.duration || '',
          year: project.completion_date
            ? new Date(project.completion_date).getFullYear()
            : new Date().getFullYear(),
          category: project.job_categories?.name || '',
          location: project.location || '',
          projectType: project.project_type || '',
          clientName: project.client_name || '',
          clientFeedback: project.client_feedback || '',
          isFeatured: project.is_featured,
        };
      }),
    );
  } catch (error) {
    console.error('Error in fetchContractorFeaturedPortfolio:', error);
    throw error;
  }
}
