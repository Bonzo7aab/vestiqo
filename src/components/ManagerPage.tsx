"use client";

import {
  Building as BuildingIcon,
  Building2,
  Calendar,
  ClipboardList,
  Euro,
  Mail,
  MapPin,
  Phone,
  Star,
  UserCheck
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserProfile } from '../contexts/AuthContext';
import { getManagerById } from '../mocks';
import { createClient } from '../lib/supabase/client';
import { createTender, updateTender, fetchTenderById, fetchJobApplicationsByJobId, fetchJobById, fetchTenderBidsByTenderId } from '../lib/database/jobs';
import { fetchUserPrimaryCompany, type CompanyData } from '../lib/database/companies';
import { fetchManagerHousingEntities } from '../lib/database/managed-housing-entities';
import type { ManagedHousingEntity } from '../types/managed-housing-entity';
import { formatManagedHousingEntityType } from '../types/managed-housing-entity';
import { fetchContractorsByWorkHistory } from '../lib/database/contractors';
import { getStoragePublicUrl } from '../lib/storage/public-url';
import { STORAGE_BUCKETS } from '../lib/storage/buckets';
import type { Application } from '../types/application';
import { toast } from 'sonner';
import { formatBudget, budgetFromDatabase } from '../types/budget';
import BidEvaluationPanel from './BidEvaluationPanel';
import TenderCreationForm from './TenderCreationForm';
import TenderSystem from './TenderSystem';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { TenderWithCompany, type JobWithCompany } from '../lib/database/jobs';
import Image from 'next/image';

interface ManagerPageProps {
  onBack: () => void;
  onPostJob: () => void;
  shouldOpenTenderForm?: boolean;
  onTenderFormOpened?: () => void;
}

