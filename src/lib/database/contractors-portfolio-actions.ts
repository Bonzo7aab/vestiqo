'use server';

import { createClient } from '../supabase/server';
import {
  fetchContractorPortfolio,
  fetchPortfolioProjectById,
  type ContractorPortfolioProject,
  type PortfolioProjectDetails,
} from './contractors-portfolio.server';

export async function refreshContractorPortfolioAction(
  companyId: string,
): Promise<ContractorPortfolioProject[]> {
  return fetchContractorPortfolio(companyId);
}

export async function fetchPortfolioProjectByIdAction(
  projectId: string,
): Promise<PortfolioProjectDetails | null> {
  const supabase = await createClient();
  return fetchPortfolioProjectById(supabase, projectId);
}
