import { Suspense } from 'react';
import { createClient } from '../../../lib/supabase/server';
import { fetchUserPrimaryCompany } from '../../../lib/database/companies';
import { fetchPlatformProjectHistory } from '../../../lib/database/contractors';
import { fetchContractorPortfolio } from '../../../lib/database/contractors-portfolio.server';
import { Card, CardContent } from '../../../components/ui/card';
import { ProjectsContent } from './ProjectsContent';

async function getProjectsData(userId: string) {
  const supabase = await createClient();
  
  // Fetch company
  const { data: company } = await fetchUserPrimaryCompany(supabase, userId);
  if (!company) {
    return null;
  }

  // Fetch all data in parallel
  const [platformProjects, portfolioProjects] = await Promise.all([
    fetchPlatformProjectHistory(supabase, company.id),
    fetchContractorPortfolio(company.id),
  ]);

  return {
    platformProjects: platformProjects || [],
    portfolioProjects: portfolioProjects || [],
    companyId: company.id,
  };
}

// Loading fallback component
function LoadingFallback({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="ml-2 text-sm text-muted-foreground">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Async data fetcher component
async function ProjectsDataFetcher() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const projectsData = await getProjectsData(user.id);

  if (!projectsData) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">Nie znaleziono firmy. Proszę najpierw uzupełnić dane firmy w profilu.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ProjectsContent 
      platformProjects={projectsData.platformProjects}
      portfolioProjects={projectsData.portfolioProjects}
      companyId={projectsData.companyId}
    />
  );
}

// Page component - renders immediately
export default function ProjectsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Suspense fallback={<LoadingFallback message="Ładowanie projektów..." />}>
        <ProjectsDataFetcher />
      </Suspense>
    </div>
  );
}