export default function ManagerPage({ onBack: _onBack, onPostJob, shouldOpenTenderForm, onTenderFormOpened }: ManagerPageProps) {
  const { user, isLoading } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URL-based tab management (similar to ContractorPage)
  const [activeTab, setActiveTab] = useState('overview');
  const hasInitializedTabFromUrl = useRef(false);
  const [selectedJobForApplications, setSelectedJobForApplications] = useState<string | null>(null);
  const [showTenderCreation, setShowTenderCreation] = useState(false);
  const [showBidEvaluation, setShowBidEvaluation] = useState(false);
  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);
  const [editingTenderId, setEditingTenderId] = useState<string | null>(null);
  const [editingTenderData, setEditingTenderData] = useState<TenderWithCompany | null>(null);
  const [managedEntities, setManagedEntities] = useState<ManagedHousingEntity[]>([]);
  const [isLoadingManagedEntities, setIsLoadingManagedEntities] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [_isLoadingCompany, setIsLoadingCompany] = useState(false);
  // Priority 3: Prevent concurrent fetches
  const isFetchingRef = React.useRef(false);
  // Track client-side mount to prevent hydration mismatch
  const [isMounted, setIsMounted] = useState(false);
  // Applications state
  const [_applications, setApplications] = useState<Application[]>([]);
  const [_isLoadingApplications, setIsLoadingApplications] = useState(false);
  const [_selectedJobData, setSelectedJobData] = useState<{ title: string; budget: string } | null>(null);
  // Tender bids state
  const [tenderBids, setTenderBids] = useState<Array<{ id: string; contractor_id: string; contest_id: string; proposed_price: number; proposed_timeline: string; status: string; created_at: string; contractor?: { id: string; first_name: string; last_name: string; avatar_url: string | null } }>>([]);
  const [isLoadingTenderBids, setIsLoadingTenderBids] = useState(false);
  const [selectedTenderData, setSelectedTenderData] = useState<{ title: string } | null>(null);
  // Job details dialog state
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<string | null>(null);
  const [jobDetailsData, setJobDetailsData] = useState<JobWithCompany | null>(null);
  const [isLoadingJobDetails, setIsLoadingJobDetails] = useState(false);
  const [showJobDetailsDialog, setShowJobDetailsDialog] = useState(false);
  
  // Tab-specific loading states
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loadingContractors, setLoadingContractors] = useState(false);
  
  // Track which tabs have been loaded
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());
  
  // Tab-specific data state
  const [recentJobs, setRecentJobs] = useState<Array<{
    id: string;
    title: string;
    category: string;
    status: string;
    budget: string;
    applications: number;
    deadline: string;
    address: string;
  }>>([]);
  const [contractors, setContractors] = useState<Array<{
    id: string;
    name: string;
    specialization: string;
    rating: number;
    completedJobs: number;
    currentJob: string;
    avatar: string;
  }>>([]);
  const [dashboardStats, setDashboardStats] = useState<{
    totalProperties: number;
    totalUnits: number;
    activeJobs: number;
    completedJobs: number;
    avgRating: number;
    monthlyBudget: number;
  } | null>(null);

  // Helper function to get public URL for building images
  const getBuildingImageUrl = React.useCallback((imagePath: string | null | undefined): string | null => {
    if (!imagePath) return null;

    if (imagePath.startsWith('http')) {
      return imagePath;
    }

    try {
      return getStoragePublicUrl(STORAGE_BUCKETS.BUILDING_IMAGES, imagePath);
    } catch {
      return imagePath;
    }
  }, []);

  // Helper function to map company type to Polish display name
  const getCompanyTypeDisplayName = (type: string | null): string => {
    const typeMap: { [key: string]: string } = {
      'wspólnota': 'Wspólnota Mieszkaniowa',
      'spółdzielnia': 'Spółdzielnia Mieszkaniowa',
      'property_management': 'Firma zarządzająca nieruchomościami',
      'housing_association': 'Stowarzyszenie Mieszkaniowe',
      'cooperative': 'Spółdzielnia',
      'condo_management': 'Zarządca Nieruchomości',
    };
    return typeMap[type || ''] || 'Organizacja zarządzająca';
  };

  // Format full address from company data
  const getCompanyAddress = (company: CompanyData | null): string => {
    if (!company) return '';
    const parts = [
      company.address,
      company.postal_code,
      company.city
    ].filter(Boolean);
    return parts.join(', ') || '';
  };

  // Pobierz dane zarządcy na podstawie profileId z konta użytkownika
  const managerProfile = user?.id ? getManagerById(user.id) : null;

  // Jeśli brak profilu, użyj domyślnych danych
  const managerData = managerProfile ? {
    name: managerProfile.name,
    type: managerProfile.organizationType === 'wspólnota' ? 'Wspólnota Mieszkaniowa' :
          managerProfile.organizationType === 'spółdzielnia' ? 'Spółdzielnia Mieszkaniowa' :
          managerProfile.organizationType === 'zarządca' ? 'Firma zarządzająca nieruchomościami' :
          managerProfile.organizationType === 'deweloper' ? 'Deweloper' :
          'Administracja nieruchomości',
    address: managerProfile.contactInfo.address,
    phone: managerProfile.contactInfo.phone,
    email: managerProfile.contactInfo.email,
    avatar: managerProfile.avatar || '',
    managerName: managerProfile.contactInfo.contactPerson,
    managerPosition: managerProfile.contactInfo.position,
    license: managerProfile.verification.badges.join(', '),
    experience: `${managerProfile.experience.yearsActive} lat`,
    managedProperties: managerProfile.portfolio.managedBuildings.map(building => ({
      name: building.name,
      type: building.type,
      image: building.images?.[0] || '/api/placeholder/400/300',
      location: building.address,
      buildings: building.type === 'Bloki mieszkalne' ? 10 : 1,
      units: building.unitsCount,
      since: building.yearBuilt.toString()
    })),
    stats: {
      totalProperties: managerProfile.managedProperties.buildingsCount,
      totalUnits: managerProfile.managedProperties.unitsCount,
      activeJobs: 8, // Te dane mogą pochodzić z backendu
      completedJobs: managerProfile.experience.completedProjects,
      avgRating: managerProfile.rating.overall,
      monthlyBudget: 125000 // Przykładowy budżet
    }
  } : {
    // Fallback data dla użytkowników bez pełnego profilu
    name: user?.company || "Nowa organizacja",
    type: "Organizacja zarządzająca",
    address: "ul. Przykładowa 1, 00-000 Warszawa",
    phone: user?.phone || "+48 123 456 789",
    email: user?.email || "kontakt@example.pl",
    avatar: "",
    managerName: (user?.firstName && user?.lastName) ? `${user.firstName} ${user.lastName}` : "Imię Nazwisko",
    managerPosition: "Zarządca",
    license: "Brak licencji",
    experience: "Brak danych",
    managedProperties: [],
    stats: {
      totalProperties: 0,
      totalUnits: 0,
      activeJobs: 0,
      completedJobs: 0,
      avgRating: 0,
      monthlyBudget: 0
    }
  };

  // Track client-side mount to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    
    // Initialize tab from URL on mount (only once)
    if (!hasInitializedTabFromUrl.current) {
      const tabFromUrl = searchParams.get('tab');
      if (tabFromUrl && ['overview', 'jobs', 'tenders', 'properties', 'contractors'].includes(tabFromUrl)) {
        setActiveTab(tabFromUrl);
      }
      hasInitializedTabFromUrl.current = true;
    }
  }, [searchParams]);

  // Persist tab state in URL
  useEffect(() => {
    if (!isMounted || !hasInitializedTabFromUrl.current) return;
    
    const currentTab = searchParams.get('tab') || 'overview';
    if (currentTab === activeTab) return; // No change needed
    
    const params = new URLSearchParams(searchParams);
    if (activeTab !== 'overview') {
      params.set('tab', activeTab);
    } else {
      params.delete('tab');
    }
    
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  }, [activeTab, isMounted, router, searchParams]);

  // Auto-open tender form if requested from main page
  useEffect(() => {
    if (shouldOpenTenderForm && isMounted && hasInitializedTabFromUrl.current) {
      setActiveTab('tenders');
      setShowTenderCreation(true);
      onTenderFormOpened?.();
    }
  }, [shouldOpenTenderForm, onTenderFormOpened, isMounted]);

  // Fetch company on initial load (needed for header)
  useEffect(() => {
    async function loadCompany() {
      if (!user?.id) return;

      // Priority 3: Prevent concurrent fetches
      if (isFetchingRef.current) {
        return;
      }

      isFetchingRef.current = true;
      setIsLoadingCompany(true);
      try {
        const supabase = createClient();
        const { data: companyData, error: companyError } = await fetchUserPrimaryCompany(supabase, user.id);
        
        if (companyError || !companyData) {
          setCompany(null);
          setCompanyId(null);
          setIsLoadingCompany(false);
          isFetchingRef.current = false;
          return;
        }

        setCompany(companyData);
        setCompanyId(companyData.id);
      } catch (err) {
        console.error('Error loading company:', err);
        setCompany(null);
        setCompanyId(null);
      } finally {
        setIsLoadingCompany(false);
        // Priority 3: Reset fetch flag
        isFetchingRef.current = false;
      }
    }

    loadCompany();

    // Cleanup function
    return () => {
      isFetchingRef.current = false;
    };
  }, [user?.id]);


  // Fetch applications when a job is selected
  useEffect(() => {
    async function loadApplications() {
      if (!selectedJobForApplications) {
        setApplications([]);
        setSelectedJobData(null);
        return;
      }

      setIsLoadingApplications(true);
      try {
        const supabase = createClient();
        
        // Fetch job data to get title and budget
        const { data: jobData, error: jobError } = await fetchJobById(supabase, selectedJobForApplications);
        
        if (jobError || !jobData) {
          console.error('Error fetching job data:', jobError);
          toast.error('Nie udało się załadować danych zgłoszenia');
          setSelectedJobData(null);
        } else {
          // Format budget from raw fields
          const { budgetFromDatabase } = await import('../types/budget');
          const budget = jobData.budget || budgetFromDatabase({
            budget_min: jobData.budget_min ?? null,
            budget_max: jobData.budget_max ?? null,
            budget_type: (jobData.budget_type || 'fixed') as 'fixed' | 'hourly' | 'negotiable' | 'range',
            currency: jobData.currency || 'PLN',
          });
          
          const budgetStr = formatBudget(budget);
          
          setSelectedJobData({
            title: jobData.title,
            budget: budgetStr
          });
        }
        
        // Fetch applications
        const { data: applicationsData, error: applicationsError } = await fetchJobApplicationsByJobId(
          supabase,
          selectedJobForApplications
        );
        
        if (applicationsError) {
          console.error('Error fetching applications:', applicationsError);
          toast.error('Nie udało się załadować ofert');
          setApplications([]);
        } else {
          setApplications(applicationsData || []);
        }
      } catch (err) {
        console.error('Error loading applications:', err);
        toast.error('Wystąpił błąd podczas ładowania ofert');
        setApplications([]);
      } finally {
        setIsLoadingApplications(false);
      }
    }

    loadApplications();
  }, [selectedJobForApplications]);

  // Fetch job details when a job is selected for details dialog
  useEffect(() => {
    async function loadJobDetails() {
      if (!selectedJobForDetails || !showJobDetailsDialog) {
        return;
      }

      setIsLoadingJobDetails(true);
      try {
        const supabase = createClient();
        const { data: jobData, error: jobError } = await fetchJobById(supabase, selectedJobForDetails);
        
        if (jobError || !jobData) {
          console.error('Error fetching job details:', jobError);
          toast.error('Nie udało się załadować szczegółów zgłoszenia');
          setJobDetailsData(null);
        } else {
          setJobDetailsData(jobData);
        }
      } catch (err) {
        console.error('Error loading job details:', err);
        toast.error('Wystąpił błąd podczas ładowania szczegółów zgłoszenia');
        setJobDetailsData(null);
      } finally {
        setIsLoadingJobDetails(false);
      }
    }

    loadJobDetails();
  }, [selectedJobForDetails, showJobDetailsDialog]);

  // Fetch tender bids when a tender is selected for evaluation
  useEffect(() => {
    async function loadTenderBids() {
      if (!selectedTenderId || !showBidEvaluation) {
        setTenderBids([]);
        setSelectedTenderData(null);
        return;
      }

      setIsLoadingTenderBids(true);
      try {
        const supabase = createClient();
        
        // Fetch tender data to get title
        const { data: tenderData, error: tenderError } = await fetchTenderById(supabase, selectedTenderId);
        
        if (tenderError || !tenderData) {
          console.error('Error fetching tender data:', tenderError);
          toast.error('Nie udało się załadować danych przetargu');
          setSelectedTenderData(null);
        } else {
          setSelectedTenderData({
            title: tenderData.title
          });
        }
        
        // Fetch bids
        const { data: bidsData, error: bidsError } = await fetchTenderBidsByTenderId(
          supabase,
          selectedTenderId
        );
        
        if (bidsError) {
          console.error('Error fetching tender bids:', bidsError);
          toast.error('Nie udało się załadować ofert');
          setTenderBids([]);
        } else {
          setTenderBids((bidsData || []) as Array<{ id: string; contractor_id: string; contest_id: string; proposed_price: number | null; proposed_timeline: string | null; status: string; created_at: string; contractor?: { id: string; first_name: string; last_name: string; avatar_url: string | null } }>);
        }
      } catch (err) {
        console.error('Error loading tender bids:', err);
        toast.error('Wystąpił błąd podczas ładowania ofert');
        setTenderBids([]);
      } finally {
        setIsLoadingTenderBids(false);
      }
    }

    loadTenderBids();
  }, [selectedTenderId, showBidEvaluation]);

  // Fetch overview tab data when tab is opened
  useEffect(() => {
    const fetchOverviewData = async () => {
      if (activeTab !== 'overview' || !companyId || loadedTabs.has('overview')) {
        return;
      }

      const supabase = createClient();
      
      try {
        setLoadingOverview(true);
        
        // Fetch buildings count for stats
        const { data: entitiesData } = await fetchManagerHousingEntities(supabase, companyId);
        const entitiesCount = entitiesData?.length || 0;
        
        // Fetch jobs count for stats (active jobs)
        const { count: activeJobsCount } = await supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('status', 'active');
        
        const { count: completedJobsCount } = await supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('status', 'completed');
        
        // Fetch recent jobs (limit 5 for overview)
        const { data: jobsData } = await supabase
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
            job_categories!jobs_category_id_fkey (name),
            location
          `)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(5);
        
        // Format jobs for display
        const formattedJobs = (jobsData || []).map((job: {
          id: string;
          title: string;
          budget_min: number | null;
          budget_max: number | null;
          budget_type: 'fixed' | 'hourly' | 'negotiable' | 'range';
          currency: string;
          deadline: string;
          status: string;
          job_categories: { name: string } | null;
          location: string | { city?: string };
        }) => {
          const location = typeof job.location === 'string' 
            ? job.location 
            : (job.location as { city?: string })?.city || 'Nieznana lokalizacja';
          
          return {
            id: job.id,
            title: job.title,
            category: job.job_categories?.name || 'Inne',
            status: job.status || 'active',
            budget: job.budget_min?.toString() || '0',
            applications: 0, // Would need to fetch separately
            deadline: job.deadline || '',
            address: location
          };
        });
        
        // Fetch recent contractors (limit 5 for overview)
        // For now, use mock data - can be replaced with actual query later
        const mockContractors = [
          {
            id: '1',
            name: 'Firma Malarze Sp. z o.o.',
            specialization: 'Roboty malarskie',
            rating: 4.8,
            completedJobs: 23,
            currentJob: 'Malowanie klatki schodowej',
            avatar: ''
          },
          {
            id: '2',
            name: 'TechService Windy',
            specialization: 'Konserwacja wind',
            rating: 4.9,
            completedJobs: 15,
            currentJob: 'Przegląd roczny wind',
            avatar: ''
          },
          {
            id: '3',
            name: 'Zielona Firma',
            specialization: 'Utrzymanie zieleni',
            rating: 4.5,
            completedJobs: 31,
            currentJob: 'Przycinanie krzewów',
            avatar: ''
          }
        ];
        
        // Set stats
        setDashboardStats({
          totalProperties: entitiesCount,
          totalUnits: entitiesCount,
          activeJobs: activeJobsCount || 0,
          completedJobs: completedJobsCount || 0,
          avgRating: managerData.stats.avgRating,
          monthlyBudget: managerData.stats.monthlyBudget
        });
        
        setRecentJobs(formattedJobs);
        setContractors(mockContractors.slice(0, 3));
        
        setLoadedTabs(prev => new Set(prev).add('overview'));
      } catch (error) {
        console.error('Error fetching overview data:', error);
      } finally {
        setLoadingOverview(false);
      }
    };

    fetchOverviewData();
  }, [activeTab, companyId, loadedTabs, managerData.stats.avgRating, managerData.stats.monthlyBudget]);

  // Fetch jobs tab data when tab is opened
  useEffect(() => {
    const fetchJobsData = async () => {
      if (activeTab !== 'jobs' || !companyId || loadedTabs.has('jobs')) {
        return;
      }

      const supabase = createClient();
      
      try {
        setLoadingJobs(true);
        
        // Fetch all jobs for the company (similar to tenders tab)
        const { data: jobsData, error: jobsError } = await supabase
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
            job_categories!jobs_category_id_fkey (name),
            location
          `)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (jobsError) {
          console.error('Error fetching jobs:', jobsError);
          toast.error('Nie udało się załadować zgłoszeń');
          setRecentJobs([]);
          return;
        }

        // Get all job IDs to count applications
        const jobIds = (jobsData || []).map((job: { id: string }) => job.id);

        // Count applications for each job (all statuses)
        const applicationCounts: { [key: string]: number } = {};
        if (jobIds.length > 0) {
          const { data: applicationsData } = await supabase
            .from('job_applications' as never)
            .select('job_id')
            .in('job_id', jobIds);

          if (applicationsData) {
            for (const app of applicationsData as Array<{ job_id: string }>) {
              const jobId = app.job_id;
              if (jobId) {
                applicationCounts[jobId] = (applicationCounts[jobId] || 0) + 1;
              }
            }
          }
        }

        // Import budget helper
        const { budgetFromDatabase } = await import('../types/budget');

        // Format jobs for display
        const formattedJobs = (jobsData || []).map((job: {
          id: string;
          title: string;
          budget_min: number | null;
          budget_max: number | null;
          budget_type: 'fixed' | 'hourly' | 'negotiable' | 'range';
          currency: string;
          deadline: string;
          status: string;
          job_categories: { name: string } | null;
          location: string | { city?: string };
        }) => {
          const location = typeof job.location === 'string' 
            ? job.location 
            : (job.location as { city?: string })?.city || 'Nieznana lokalizacja';

          // Format budget
          const budget = budgetFromDatabase({
            budget_min: job.budget_min ?? null,
            budget_max: job.budget_max ?? null,
            budget_type: (job.budget_type || 'fixed') as 'fixed' | 'hourly' | 'negotiable' | 'range',
            currency: job.currency || 'PLN',
          });
          const budgetStr = formatBudget(budget);

          return {
            id: job.id,
            title: job.title,
            category: job.job_categories?.name || 'Inne',
            status: job.status || 'active',
            budget: budgetStr,
            applications: applicationCounts[job.id] || 0,
            deadline: job.deadline || '',
            address: location
          };
        });
        
        setRecentJobs(formattedJobs);
        
        setLoadedTabs(prev => new Set(prev).add('jobs'));
      } catch (error) {
        console.error('Error fetching jobs data:', error);
        toast.error('Nie udało się załadować zgłoszeń');
        setRecentJobs([]);
      } finally {
        setLoadingJobs(false);
      }
    };

    fetchJobsData();
  }, [activeTab, companyId, loadedTabs]);

  // Fetch properties tab data when tab is opened
  useEffect(() => {
    const fetchPropertiesData = async () => {
      if (activeTab !== 'properties' || !companyId || loadedTabs.has('properties')) {
        return;
      }

      const supabase = createClient();
      
      try {
        setIsLoadingManagedEntities(true);
        
        const { data: entitiesData, error: entitiesError } = await fetchManagerHousingEntities(
          supabase,
          companyId,
        );
        
        if (entitiesError) {
          console.error('Error fetching managed entities:', entitiesError);
          setManagedEntities([]);
        } else {
          setManagedEntities(entitiesData || []);
        }
        
        setLoadedTabs(prev => new Set(prev).add('properties'));
      } catch (error) {
        console.error('Error fetching properties data:', error);
        setManagedEntities([]);
      } finally {
        setIsLoadingManagedEntities(false);
      }
    };

    fetchPropertiesData();
  }, [activeTab, companyId, loadedTabs]);

  // Fetch contractors tab data when tab is opened
  useEffect(() => {
    const fetchContractorsData = async () => {
      if (activeTab !== 'contractors' || loadedTabs.has('contractors') || !companyId) {
        return;
      }

      try {
        setLoadingContractors(true);
        
        const supabase = createClient();
        const contractorsData = await fetchContractorsByWorkHistory(supabase, companyId);
        
        setContractors(contractorsData);
        
        setLoadedTabs(prev => new Set(prev).add('contractors'));
      } catch (error) {
        console.error('Error fetching contractors data:', error);
        toast.error('Nie udało się załadować wykonawców');
        setContractors([]);
      } finally {
        setLoadingContractors(false);
      }
    };

    fetchContractorsData();
  }, [activeTab, loadedTabs, companyId]);

  const handleTenderCreate = () => {
    router.push('/dodaj-konkurs');
  };

  const handleTenderEdit = async (tenderId: string) => {
    try {
      const supabase = createClient();
      const { data: tenderData, error } = await fetchTenderById(supabase, tenderId);
      
      if (error || !tenderData) {
        toast.error('Nie udało się załadować danych przetargu');
        console.error('Error fetching tender:', error);
        return;
      }

      // Verify it's a draft tender
      if (tenderData.status !== 'draft') {
        toast.error('Tylko przetargi w statusie szkicu mogą być edytowane');
        return;
      }

      setEditingTenderId(tenderId);
      setEditingTenderData(tenderData);
      setShowTenderCreation(true);
    } catch (error) {
      toast.error('Wystąpił błąd podczas ładowania przetargu');
      console.error('Error in handleTenderEdit:', error);
    }
  };

  const handleTenderSubmit = async (tender: {
    title: string;
    description: string;
    category: string;
    location: string;
    estimatedValue: string;
    currency: string;
    submissionDeadline: Date;
    evaluationDeadline: Date;
    requirements: string[];
    evaluationCriteria: Array<{ id: string; name: string; description: string; weight: number; type: 'price' | 'quality' | 'time' | 'experience' | 'other' }>;
    documents: Array<{ id: string; name: string; type: 'specification' | 'requirements' | 'drawings' | 'other'; file: File }>;
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
  }, tenderId?: string) => {
    if (!user?.id) {
      toast.error('Musisz być zalogowany, aby utworzyć przetarg');
      return;
    }

    try {
      const supabase = createClient();
      
      // Check if we're editing or creating
      const isEditing = !!tenderId;
      
      if (isEditing) {
        // Update existing tender
        const { error: updateError } = await updateTender(supabase, tenderId, tender as {
          title: string;
          description: string;
          category: string;
          location: string;
          estimatedValue: string;
          currency: string;
          submissionDeadline: Date;
          evaluationDeadline: Date;
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
        });
        
        if (updateError) {
          toast.error('Nie udało się zaktualizować przetargu: ' + (updateError.message || 'Nieznany błąd'));
          console.error('Error updating tender:', updateError);
          return;
        }

        toast.success(tender.status === 'draft' ? 'Przetarg zaktualizowany jako szkic' : 'Przetarg został zaktualizowany i opublikowany');
      } else {
        // Create new tender
        // Get user's primary company
        const { data: company, error: companyError } = await fetchUserPrimaryCompany(supabase, user.id);
        
        if (companyError || !company) {
          toast.error('Nie znaleziono firmy. Proszę najpierw uzupełnić dane firmy w profilu.');
          console.error('Error fetching company:', companyError);
          return;
        }

        // Save tender to database
        const { error: saveError } = await createTender(supabase, {
          ...(tender as {
            title: string;
            description: string;
            category: string;
            location: string;
            estimatedValue: string;
            currency: string;
            submissionDeadline: Date;
            evaluationDeadline: Date;
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
          }),
          managerId: user.id,
          companyId: company.id,
        });

        if (saveError) {
          toast.error('Nie udało się zapisać przetargu: ' + (saveError.message || 'Nieznany błąd'));
          console.error('Error saving tender:', saveError);
          return;
        }

        toast.success(tender.status === 'draft' ? 'Przetarg zapisany jako szkic' : 'Przetarg został opublikowany');
      }

      // Reset editing state
      setEditingTenderId(null);
      setEditingTenderData(null);
      setShowTenderCreation(false);
      
      // Refresh route data without forcing a hard browser reload.
      router.refresh();
    } catch (error) {
      toast.error('Wystąpił błąd podczas zapisywania przetargu');
      console.error('Error in handleTenderSubmit:', error);
    }
  };

  const handleTenderSelect = (tenderId: string) => {
    setSelectedTenderId(tenderId);
    setShowBidEvaluation(true);
    // Stay in tenders tab to view bids
  };

  const handleAwardTender = (_bidId: string, _notes: string) => {
    // In real app, this would award the tender
    setShowBidEvaluation(false);
  };

  const handleRejectBid = (_bidId: string, _reason: string) => {
    // In real app, this would reject the bid
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Aktywne', variant: 'default' as const, color: 'bg-blue-100 text-blue-800' },
      completed: { label: 'Zakończone', variant: 'secondary' as const, color: 'bg-green-100 text-green-800' },
      pending: { label: 'Oczekujące', variant: 'outline' as const, color: 'bg-yellow-100 text-yellow-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  // Priority 2: Standardize loading states - show loading spinner during auth checks
  // Must be after all hooks to follow Rules of Hooks
  // Prevent hydration mismatch by not rendering loading state during SSR
  if (!isMounted || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Ładowanie...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4 md:gap-6">
              <Avatar className="w-12 h-12 md:w-16 md:h-16 flex-shrink-0">
                <AvatarImage src={company?.logo_url || ''} />
                <AvatarFallback className="bg-primary text-white">
                  {(company?.name || user?.company || 'N').split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl md:text-3xl font-bold break-words">{company?.name || user?.company || 'Nowa organizacja'}</h1>
                <p className="text-gray-600 text-sm md:text-base">{getCompanyTypeDisplayName(company?.type || null)}</p>
                <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-500 mt-2">
                  {getCompanyAddress(company) && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                      <span className="break-words">{getCompanyAddress(company)}</span>
                    </div>
                  )}
                  {company?.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                      <span className="break-all">{company.phone}</span>
                    </div>
                  )}
                  {(company?.email || user?.email) && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                      <span className="break-all">{company?.email || user?.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 md:gap-3 w-full md:w-auto">
              <Button onClick={handleTenderCreate} className="flex-1 md:flex-initial">
                Utwórz konkurs
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="grid w-full grid-cols-5 min-w-[500px] md:min-w-0">
              <TabsTrigger value="overview" className="text-xs md:text-sm whitespace-nowrap">Przegląd</TabsTrigger>
              <TabsTrigger value="jobs" className="text-xs md:text-sm whitespace-nowrap">Zgłoszenia</TabsTrigger>
              <TabsTrigger value="tenders" className="text-xs md:text-sm whitespace-nowrap">Przetargi</TabsTrigger>
              <TabsTrigger value="properties" className="text-xs md:text-sm whitespace-nowrap">Nieruchomości</TabsTrigger>
              <TabsTrigger value="contractors" className="text-xs md:text-sm whitespace-nowrap">Wykonawcy</TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {loadingOverview ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="ml-2 text-sm text-muted-foreground">Ładowanie danych...</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Nieruchomości</CardTitle>
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardStats?.totalProperties || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        {dashboardStats?.totalUnits || 0} lokali mieszkalnych
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Aktywne zgłoszenia</CardTitle>
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardStats?.activeJobs || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        {dashboardStats?.completedJobs || 0} zakończonych w tym roku
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Ocena wykonawców</CardTitle>
                      <Star className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardStats?.avgRating || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        Średnia ocena z ostatnich projektów
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Budżet miesięczny</CardTitle>
                      <Euro className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{(dashboardStats?.monthlyBudget || 0).toLocaleString()} zł</div>
                      <p className="text-xs text-muted-foreground">
                        Planowany na luty 2024
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Najnowsze zgłoszenia</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {recentJobs.length > 0 ? recentJobs.slice(0, 3).map((job) => (
                    <div key={job.id} className="flex items-center justify-between border-b pb-3">
                      <div className="flex-1">
                        <h4 className="font-medium">{job.title}</h4>
                        <p className="text-sm text-gray-600">{job.address}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(job.status)}
                          <span className="text-xs text-gray-500">{job.applications} ofert</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatBudget(
                            typeof job.budget === 'string' 
                              ? {
                                  min: parseFloat(job.budget) || null,
                                  max: parseFloat(job.budget) || null,
                                  type: 'fixed',
                                  currency: 'PLN',
                                }
                              : job.budget
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{job.deadline}</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Brak zgłoszeń</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sprawdzeni wykonawcy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {contractors.length > 0 ? contractors.slice(0, 3).map((contractor) => (
                    <div key={contractor.id} className="flex items-center gap-3 border-b pb-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={contractor.avatar} />
                        <AvatarFallback>{contractor.name.split(' ')[0][0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-medium">{contractor.name}</h4>
                        <p className="text-sm text-gray-600">{contractor.specialization}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs">{contractor.rating}</span>
                          </div>
                          <span className="text-xs text-gray-500">{contractor.completedJobs} projektów</span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Brak wykonawców</p>
                  )}
                </CardContent>
              </Card>
            </div>
              </>
            )}
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <h2 className="text-xl md:text-2xl font-bold">Zarządzanie zgłoszeniami</h2>
              <div className="flex flex-wrap gap-2 md:gap-3">
                <Button onClick={handleTenderCreate} className="flex-1 md:flex-initial">
                  Utwórz konkurs
                </Button>
              </div>
            </div>

            {loadingJobs ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="ml-2 text-sm text-muted-foreground">Ładowanie zgłoszeń...</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {recentJobs.length > 0 ? recentJobs.map((job) => (
                <Card key={job.id}>
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                          <h3 className="font-semibold text-base md:text-lg break-words">{job.title}</h3>
                          {getStatusBadge(job.status)}
                        </div>
                        <p className="text-gray-600 mb-2 text-sm md:text-base">{job.category}</p>
                        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                            <span className="break-words">{job.address}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                            <span>Termin: {job.deadline}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <UserCheck className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                            <span>{job.applications} ofert</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col md:text-right gap-2 md:gap-0">
                        <p className="text-xl md:text-2xl font-bold text-green-600">
                          {formatBudget(
                            typeof job.budget === 'string' 
                              ? {
                                  min: parseFloat(job.budget) || null,
                                  max: parseFloat(job.budget) || null,
                                  type: 'fixed',
                                  currency: 'PLN',
                                }
                              : job.budget
                          )}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 mt-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedJobForDetails(job.id);
                              setShowJobDetailsDialog(true);
                            }}
                            className="w-full sm:w-auto"
                          >
                            Szczegóły
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => setSelectedJobForApplications(job.id)}
                            className="w-full sm:w-auto"
                          >
                            Zobacz oferty
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-muted-foreground">Brak zgłoszeń</p>
                  </CardContent>
                </Card>
              )}
            </div>
            )}
          </TabsContent>

          {/* Tenders Tab */}
          <TabsContent value="tenders" className="space-y-6">
            {selectedTenderId && showBidEvaluation ? (
              <div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedTenderId(null);
                    setShowBidEvaluation(false);
                  }}
                  className="mb-4"
                >
                  ← Powrót do listy przetargów
                </Button>
                {isLoadingTenderBids ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="ml-2 text-sm text-muted-foreground">Ładowanie ofert...</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <BidEvaluationPanel
                    tenderId={selectedTenderId}
                    tenderTitle={selectedTenderData?.title || 'Przetarg'}
                    evaluationCriteria={[
                      { id: 'price', name: 'Cena oferty', description: 'Łączna cena realizacji', weight: 40, type: 'price' },
                      { id: 'quality', name: 'Jakość wykonania', description: 'Doświadczenie i referencje', weight: 30, type: 'quality' },
                      { id: 'time', name: 'Termin realizacji', description: 'Czas wykonania prac', weight: 20, type: 'time' },
                      { id: 'warranty', name: 'Gwarancja', description: 'Okres gwarancji i serwis', weight: 10, type: 'quality' }
                    ]}
                    bids={(tenderBids as unknown) as Array<{
                      id: string;
                      contractorId: string;
                      contractorName: string;
                      contractorCompany: string;
                      contractorAvatar?: string;
                      contractorRating: number;
                      contractorCompletedJobs: number;
                      totalPrice: number;
                      currency: string;
                      proposedTimeline: number;
                      proposedStartDate: Date;
                      guaranteePeriod: number;
                      description: string;
                      technicalProposal: string;
                      attachments: Array<{ id: string; name: string; type: string; url: string; size: number }>;
                      criteriaResponses: Array<{ criterionId: string; response: string }>;
                      submittedAt: Date;
                      status: 'submitted' | 'under_review' | 'shortlisted' | 'rejected' | 'awarded';
                      evaluation?: {
                        criteriaScores: Record<string, number>;
                        totalScore: number;
                        evaluatorNotes: string;
                        evaluatedAt: Date;
                        evaluatorId: string;
                      };
                    }>}
                    onClose={() => {
                      setShowBidEvaluation(false);
                      setSelectedTenderId(null);
                    }}
                    onAwardTender={handleAwardTender}
                    onRejectBid={handleRejectBid}
                  />
                )}
              </div>
            ) : (
              <TenderSystem 
                userRole="manager"
                onTenderCreate={handleTenderCreate}
                onTenderSelect={handleTenderSelect}
                onTenderEdit={handleTenderEdit}
                onViewBids={(tenderId) => {
                  setSelectedTenderId(tenderId);
                  setShowBidEvaluation(true);
                }}
              />
            )}
          </TabsContent>

          {/* Properties Tab */}
          <TabsContent value="properties" className="space-y-6">
            {isLoadingManagedEntities ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="ml-2 text-sm text-muted-foreground">Ładowanie wspólnot i spółdzielni...</p>
                  </div>
                </CardContent>
              </Card>
            ) : managedEntities && managedEntities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {managedEntities.map((entity) => (
                  <Card key={entity.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg">{entity.name}</CardTitle>
                        <Badge variant="secondary">
                          {formatManagedHousingEntityType(entity.entity_type)}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>
                          {[entity.address, entity.postal_code, entity.city].filter(Boolean).join(', ') ||
                            '—'}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">NIP {entity.nip}</p>
                      {entity.regon ? (
                        <p className="text-sm text-gray-500 mt-1">REGON {entity.regon}</p>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center">
                  <BuildingIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Brak zarejestrowanych podmiotów</h3>
                  <p className="text-gray-600 mb-4">
                    Nie posiadasz jeszcze zarejestrowanych wspólnot ani spółdzielni.
                  </p>
                  <p className="text-sm text-gray-500">
                    Przejdź do sekcji &quot;Profil&quot; w ustawieniach konta, aby dodać podmioty po NIP.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Contractors Tab */}
          <TabsContent value="contractors" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl md:text-2xl font-bold">Wykonawcy</h2>
            </div>
            
            {loadingContractors ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="ml-2 text-sm text-muted-foreground">Ładowanie wykonawców...</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {contractors.length > 0 ? (
                  contractors.map((contractor) => (
                    <Card key={contractor.id}>
                      <CardContent className="p-4 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          <Avatar className="w-12 h-12 md:w-16 md:h-16 flex-shrink-0">
                            <AvatarImage src={contractor.avatar} />
                            <AvatarFallback>{contractor.name.split(' ')[0][0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base md:text-lg break-words">{contractor.name}</h3>
                            <p className="text-gray-600 mb-2 text-sm md:text-base">{contractor.specialization}</p>
                            <div className="flex flex-wrap items-center gap-2 md:gap-4">
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 md:w-4 md:h-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                                <span className="text-xs md:text-sm">{contractor.rating} • {contractor.completedJobs} projektów</span>
                              </div>
                              <Badge variant="outline" className="text-xs">{contractor.currentJob}</Badge>
                            </div>
                            <p className="text-xs md:text-sm text-gray-500 mt-2">
                              Kliknij &quot;Zobacz profil&quot;, aby zobaczyć portfolio wykonawcy
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                            <Button variant="outline" size="sm" className="w-full sm:w-auto">Wiadomość</Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => router.push(`/wykonawcy/${contractor.id}`)}
                              className="w-full sm:w-auto"
                            >
                              Zobacz profil
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-muted-foreground">Brak wykonawców</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      {showTenderCreation && (
        <TenderCreationForm
          onClose={() => {
            setShowTenderCreation(false);
            setEditingTenderId(null);
            setEditingTenderData(null);
          }}
          onSubmit={handleTenderSubmit}
          tenderId={editingTenderId || undefined}
          initialData={editingTenderData || undefined}
        />
      )}

      {/* Job Details Dialog */}
      <Dialog open={showJobDetailsDialog} onOpenChange={(open) => {
        setShowJobDetailsDialog(open);
        if (!open) {
          setSelectedJobForDetails(null);
          setJobDetailsData(null);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Szczegóły zgłoszenia</DialogTitle>
            <DialogDescription>
              Pełne informacje o zgłoszeniu
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingJobDetails ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="ml-2 text-sm text-muted-foreground">Ładowanie szczegółów...</p>
            </div>
          ) : jobDetailsData ? (
            <div className="min-w-0 space-y-4">
              {/* Title and Status */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">{jobDetailsData.title}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    {getStatusBadge(jobDetailsData.status)}
                    <span className="text-sm text-gray-600">
                      {jobDetailsData.category?.name || 'Inne'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Budget */}
              <div className="flex items-center gap-2">
                <Euro className="w-4 h-4 text-gray-500" />
                <span className="font-semibold text-lg">
                  {jobDetailsData.budget 
                    ? formatBudget(jobDetailsData.budget)
                    : formatBudget(budgetFromDatabase({
                        budget_min: jobDetailsData.budget_min ?? null,
                        budget_max: jobDetailsData.budget_max ?? null,
                        budget_type: (jobDetailsData.budget_type || 'fixed') as 'fixed' | 'hourly' | 'negotiable' | 'range',
                        currency: jobDetailsData.currency || 'PLN',
                      }))}
                </span>
              </div>

              {/* Location */}
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">
                  {typeof jobDetailsData.location === 'string' 
                    ? jobDetailsData.location 
                    : jobDetailsData.location?.city || 'Nieznana lokalizacja'}
                </span>
              </div>

              {/* Deadline */}
              {jobDetailsData.deadline && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">
                    Termin: {new Date(jobDetailsData.deadline).toLocaleDateString('pl-PL')}
                  </span>
                </div>
              )}

              {/* Description */}
              {jobDetailsData.description && (
                <div className="min-w-0">
                  <h3 className="font-semibold mb-2">Opis zgłoszenia</h3>
                  <p className="max-w-full break-words text-gray-700 whitespace-pre-wrap">{jobDetailsData.description}</p>
                </div>
              )}

              {/* Requirements */}
              {jobDetailsData.requirements && jobDetailsData.requirements.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Wymagania</h3>
                  <ul className="space-y-1">
                    {jobDetailsData.requirements.map((req, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-primary mt-1">•</span>
                        <span className="text-gray-700">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Responsibilities */}
              {jobDetailsData.responsibilities && jobDetailsData.responsibilities.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Zakres prac</h3>
                  <ul className="space-y-1">
                    {jobDetailsData.responsibilities.map((resp, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-primary mt-1">•</span>
                        <span className="text-gray-700">{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Skills Required */}
              {jobDetailsData.skills_required && jobDetailsData.skills_required.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Wymagane umiejętności</h3>
                  <div className="flex flex-wrap gap-2">
                    {jobDetailsData.skills_required.map((skill, index) => (
                      <Badge key={index} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Information */}
              {(jobDetailsData.contact_person || jobDetailsData.contact_phone || jobDetailsData.contact_email) && (
                <div>
                  <h3 className="font-semibold mb-2">Informacje kontaktowe</h3>
                  <div className="space-y-1 text-sm">
                    {jobDetailsData.contact_person && (
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">{jobDetailsData.contact_person}</span>
                      </div>
                    )}
                    {jobDetailsData.contact_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">{jobDetailsData.contact_phone}</span>
                      </div>
                    )}
                    {jobDetailsData.contact_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">{jobDetailsData.contact_email}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Building Information */}
              {jobDetailsData.building_type && (
                <div>
                  <h3 className="font-semibold mb-2">Informacje o budynku</h3>
                  <div className="space-y-1 text-sm text-gray-700">
                    <div>Typ budynku: {jobDetailsData.building_type}</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nie udało się załadować szczegółów zgłoszenia</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}