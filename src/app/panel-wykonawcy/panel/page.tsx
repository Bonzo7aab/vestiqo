import { Suspense } from 'react';
import { createClient } from '../../../lib/supabase/server';
import { resolveEffectiveUserId } from '../../../lib/auth/effective-user';
import { fetchUserPrimaryCompany } from '../../../lib/database/companies';
import { fetchContractorDashboardStats, fetchContractorRecentActivities, fetchContractorApplications } from '../../../lib/database/contractors';
import { Card, CardContent } from '../../../components/ui/card';
import { DashboardContent } from './DashboardContent';

async function getDashboardData(userId: string) {
  const supabase = await createClient();
  
  // Fetch company
  const { data: company } = await fetchUserPrimaryCompany(supabase, userId);
  if (!company) {
    return null;
  }

  // Fetch all data in parallel
  const [dashboardData, activitiesData, applicationsData] = await Promise.all([
    fetchContractorDashboardStats(supabase, company.id, userId),
    fetchContractorRecentActivities(supabase, company.id, userId, 10),
    fetchContractorApplications(supabase, userId),
  ]);

  // Map status from database format to component format
  const statusMap: Record<string, 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'cancelled'> = {
    'pending': 'submitted',
    'submitted': 'submitted',
    'under_review': 'under_review',
    'shortlisted': 'under_review',
    'reviewing': 'under_review',
    'accepted': 'accepted',
    'rejected': 'rejected',
    'cancelled': 'cancelled'
  };

  // Transform applications to include status with proper mapping
  const allApplications = [
    ...(applicationsData.applications || []).map(app => ({
      id: app.id,
      status: statusMap[app.status] || 'submitted',
    })),
    ...(applicationsData.bids || []).map(bid => ({
      id: bid.id,
      status: statusMap[bid.status] || 'submitted',
    })),
  ];

  return {
    stats: dashboardData.stats,
    recentActivities: activitiesData || [],
    allApplications,
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
async function DashboardDataFetcher() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const effectiveUserId = await resolveEffectiveUserId(user.id);
  const dashboardData = await getDashboardData(effectiveUserId);

  if (!dashboardData) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">Nie znaleziono firmy. Proszę najpierw uzupełnić dane firmy w profilu.</p>
        </CardContent>
      </Card>
    );
  }

  return <DashboardContent data={dashboardData} />;
}

// Page component - renders immediately
export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <Suspense fallback={<LoadingFallback message="Ładowanie danych..." />}>
        <DashboardDataFetcher />
      </Suspense>
    </div>
  );
}

