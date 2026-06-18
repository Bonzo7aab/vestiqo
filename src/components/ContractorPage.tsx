"use client";

import {
  Award,
  CheckCircle,
  Clock,
  Edit,
  Euro,
  Eye,
  Loader2,
  MapPin,
  MessagesSquare,
  Plus,
  Send,
  Shield,
  Star,
  Trash2,
  Briefcase,
  FolderKanban,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserProfile } from '../contexts/AuthContext';
import { createClient } from '../lib/supabase/client';
import { 
  fetchContractorDashboardStats,
  fetchContractorApplications,
  fetchPlatformProjectHistory,
  fetchContractorPortfolio,
  fetchPortfolioProjectById,
  deletePortfolioProject,
  fetchContractorRatingSummary,
  fetchContractorRecentActivities,
  fetchContractorReviews,
  type ContractorProfile,
  type ContractorApplication,
  type ContractorBid,
  type ContractorStats,
  type Certificate,
  type PlatformProject
} from '../lib/database/contractors';
import { fetchUserPrimaryCompany } from '../lib/database/companies';
import MessagingSystem from './MessagingSystem';
import MyApplications from './MyApplications';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import PortfolioProjectForm from './PortfolioProjectForm';
import ServicePricingManager from './ServicePricingManager';
import { toast } from 'sonner';
import { kontoCompanyDataHref } from '../lib/konto-tabs';
import Image from 'next/image';

interface ContractorPageProps {
  onBack: () => void;
  onBrowseJobs: () => void;
}

