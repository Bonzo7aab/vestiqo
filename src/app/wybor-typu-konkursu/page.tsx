'use client'

import JobTypeSelectionPage from '../../components/JobTypeSelectionPage';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '../../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import { fetchUserPrimaryCompany } from '../../lib/database/companies';
import { toast } from 'sonner';
import { kontoCompanyDataHref } from '../../lib/konto-tabs';

export default function ContestTypeSelection() {
  const router = useRouter();
  const { user, isLoading } = useUserProfile();
  const [hasCompany, setHasCompany] = useState<boolean | null>(null);
  const [isCheckingCompany, setIsCheckingCompany] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(`/logowanie?redirectTo=${encodeURIComponent('/wybor-typu-konkursu')}`);
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (isLoading || !user) return;
    if (user.userType !== 'manager') return;
    if (hasCompany === false) return;
    if (isCheckingCompany || hasCompany === null) return;
    router.replace('/dodaj-konkurs');
  }, [user, isLoading, hasCompany, isCheckingCompany, router]);

  useEffect(() => {
    const checkCompany = async () => {
      if (!user?.id || user.userType !== 'manager') {
        setHasCompany(null);
        setIsCheckingCompany(false);
        return;
      }

      setIsCheckingCompany(true);
      try {
        const supabase = createClient();
        const { data: company } = await fetchUserPrimaryCompany(supabase, user.id);
        setHasCompany(!!company);
      } catch (error) {
        console.error('Error checking company:', error);
        setHasCompany(false);
      } finally {
        setIsCheckingCompany(false);
      }
    };

    checkCompany();
  }, [user]);

  if (isLoading || !user) {
    return null;
  }

  const navigateToCreateContest = () => {
    if (user?.userType === 'manager') {
      if (hasCompany === false) {
        toast.error('Najpierw musisz dodać dane firmy w profilu');
        router.push(kontoCompanyDataHref('manager'));
        return;
      }
      if (isCheckingCompany || hasCompany === null) {
        return;
      }
    }

    router.push('/dodaj-konkurs');
  };

  return (
    <JobTypeSelectionPage
      onBack={() => router.push('/')}
      onSelectJob={navigateToCreateContest}
      onSelectTender={navigateToCreateContest}
      isAuthenticated={user?.userType === 'manager'}
      userType={user?.userType}
      hasCompany={hasCompany}
      isCheckingCompany={isCheckingCompany}
    />
  );
}