export default function ContractorPage({ onBack: _onBack, onBrowseJobs }: ContractorPageProps) {
  const { user } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URL-based tab management (similar to /konto page)
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMounted, setIsMounted] = useState(false);
  const hasInitializedTabFromUrl = useRef(false);

  // Track client-side mount to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    
    // Initialize tab from URL on mount (only once)
    if (!hasInitializedTabFromUrl.current) {
      const tabFromUrl = searchParams.get('tab');
      if (tabFromUrl && ['dashboard', 'applications', 'projects', 'ratings', 'pricing'].includes(tabFromUrl)) {
        setActiveTab(tabFromUrl);
      }
      hasInitializedTabFromUrl.current = true;
    }
  }, [searchParams]);

  // Persist tab state in URL
  useEffect(() => {
    if (!isMounted || !hasInitializedTabFromUrl.current) return;
    
    const currentTab = searchParams.get('tab') || 'dashboard';
    if (currentTab === activeTab) return; // No change needed
    
    const params = new URLSearchParams(searchParams);
    if (activeTab !== 'dashboard') {
      params.set('tab', activeTab);
    } else {
      params.delete('tab');
    }
    
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  }, [activeTab, isMounted, router, searchParams]);
  
  const [showMessaging, setShowMessaging] = useState(false);
  const [messagingContext, setMessagingContext] = useState<{
    recipientId?: string;
    jobId?: string;
    jobTitle?: string;
  } | null>(null);

  const handleMessagesClick = () => {
    router.push('/wiadomosci');
  };

  // State for Supabase data
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ContractorProfile | null>(null);
  const [applications, setApplications] = useState<ContractorApplication[]>([]);
  const [bids, setBids] = useState<ContractorBid[]>([]);
  const [stats, setStats] = useState<ContractorStats | null>(null);
  const [certificates] = useState<Certificate[]>([]);
  const [ratingSummary, setRatingSummary] = useState<{
    averageRating: number;
    totalReviews: number;
    ratingBreakdown: { '5': number; '4': number; '3': number; '2': number; '1': number };
    categoryRatings: { quality: number; timeliness: number; communication: number; pricing: number };
  } | null>(null);
  const [recentActivities, setRecentActivities] = useState<Array<{
    id: string;
    type: 'application_accepted' | 'application_rejected' | 'bid_accepted' | 'bid_rejected' | 'review_received' | 'message_received' | 'status_update';
    title: string;
    description: string;
    timestamp: Date;
    color: string;
    icon: string;
    linkUrl?: string;
  }>>([]);
  
  // Tab-specific loading states
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [loadingPricing, setLoadingPricing] = useState(false);
  
  // Track which tabs have been loaded
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());
  
  // Reviews state
  const [reviews, setReviews] = useState<Array<{
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
  }>>([]);
  
  // Projects tab state
  const [platformProjects, setPlatformProjects] = useState<PlatformProject[]>([]);
  const [portfolioProjects, setPortfolioProjects] = useState<Array<{
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
  }>>([]);
  const [loadingPlatformProjects, setLoadingPlatformProjects] = useState(false);
  const [loadingPortfolioProjects, setLoadingPortfolioProjects] = useState(false);
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [editingProject, setEditingProject] = useState<{
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
  } | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Fetch company ID and profile on initial load
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const supabase = createClient();
      
      try {
        setLoading(true);

        // First, fetch the user's primary company
        const { data: company, error: companyError } = await fetchUserPrimaryCompany(supabase, user.id);
        
        if (companyError || !company) {
          console.error('Error fetching user company:', companyError);
          console.log('User may not have a company set up yet');
          setLoading(false);
          return;
        }

        // Use company ID instead of user ID
        const companyIdValue = company.id;
        setCompanyId(companyIdValue);

        // Fetch only profile for initial load
        const { fetchContractorById } = await import('../lib/database/contractors');
        const profileData = await fetchContractorById(companyIdValue);
        if (profileData) {
          setProfile(profileData);
        }

      } catch (error) {
        console.error('Error fetching initial contractor data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [user?.id]);

  // Fetch dashboard tab data when tab is opened
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (activeTab !== 'dashboard' || !companyId || !user?.id || loadedTabs.has('dashboard')) {
        return;
      }

      const supabase = createClient();
      
      try {
        setLoadingDashboard(true);
        const dashboardData = await fetchContractorDashboardStats(supabase, companyId, user.id);
        
        setProfile(dashboardData.profile);
        setStats(dashboardData.stats);
        
        // Fetch rating summary
        const ratingData = await fetchContractorRatingSummary(companyId);
        setRatingSummary(ratingData);
        
        // Fetch recent activities
        if (user?.id) {
          const activities = await fetchContractorRecentActivities(supabase, companyId, user.id, 10);
          setRecentActivities(activities);
        }
        
        setLoadedTabs(prev => new Set(prev).add('dashboard'));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoadingDashboard(false);
      }
    };

    fetchDashboardData();
  }, [activeTab, companyId, loadedTabs, user?.id]);

  // Fetch applications tab data when tab is opened
  useEffect(() => {
    const fetchApplicationsData = async () => {
      if (activeTab !== 'applications' || !user?.id || loadedTabs.has('applications')) {
        return;
      }

      const supabase = createClient();
      
      try {
        setLoadingApplications(true);
        const applicationsData = await fetchContractorApplications(supabase, user.id);
        setApplications(applicationsData.applications);
        setBids(applicationsData.bids);
        
        setLoadedTabs(prev => new Set(prev).add('applications'));
      } catch (error) {
        console.error('Error fetching applications data:', error);
      } finally {
        setLoadingApplications(false);
      }
    };

    fetchApplicationsData();
  }, [activeTab, user?.id, loadedTabs]);

  // Fetch projects tab data when tab is opened
  useEffect(() => {
    const fetchProjectsData = async () => {
      if (activeTab !== 'projects' || !companyId || loadedTabs.has('projects')) {
        return;
      }

      const supabase = createClient();
      
      // Fetch platform project history (completed jobs from platform)
      setLoadingPlatformProjects(true);
      try {
        const platformHistory = await fetchPlatformProjectHistory(supabase, companyId);
        setPlatformProjects(platformHistory || []);
      } catch (error) {
        console.error('Error fetching platform project history:', error);
        setPlatformProjects([]);
      } finally {
        setLoadingPlatformProjects(false);
      }

      // Fetch portfolio projects (external projects)
      setLoadingPortfolioProjects(true);
      try {
        const portfolio = await fetchContractorPortfolio(companyId);
        setPortfolioProjects(portfolio || []);
      } catch (error) {
        console.error('Error fetching portfolio projects:', error);
        setPortfolioProjects([]);
      } finally {
        setLoadingPortfolioProjects(false);
      }

      setLoadedTabs(prev => new Set(prev).add('projects'));
    };

    fetchProjectsData();
  }, [activeTab, companyId, loadedTabs]);

  // Fetch ratings tab data when tab is opened
  useEffect(() => {
    const fetchRatingsData = async () => {
      if (activeTab !== 'ratings' || !companyId || loadedTabs.has('ratings')) {
        return;
      }

      try {
        setLoadingRatings(true);
        
        // Fetch rating summary if not already loaded
        const currentRatingSummary = ratingSummary;
        if (!currentRatingSummary) {
          const ratingData = await fetchContractorRatingSummary(companyId);
          setRatingSummary(ratingData);
        }
        
        // Fetch reviews
        const reviewsData = await fetchContractorReviews(companyId, 20);
        setReviews(reviewsData || []);
        
        setLoadedTabs(prev => new Set(prev).add('ratings'));
      } catch (error) {
        console.error('Error fetching ratings data:', error);
      } finally {
        setLoadingRatings(false);
      }
    };

    fetchRatingsData();
    // ratingSummary is intentionally omitted - we only check it once when tab opens, not on every change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, companyId, loadedTabs]);

  // Fetch pricing tab data when tab is opened
  useEffect(() => {
    const fetchPricingData = async () => {
      if (activeTab !== 'pricing' || !companyId || loadedTabs.has('pricing')) {
        return;
      }

      try {
        setLoadingPricing(true);
        // Pricing data is loaded by ServicePricingManager component itself
        setLoadedTabs(prev => new Set(prev).add('pricing'));
      } catch (error) {
        console.error('Error fetching pricing data:', error);
      } finally {
        setLoadingPricing(false);
      }
    };

    fetchPricingData();
  }, [activeTab, companyId, loadedTabs]);


  // Transform Supabase data to component format
  const contractorData = profile ? {
    name: profile.name,
    shortName: profile.name.split(' ')[0],
    type: 'Wykonawca',
    specialization: profile.services?.primary?.join(', ') || 'Różne usługi budowlane',
    address: profile.contactInfo?.address || 'Brak adresu',
    phone: profile.contactInfo?.phone || user?.phone || 'Brak telefonu',
    email: profile.contactInfo?.email || user?.email || 'Brak email',
    website: profile.contactInfo?.website || 'Brak strony www',
    avatar: profile.avatar || user?.avatar || '',
    verified: profile.verification?.status === 'verified',
    premium: profile.plan === 'pro',
    rating: stats?.averageRating || 0,
    completedJobs: stats?.completedProjects || 0,
    responseTime: '24h', // Could be calculated from applications
    founded: profile.businessInfo?.yearEstablished?.toString() || new Date().getFullYear().toString(),
    employees: profile.businessInfo?.employeeCount || '1-5',
    licenses: certificates.map(c => c.name),
    description: `${profile.name} - profesjonalna firma budowlana.`,
    stats: {
      activeOffers: stats?.totalApplications || 0,
      pendingJobs: stats?.totalBids || 0,
      monthlyEarnings: stats?.totalEarnings || 0,
      clientSatisfaction: stats?.averageRating ? (stats.averageRating / 5) * 100 : 0,
      avgJobValue: 0, // Would need to calculate from applications
      completionRate: stats?.completedProjects || 0
    }
  } : {
    // Fallback data for users without profile
    name: user?.company || user?.firstName || "Nowa firma",
    shortName: user?.company?.split(' ')[0] || user?.firstName?.charAt(0) || "NF",
    type: "Firma budowlana",
    specialization: "Roboty remontowo-budowlane",
    address: "Brak adresu",
    phone: user?.phone || "Brak telefonu",
    email: user?.email || "Brak email",
    website: "Brak strony www",
    avatar: user?.avatar || "",
    verified: user?.isVerified || false,
    premium: false,
    rating: 0,
    completedJobs: 0,
    responseTime: "Brak danych",
    founded: new Date().getFullYear().toString(),
    employees: "1",
    licenses: [],
    description: "Profil w trakcie uzupełniania. Skontaktuj się z nami po więcej informacji.",
    stats: {
      activeOffers: 0,
      pendingJobs: 0,
      monthlyEarnings: 0,
      clientSatisfaction: 0,
      avgJobValue: 0,
      completionRate: 0
    }
  };

  const handleJobView = (jobId: string) => {
    router.push(`/konkurs/${jobId}`);
  };

  const handleStartConversation = async (applicationId: string) => {
    if (!user?.id) {
      toast.error('Musisz być zalogowany aby rozpocząć konwersację');
      return;
    }
    const supabase = createClient();

    // Find the application in allApplications
    const application = allApplications.find(app => app.id === applicationId);
    if (!application) {
      toast.error('Nie znaleziono aplikacji');
      return;
    }

    try {
      // Get job data to find manager_id
      const { getJobById, getTenderById } = await import('../lib/data');
      const { data: dbJob, error: jobError } = await getJobById(application.jobId);
      const { data: dbTender, error: tenderError } = await getTenderById(application.jobId);

      let managerId: string | null = null;
      if (dbJob && !jobError) {
        managerId = ('manager_id' in dbJob ? dbJob.manager_id : null) as string | null;
      } else if (dbTender && !tenderError) {
        managerId = ('manager_id' in dbTender ? dbTender.manager_id : null) as string | null;
      }

      if (!managerId) {
        toast.error('Nie można znaleźć organizatora');
        return;
      }

      // Check if conversation already exists
      const { findConversationByJob } = await import('../lib/database/messaging');
      const result = await findConversationByJob(
        supabase,
        application.jobId,
        user.id,
        managerId,
        application.postType === 'contest'
      );

      if (result.error) {
        console.error('Error checking for existing conversation:', result.error);
        // If error, still show messaging modal with context
        setMessagingContext({
          recipientId: managerId,
          jobId: application.jobId,
          jobTitle: application.jobTitle
        });
        setShowMessaging(true);
        return;
      }

      if (result.data) {
        // Conversation exists, navigate to messages page
        router.push(`/wiadomosci?conversation=${result.data}`);
      } else {
        // No conversation exists, show messaging modal with context
        setMessagingContext({
          recipientId: managerId,
          jobId: application.jobId,
          jobTitle: application.jobTitle
        });
        setShowMessaging(true);
      }
    } catch (error) {
      console.error('Error in handleStartConversation:', error);
      toast.error('Wystąpił błąd podczas sprawdzania konwersacji');
      // Fallback to showing messaging modal
      setShowMessaging(true);
    }
  };

  const handleWithdrawApplication = async (applicationId: string, postType: 'job' | 'contest') => {
    if (!user?.id || !companyId) {
      toast.error('Musisz być zalogowany aby anulować ofertę');
      return;
    }

    const supabase = createClient();
    
    try {
      const { cancelJobApplication, cancelTenderBid } = await import('../lib/database/jobs');
      
      let result;
      if (postType === 'job') {
        result = await cancelJobApplication(supabase, applicationId, user.id);
      } else {
        result = await cancelTenderBid(supabase, applicationId, user.id);
      }

      if (result.error) {
        const errorMessage = result.error instanceof Error 
          ? result.error.message 
          : result.error?.message || 'Wystąpił błąd podczas anulowania oferty';
        toast.error(errorMessage);
        return;
      }

      toast.success('Oferta została anulowana pomyślnie');
      
      // Refresh applications data
      if (activeTab === 'applications') {
        setLoadedTabs(prev => {
          const newSet = new Set(prev);
          newSet.delete('applications');
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error withdrawing application:', error);
      toast.error('Wystąpił błąd podczas anulowania oferty');
    }
  };

  // Map status from database format to component format
  const statusMap: Record<string, 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'cancelled'> = {
    'pending': 'submitted',
    'submitted': 'submitted',
    'under_review': 'under_review',
    'shortlisted': 'under_review', // Map shortlisted to under_review for UI
    'reviewing': 'under_review',
    'accepted': 'accepted',
    'rejected': 'rejected',
    'cancelled': 'cancelled'
  };

  // Transform ContractorApplication to MyApplication format
  const transformedApplications = applications.map(app => {
    // Parse proposed price - handle both string and number
    const proposedPrice = typeof app.proposedPrice === 'string' 
      ? parseFloat(app.proposedPrice) || 0 
      : app.proposedPrice || 0;

    // Transform attachments to the expected format
    const transformedAttachments = (app.attachments || []).map((attachment: string | Record<string, unknown>, index: number) => {
      // Handle different attachment formats
      if (typeof attachment === 'string') {
        return {
          id: `attachment-${index}`,
          name: attachment.split('/').pop() || 'Załącznik',
          type: 'file',
          url: attachment
        };
      }
      return {
        id: String(attachment.id || `attachment-${index}`),
        name: String(attachment.name || attachment.filename || 'Załącznik'),
        type: String(attachment.type || attachment.content_type || 'file'),
        url: String(attachment.url || attachment.path || attachment.file_path || '')
      };
    });

    return {
      id: app.id,
      jobId: app.jobId,
      jobTitle: app.jobTitle || 'Bez tytułu',
      jobCompany: app.companyName || 'Nieznana firma',
      jobLocation: app.jobLocation || 'Nieznana lokalizacja',
      jobCategory: app.jobCategory || 'Inne usługi',
      proposedPrice: proposedPrice,
      proposedTimeline: app.estimatedCompletion || 'Nie określono',
      proposedTimelineDays: app.proposedTimelineDays ?? null,
      vatRate: app.vatRate,
      proposedStartDate: app.proposedStartDate ?? undefined,
      availableFrom: app.availableFrom ?? undefined,
      guaranteePeriodMonths: app.guaranteePeriodMonths ?? undefined,
      teamSize: app.teamSize ?? undefined,
      status: statusMap[app.status] || 'submitted',
      submittedAt: new Date(app.appliedAt),
      lastUpdated: app.reviewedAt ? new Date(app.reviewedAt) : new Date(app.appliedAt),
      coverLetter: app.coverLetter || '',
      experience: app.experience || '',
      additionalNotes: app.notes || undefined,
      postedTime: app.postedTime || undefined,
      attachments: transformedAttachments,
      certificates: app.certificates || [],
      reviewNotes: app.managerFeedbackMessage || undefined,
      postType: 'job' as const,
    };
  });

  // Transform ContractorBid to MyApplication format
  const transformedBids = bids.map(bid => {
    // Parse bid amount - handle both string and number
    const proposedPrice = typeof bid.bidAmount === 'string' 
      ? parseFloat(bid.bidAmount) || 0 
      : parseFloat(String(bid.bidAmount)) || 0;

    // Format timeline from days
    let proposedTimeline = 'Nie określono';
    if (bid.proposedTimeline) {
      const days = bid.proposedTimeline;
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

    return {
      id: bid.id,
      jobId: bid.tenderId,
      jobTitle: bid.tenderTitle || 'Bez tytułu',
      jobCompany: bid.companyName || 'Nieznana firma',
      jobLocation: bid.location || 'Nieznana lokalizacja',
      jobCategory: bid.category || 'Przetarg',
      proposedPrice: proposedPrice,
      proposedTimeline: proposedTimeline,
      proposedTimelineDays: bid.proposedTimeline ?? null,
      tenderValidUntil: bid.validUntil || undefined,
      status: statusMap[bid.status] || 'submitted',
      submittedAt: new Date(bid.submittedAt),
      lastUpdated: bid.reviewedAt ? new Date(bid.reviewedAt) : new Date(bid.submittedAt),
      coverLetter: bid.technicalProposal || '',
      experience: '',
      postedTime: bid.postedTime || undefined,
      attachments: [],
      certificates: [],
      reviewNotes: bid.managerFeedbackMessage || undefined,
      postType: 'contest' as const,
    };
  });

  // Combine applications and bids, sorted by submission date
  const allApplications = [...transformedApplications, ...transformedBids].sort((a, b) => 
    b.submittedAt.getTime() - a.submittedAt.getTime()
  );


  // Transform completed projects to recentJobs format (unused for now)
  // const recentJobs = completedProjects.length > 0 ? completedProjects.map(project => ({
  //   id: project.id,
  //   title: project.title,
  //   client: project.client,
  //   location: project.location,
  //   completedAt: new Date(project.completedAt).toLocaleDateString('pl-PL'),
  //   rating: stats?.averageRating || 5,
  //   earnings: project.earnings,
  //   duration: project.duration,
  //   feedback: project.description?.substring(0, 150) || 'Projekt ukończony pomyślnie'
  // })) : [{
  //   id: '1',
  //   title: 'Brak ukończonych projektów',
  //   client: 'N/A',
  //   location: 'N/A',
  //   completedAt: new Date().toLocaleDateString('pl-PL'),
  //   rating: 0,
  //   earnings: '0 zł',
  //   duration: 'N/A',
  //   feedback: 'Rozpocznij składanie ofert, aby budować swoją historię projektów'
  // }];


  // Portfolio management handlers
  const handleAddPortfolioProject = () => {
    setEditingProject(null);
    setShowPortfolioForm(true);
  };

  const handleEditPortfolioProject = async (project: {
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
  }) => {
    // Fetch full project details for editing
    const supabase = createClient();
    const fullProject = await fetchPortfolioProjectById(supabase, project.id);
    
    if (fullProject) {
      setEditingProject({
        ...fullProject,
        year: fullProject.completionDate ? new Date(fullProject.completionDate).getFullYear() : new Date().getFullYear(),
        description: fullProject.description || '',
        images: fullProject.images || [],
        budget: fullProject.budget || '',
        duration: fullProject.duration || '',
        category: fullProject.category || '',
        location: fullProject.location || '',
        projectType: fullProject.projectType || '',
        clientName: fullProject.clientName || '',
        clientFeedback: fullProject.clientFeedback || '',
        isFeatured: fullProject.isFeatured ?? false,
      });
      setShowPortfolioForm(true);
    } else {
      toast.error('Nie udało się załadować danych projektu');
    }
  };

  const handleDeletePortfolioProject = (projectId: string) => {
    setDeletingProjectId(projectId);
  };

  const confirmDeletePortfolioProject = async () => {
    if (!deletingProjectId || !companyId) return;

    const supabase = createClient();
    try {
      const { data, error } = await deletePortfolioProject(supabase, deletingProjectId);
      
      if (error || !data) {
        toast.error('Nie udało się usunąć projektu');
        console.error('Error deleting portfolio project:', error);
        return;
      }

      toast.success('Projekt został usunięty');
      
      // Refresh portfolio list
      const portfolio = await fetchContractorPortfolio(companyId);
      setPortfolioProjects(portfolio || []);
    } catch (error) {
      console.error('Error in confirmDeletePortfolioProject:', error);
      toast.error('Wystąpił błąd podczas usuwania projektu');
    } finally {
      setDeletingProjectId(null);
    }
  };

  const handlePortfolioSuccess = async () => {
    if (!companyId) return;
    
    try {
      const portfolio = await fetchContractorPortfolio(companyId);
      setPortfolioProjects(portfolio || []);
    } catch (error) {
      console.error('Error refreshing portfolio:', error);
    }
  };

  const handlePortfolioFormClose = () => {
    setShowPortfolioForm(false);
    setEditingProject(null);
  };

  // Helper function to translate category names to Polish
  const getCategoryLabel = (category: string): string => {
    const categoryMap: Record<string, string> = {
      // Contractor categories
      'quality': 'Jakość wykonania',
      'timeliness': 'Terminowość',
      'communication': 'Komunikacja',
      'pricing': 'Cena',
      // Manager categories
      'payment_timeliness': 'Terminowość płatności',
      'project_clarity': 'Przejrzystość projektu',
      'professionalism': 'Profesjonalizm',
    };
    return categoryMap[category.toLowerCase()] || category;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Ładowanie profilu wykonawcy...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={contractorData.avatar} />
                  <AvatarFallback className="bg-primary text-white text-xl">
                    {contractorData.shortName.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                {contractorData.premium && (
                  <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-2">
                    <Award className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">{contractorData.name}</h1>
                  {contractorData.verified && (
                    <Badge className="bg-green-100 text-green-800">
                      <Shield className="w-3 h-3 mr-1" />
                      Zweryfikowana
                    </Badge>
                  )}
                  {contractorData.premium && (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      <Award className="w-3 h-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                </div>
                <p className="text-gray-600 mb-1">
                  {contractorData.specialization || 'Nie określono specjalizacji'}
                </p>
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{contractorData.address}</span>
                  </div>
                  <div 
                    className="flex items-center gap-1 cursor-pointer hover:text-yellow-600 transition-colors"
                    onClick={() => setActiveTab('ratings')}
                  >
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>
                      {contractorData.rating > 0 
                        ? `${contractorData.rating} (${contractorData.completedJobs} projektów)`
                        : 'Brak ocen'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>
                      {contractorData.responseTime && contractorData.responseTime !== 'Brak danych'
                        ? `Odpowiada w ciągu ${contractorData.responseTime}`
                        : 'Brak danych o czasie odpowiedzi'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push('/konto')}>
                Profil użytkownika
              </Button>
              <Button onClick={onBrowseJobs}>
                Przeglądaj zgłoszenia
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="applications">Moje aplikacje</TabsTrigger>
            <TabsTrigger value="projects">Projekty</TabsTrigger>
            <TabsTrigger value="ratings">Oceny</TabsTrigger>
            <TabsTrigger value="pricing">Cennik</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {loadingDashboard ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Aktywne oferty</CardTitle>
                  <Send className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {(() => {
                    // Filter out cancelled applications
                    const activeApplications = allApplications.filter(app => app.status !== 'cancelled');
                    const statusCounts = {
                      wyslane: activeApplications.filter(app => app.status === 'submitted').length,
                      wOcenie: activeApplications.filter(app => app.status === 'under_review').length,
                      zaakceptowane: activeApplications.filter(app => app.status === 'accepted').length,
                      odrzucone: activeApplications.filter(app => app.status === 'rejected').length
                    };
                    const totalActive = activeApplications.length;
                    
                    return (
                      <>
                        <div className="text-2xl font-bold mb-3">
                          {totalActive > 0 ? totalActive : '—'}
                        </div>
                        {totalActive > 0 ? (
                          <div className="space-y-2">
                            {statusCounts.wyslane > 0 && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Wysłane:</span>
                                <span className="font-medium">{statusCounts.wyslane}</span>
                              </div>
                            )}
                            {statusCounts.wOcenie > 0 && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">W ocenie:</span>
                                <span className="font-medium text-yellow-600">{statusCounts.wOcenie}</span>
                              </div>
                            )}
                            {statusCounts.zaakceptowane > 0 && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Zaakceptowane:</span>
                                <span className="font-medium text-green-600">{statusCounts.zaakceptowane}</span>
                              </div>
                            )}
                            {statusCounts.odrzucone > 0 && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Odrzucone:</span>
                                <span className="font-medium text-red-600">{statusCounts.odrzucone}</span>
                              </div>
                            )}
                            {statusCounts.wyslane === 0 && statusCounts.wOcenie === 0 && 
                             statusCounts.zaakceptowane === 0 && statusCounts.odrzucone === 0 && (
                              <p className="text-xs text-muted-foreground">Brak aktywnych ofert</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">Brak aktywnych ofert</p>
                        )}
                      </>
                    );
                  })()}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Miesięczne zarobki</CardTitle>
                  <Euro className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {contractorData.stats.monthlyEarnings > 0 
                      ? `${contractorData.stats.monthlyEarnings.toLocaleString()} zł`
                      : '— zł'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {contractorData.stats.avgJobValue > 0
                      ? `Średnia wartość zgłoszenia: ${contractorData.stats.avgJobValue.toLocaleString()} zł`
                      : 'Brak danych o średniej wartości'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Satysfakcja klientów</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {contractorData.stats.clientSatisfaction > 0 
                      ? `${contractorData.stats.clientSatisfaction}%`
                      : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {contractorData.rating > 0
                      ? `Ocena: ${contractorData.rating}/5.0`
                      : 'Brak ocen'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Realizacja na czas</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {contractorData.stats.completionRate > 0 
                      ? `${contractorData.stats.completionRate}%`
                      : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {contractorData.completedJobs > 0
                      ? `${contractorData.completedJobs} ukończonych projektów`
                      : 'Brak ukończonych projektów'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Szybkie akcje</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full justify-start" onClick={() => router.push('/panel-wykonawcy/ulubione')}>
                    <Star className="w-4 h-4 mr-2" />
                    Zapisane zgłoszenia
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => router.push(kontoCompanyDataHref('contractor'))}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edytuj profil firmy
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={handleMessagesClick}>
                    <MessagesSquare className="w-4 h-4 mr-2" />
                    Sprawdź wiadomości
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ostatnie aktywności</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentActivities.length > 0 ? (
                    <div className="space-y-3">
                      {recentActivities.map((activity) => {
                        // Format time ago in Polish
                        const formatTimeAgo = (date: Date): string => {
                          const now = new Date();
                          const past = date;
                          const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

                          if (diffInSeconds < 60) return 'Przed chwilą';
                          if (diffInSeconds < 3600) {
                            const minutes = Math.floor(diffInSeconds / 60);
                            return `${minutes} ${minutes === 1 ? 'minutę' : minutes < 5 ? 'minuty' : 'minut'} temu`;
                          }
                          if (diffInSeconds < 86400) {
                            const hours = Math.floor(diffInSeconds / 3600);
                            return `${hours} ${hours === 1 ? 'godzinę' : hours < 5 ? 'godziny' : 'godzin'} temu`;
                          }
                          if (diffInSeconds < 604800) {
                            const days = Math.floor(diffInSeconds / 86400);
                            if (days === 1) return 'wczoraj';
                            return `${days} ${days < 5 ? 'dni' : 'dni'} temu`;
                          }
                          return past.toLocaleDateString('pl-PL');
                        };

                        return (
                          <div
                            key={activity.id}
                            className={`flex items-center gap-3 ${activity.linkUrl ? 'cursor-pointer hover:bg-gray-50 rounded p-2 -m-2 transition-colors' : ''}`}
                            onClick={() => {
                              if (activity.linkUrl) {
                                router.push(activity.linkUrl);
                              }
                            }}
                          >
                            <div className={`w-2 h-2 ${activity.color} rounded-full`}></div>
                            <div className="flex-1">
                              <p className="text-sm">{activity.title}</p>
                              <p className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">Brak ostatnich aktywności</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
              </>
            )}
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-6">
            <MyApplications 
              applications={allApplications}
              loading={loadingApplications}
              onJobView={handleJobView}
              onStartConversation={handleStartConversation}
              onWithdraw={handleWithdrawApplication}
            />
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-8">
            {/* Section 1: Platform Project History */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Briefcase className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold">Historia projektów z platformy</h2>
                </div>
              </div>
              
              {loadingPlatformProjects ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : platformProjects.length > 0 ? (
                <div className="grid gap-4">
                  {platformProjects.map((project) => (
                    <Card key={project.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-6">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{project.title}</h3>
                              {project.category && (
                                <Badge variant="outline">{project.category}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                              <span className="font-medium">{project.clientCompany}</span>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                <span>{project.location}</span>
                              </div>
                              {project.completionDate && (
                                <span>Ukończono: {new Date(project.completionDate).toLocaleDateString('pl-PL')}</span>
                              )}
                            </div>
                            {project.description && (
                              <p className="text-sm text-gray-700 mb-3 line-clamp-2">{project.description}</p>
                            )}
                            <div className="flex items-center gap-6 text-sm text-gray-500">
                              {project.proposedPrice && (
                                <div className="flex items-center gap-1">
                                  <Euro className="w-4 h-4" />
                                  <span>{project.proposedPrice.toLocaleString('pl-PL')} {project.currency}</span>
                                </div>
                              )}
                              {project.duration && (
                                <span>Czas realizacji: {project.duration}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {(project.proposedPrice || project.budget) && (
                              <p className="text-2xl font-bold text-green-600 mb-2">
                                {project.proposedPrice 
                                  ? `${project.proposedPrice.toLocaleString('pl-PL')} ${project.currency}`
                                  : project.budget 
                                  ? `${project.budget.toLocaleString('pl-PL')} ${project.currency}`
                                  : ''
                                }
                              </p>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => router.push(`/konkurs/${project.jobId}`)}
                            >
                              Zobacz szczegóły
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">Brak ukończonych projektów z platformy</h3>
                    <p className="text-gray-600">
                      Projekty z platformy pojawią się tutaj, gdy Twoja aplikacja zostanie zaakceptowana i projekt zostanie ukończony.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Section 2: Own Portfolio */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FolderKanban className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold">Portfolio własne</h2>
                </div>
                {portfolioProjects.length > 0 && (
                  <Button onClick={handleAddPortfolioProject}>
                    <Plus className="w-4 h-4 mr-2" />
                    Dodaj projekt
                  </Button>
                )}
              </div>
              
              {loadingPortfolioProjects ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : portfolioProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {portfolioProjects.map((project) => (
                    <Card key={project.id} className="overflow-hidden">
                      {project.images && project.images.length > 0 && (
                        <div className="relative h-48 w-full">
                          <Image
                            src={project.images[0]}
                            alt={project.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-lg line-clamp-2 flex-1">{project.title}</h3>
                          {project.isFeatured && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              <Star className="w-3 h-3 mr-1" />
                              Wyróżniony
                            </Badge>
                          )}
                        </div>
                        {project.location && (
                          <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                            <MapPin className="w-4 h-4" />
                            <span>{project.location}</span>
                          </div>
                        )}
                        {project.description && (
                          <p className="text-sm text-gray-700 mb-3 line-clamp-2">{project.description}</p>
                        )}
                        <div className="space-y-1 text-xs text-gray-600 mb-4">
                          {project.year && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>Rok ukończenia: <span className="font-medium">{project.year}</span></span>
                            </div>
                          )}
                          {project.budget && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              <span>Budżet: <span className="font-medium">{project.budget}</span></span>
                            </div>
                          )}
                          {project.duration && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Czas realizacji: <span className="font-medium">{project.duration}</span></span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleEditPortfolioProject(project)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edytuj
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeletePortfolioProject(project.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <FolderKanban className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">Brak projektów w portfolio</h3>
                    <p className="text-gray-600 mb-4">
                      Dodaj swoje ukończone projekty spoza platformy, aby pokazać klientom swoje doświadczenie.
                    </p>
                    <Button onClick={handleAddPortfolioProject}>
                      <Plus className="w-4 h-4 mr-2" />
                      Dodaj pierwszy projekt
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Ratings Tab */}
          <TabsContent value="ratings" className="space-y-6">
            {loadingRatings ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Rating Summary */}
                {ratingSummary && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-400" />
                        Podsumowanie ocen
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-primary mb-2">
                            {ratingSummary.averageRating.toFixed(1)}
                          </div>
                          <div className="flex justify-center mb-2">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-6 h-6 ${
                                  i < Math.floor(ratingSummary.averageRating)
                                    ? 'text-yellow-400 fill-yellow-400'
                                    : 'text-gray-300'
                                }`} 
                              />
                            ))}
                          </div>
                          <div className="text-sm text-gray-600">
                            {ratingSummary.totalReviews} {ratingSummary.totalReviews === 1 ? 'opinia' : 'opinii'}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {Object.entries(ratingSummary.categoryRatings || {}).map(([category, rating]) => (
                            <div key={category} className="flex items-center justify-between">
                              <span className="text-sm font-medium">{getCategoryLabel(category)}:</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-yellow-400 h-2 rounded-full" 
                                    style={{ width: `${(Number(rating) / 5) * 100}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium">{Number(rating).toFixed(1)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {Object.keys(ratingSummary.ratingBreakdown).length > 0 && (
                        <div className="mt-6 pt-6 border-t">
                          <div className="text-sm font-semibold mb-3">Rozkład ocen:</div>
                          <div className="space-y-2">
                            {[5, 4, 3, 2, 1].map((stars) => {
                              const count = ratingSummary.ratingBreakdown[stars.toString() as keyof typeof ratingSummary.ratingBreakdown] || 0;
                              const percentage = ratingSummary.totalReviews > 0 
                                ? (count / ratingSummary.totalReviews) * 100 
                                : 0;
                              return (
                                <div key={stars} className="flex items-center gap-2">
                                  <span className="text-sm w-8">{stars}★</span>
                                  <Progress value={percentage} className="flex-1 h-2" />
                                  <span className="text-sm text-gray-500 w-12 text-right">{count}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Reviews List */}
                <div className="space-y-4">
                  {reviews.length > 0 ? (
                    reviews.map((review) => (
                      <Card key={review.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="font-medium">{review.reviewerName}</h4>
                              <p className="text-sm text-gray-600">
                                {review.reviewerType === 'manager' ? 'Zarządca' : 'Klient prywatny'}
                              </p>
                            </div>
                            <div className="flex items-center space-x-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-4 h-4 ${
                                    i < review.rating 
                                      ? 'text-yellow-400 fill-yellow-400' 
                                      : 'text-gray-300'
                                  }`} 
                                />
                              ))}
                            </div>
                          </div>
                          
                          {review.title && (
                            <h5 className="font-medium text-gray-900 mb-2">{review.title}</h5>
                          )}
                          
                          <p className="text-gray-700 mb-3">{review.comment}</p>
                          
                          {/* Category Ratings */}
                          {review.categories && Object.keys(review.categories).length > 0 && (
                            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                              <div className="text-sm font-medium mb-2">Szczegółowe oceny:</div>
                              <div className="grid grid-cols-2 gap-2">
                                {Object.entries(review.categories).map(([category, rating]) => (
                                  <div key={category} className="flex items-center justify-between text-xs">
                                    <span>{getCategoryLabel(category)}:</span>
                                    <div className="flex items-center space-x-1">
                                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                      <span>{Number(rating).toFixed(1)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>{new Date(review.createdAt).toLocaleDateString('pl-PL')}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <div className="text-gray-500 mb-4">
                          <Star className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                          <h3 className="text-lg font-medium mb-2">Brak opinii</h3>
                          <p>Twoja firma nie ma jeszcze żadnych opinii od klientów.</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing" className="space-y-6">
            {loadingPricing ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {companyId && profile?.services ? (
                  <ServicePricingManager
                    companyId={companyId}
                    services={profile.services}
                    onServicesUpdate={async () => {
                      // Refresh profile data when services are updated
                      if (companyId) {
                        const { fetchContractorById } = await import('../lib/database/contractors');
                        const updatedProfile = await fetchContractorById(companyId);
                        if (updatedProfile) {
                          setProfile(updatedProfile);
                        }
                      }
                    }}
                  />
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Loader2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-semibold mb-2">Ładowanie danych</h3>
                      <p className="text-gray-600">
                        Trwa ładowanie informacji o usługach...
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Messaging System Modal */}
      {showMessaging && (
        <MessagingSystem 
          onClose={() => {
            setShowMessaging(false);
            setMessagingContext(null);
          }}
          initialRecipientId={messagingContext?.recipientId}
        />
      )}

      {/* Portfolio Project Form Modal */}
      <Dialog open={showPortfolioForm} onOpenChange={setShowPortfolioForm}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? 'Edytuj projekt portfolio' : 'Dodaj nowy projekt portfolio'}
            </DialogTitle>
            <DialogDescription>
              {editingProject 
                ? 'Zaktualizuj informacje o projekcie w swoim portfolio.' 
                : 'Dodaj projekt ukończony poza platformą do swojego portfolio.'}
            </DialogDescription>
          </DialogHeader>
          <PortfolioProjectForm
            projectId={editingProject?.id}
            initialData={editingProject || undefined}
            onClose={handlePortfolioFormClose}
            onSuccess={() => {
              handlePortfolioSuccess();
              handlePortfolioFormClose();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingProjectId} onOpenChange={(open) => !open && setDeletingProjectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usunąć projekt?</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz usunąć ten projekt z portfolio? Tej operacji nie można cofnąć.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeletingProjectId(null)}
            >
              Anuluj
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeletePortfolioProject}
            >
              Usuń
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}