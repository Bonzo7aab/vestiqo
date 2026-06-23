"use client";

import React, { useState, useEffect } from 'react';
import { MapPin, Star, Users, Briefcase, Phone, Mail, Calendar, Award, ExternalLink, ThumbsUp, FileText, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { fetchContractorById, fetchContractorReviews, fetchContractorRatingSummary } from '../lib/database/contractors';
import { refreshContractorPortfolioAction } from '../lib/database/contractors-portfolio-actions';
import { QuoteRequestModal } from './QuoteRequestModal';
import { ServicePricing, ContractorProfile } from '../types/contractor';
import { getCategoryLabel } from './contractor-dashboard/shared/utils';

interface ContractorProfilePageProps {
  contractorId: string;
  onBack?: () => void;
}

// Helper function to format service pricing
const formatServicePrice = (pricing: ServicePricing | undefined): string => {
  if (!pricing) return 'Wycena indywidualna';

  const currency = pricing.currency || 'PLN';
  const unit = pricing.unit ? ` ${pricing.unit}` : '';

  switch (pricing.type) {
    case 'hourly':
      if (pricing.min && pricing.max && pricing.min !== pricing.max) {
        return `${pricing.min} - ${pricing.max} ${currency}/h${unit}`;
      }
      return `${pricing.min || 0} ${currency}/h${unit}`;
    case 'fixed':
      return `${pricing.min || 0} ${currency}${unit}`;
    case 'range':
      return `${pricing.min || 0} - ${pricing.max || 0} ${currency}${unit}`;
    default:
      return 'Wycena indywidualna';
  }
};

// Convert detailed contractor profile to page format
const convertContractorToPageFormat = (contractor: Record<string, unknown>) => {
  if (!contractor) return null;

  // Get all unique services from all categories
  const allServices = [
    ...new Set([
      ...((contractor.services as { primary?: string[]; secondary?: string[]; specializations?: string[] })?.primary || []),
      ...((contractor.services as { primary?: string[]; secondary?: string[]; specializations?: string[] })?.secondary || []),
      ...((contractor.services as { primary?: string[]; secondary?: string[]; specializations?: string[] })?.specializations || [])
    ])
  ];

  // Get service pricing from contractor profile
  const servicePricing = ((contractor.pricing as { servicePricing?: Record<string, unknown> })?.servicePricing || {}) as Record<string, unknown>;

  // Helper to determine service category
  const getServiceCategory = (serviceName: string): 'primary' | 'secondary' | 'specialization' | null => {
    const services = contractor.services as { primary?: string[]; secondary?: string[]; specializations?: string[] } | undefined;
    if (services?.primary?.includes(serviceName)) return 'primary';
    if (services?.secondary?.includes(serviceName)) return 'secondary';
    if (services?.specializations?.includes(serviceName)) return 'specialization';
    return null;
  };

  // Map services with their pricing and additional info
  const servicesWithPricing = allServices.map((serviceName: string) => {
    const pricing = servicePricing[serviceName] as ServicePricing | undefined;
    const category = getServiceCategory(serviceName);
    return {
      name: serviceName,
      description: `Profesjonalne ${serviceName.toLowerCase()} z gwarancją jakości`,
      price: formatServicePrice(pricing),
      pricing: pricing, // Full pricing object for detailed display
      category: category
    };
  });

  return {
    name: contractor.companyName,
    logo: contractor.avatar || '/api/placeholder/150/150',
    coverImage: contractor.coverImage || '/api/placeholder/800/300',
    slogan: ((contractor.services as { primary?: string[]; secondary?: string[]; specializations?: string[] })?.specializations?.[0]) || ((contractor.services as { primary?: string[]; secondary?: string[]; specializations?: string[] })?.primary?.[0]) || 'Profesjonalne usługi budowlane',
    description: `${contractor.companyName} działa na rynku od ${((contractor.businessInfo as { yearEstablished?: number })?.yearEstablished) || new Date().getFullYear()} roku. ${((contractor.services as { primary?: string[]; secondary?: string[]; specializations?: string[] })?.primary?.length || 0) > 0 ? `Specjalizujemy się w ${((contractor.services as { primary?: string[]; secondary?: string[]; specializations?: string[] })?.primary || []).join(', ').toLowerCase()}.` : ''} Posiadamy ${((contractor.experience as { completedProjects?: number })?.completedProjects) || 0} zakończonych projektów i średnią ocenę ${((contractor.rating as { overall?: number })?.overall) || 0} gwiazdek.`,
    location: ((contractor.location as { city?: string })?.city) || 'Warszawa',
    rating: ((contractor.rating as { overall?: number })?.overall) || 0,
    reviewCount: ((contractor.rating as { reviewsCount?: number })?.reviewsCount) || 0,
    completedJobs: ((contractor.experience as { completedProjects?: number })?.completedProjects) || 0,
    verified: ((contractor.verification as { status?: string })?.status) === 'verified',
    hasInsurance: ((contractor.insurance as { hasOC?: boolean })?.hasOC) || false,
    isPremium: contractor.plan === 'pro',
    founded: ((contractor.businessInfo as { yearEstablished?: number })?.yearEstablished) || new Date().getFullYear(),
    employees: ((contractor.businessInfo as { employeeCount?: string })?.employeeCount) || '1-5',
    website: ((contractor.contactInfo as { website?: string })?.website) || '',
    phone: ((contractor.contactInfo as { phone?: string })?.phone) || '',
    email: ((contractor.contactInfo as { email?: string })?.email) || '',
    address: ((contractor.contactInfo as { address?: string })?.address) || '',
    specialties: [...((contractor.services as { primary?: string[]; secondary?: string[] })?.primary || []), ...((contractor.services as { primary?: string[]; secondary?: string[] })?.secondary || [])].slice(0, 5),
    certificates: ((contractor.experience as { certifications?: string[] })?.certifications) || [],
    services: servicesWithPricing,
    portfolio: ((contractor.portfolio as { featuredProjects?: Array<{ title: string; images?: string[]; description?: string; year?: number }> })?.featuredProjects || []).map(project => ({
      title: project.title,
      image: project.images?.[0] || '/api/placeholder/400/300',
      description: project.description || '',
      date: (project.year || new Date().getFullYear()).toString()
    })),
    team: [
      {
        name: contractor.name,
        position: 'Właściciel/Kierownik',
        image: contractor.avatar || '/api/placeholder/150/150',
        experience: `${((contractor.experience as { yearsInBusiness?: number })?.yearsInBusiness) || 5} lat doświadczenia`
      }
    ],
    reviews: ((contractor.reviews as Array<{ author?: string; rating?: number; comment?: string; date?: string }>) || []).map(review => ({
      author: review.author || '',
      rating: review.rating || 0,
      text: review.comment || '',
      date: review.date || '',
      project: (review as { project?: string }).project || ''
    })),
    stats: {
      projectsCompleted: ((contractor.experience as { completedProjects?: number })?.completedProjects) || 0,
      clientSatisfaction: ((contractor.stats as { onTimeCompletion?: number })?.onTimeCompletion) || 0,
      repeatClients: ((contractor.stats as { rehireRate?: number })?.rehireRate) || 0,
      avgResponseTime: ((contractor.stats as { responseTime?: string })?.responseTime) || '0h'
    }
  };
};

export default function ContractorProfilePage({ contractorId, onBack }: ContractorProfilePageProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [contractor, setContractor] = useState<ContractorProfile | null>(null);
  const [reviews, setReviews] = useState<ContractorProfile['reviews']>([]);
  const [ratingSummary, setRatingSummary] = useState<ContractorProfile['rating'] | null>(null);
  const [portfolio, setPortfolio] = useState<ContractorProfile['portfolio']['featuredProjects']>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  useEffect(() => {
    async function loadContractor() {
      try {
        const contractorData = await fetchContractorById(contractorId);
        
        if (contractorData) {
          const formattedContractor = convertContractorToPageFormat(contractorData as unknown as Record<string, unknown>);
          setContractor(formattedContractor as unknown as ContractorProfile);
          
          // Load rating summary immediately
          const ratingData = await fetchContractorRatingSummary(contractorId);
          setRatingSummary(ratingData as unknown as ContractorProfile['rating']);
        }
      } catch (error) {
        console.error('Error loading contractor:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadContractor();
  }, [contractorId]);

  // Sync active tab with hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#overview' || hash === '') {
        setActiveTab('overview');
      } else if (hash === '#services') {
        setActiveTab('services');
      } else if (hash === '#portfolio') {
        setActiveTab('portfolio');
      } else if (hash === '#team') {
        setActiveTab('team');
      } else if (hash === '#reviews') {
        setActiveTab('reviews');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Listen for custom event from header to open quote modal
  useEffect(() => {
    const handleOpenQuoteModal = () => {
      setShowQuoteModal(true);
    };

    window.addEventListener('openQuoteModal', handleOpenQuoteModal);
    return () => window.removeEventListener('openQuoteModal', handleOpenQuoteModal);
  }, []);

  // Load reviews when reviews tab is selected
  useEffect(() => {
    async function loadReviews() {
      if (activeTab === 'reviews' && contractorId && !reviews.length) {
        setReviewsLoading(true);
        try {
          const [reviewsData, ratingData] = await Promise.all([
            fetchContractorReviews(contractorId, 20), // Load more reviews for profile page
            fetchContractorRatingSummary(contractorId)
          ]);
          setReviews(reviewsData as unknown as ContractorProfile['reviews']);
          setRatingSummary(ratingData as unknown as ContractorProfile['rating']);
        } catch (error) {
          console.error('Error loading reviews:', error);
        } finally {
          setReviewsLoading(false);
        }
      }
    }

    loadReviews();
  }, [activeTab, contractorId, reviews.length]);

  // Load portfolio when portfolio tab is selected
  useEffect(() => {
    async function loadPortfolio() {
      if (activeTab === 'portfolio' && contractorId && !portfolio.length) {
        setPortfolioLoading(true);
        try {
          const portfolioData = await refreshContractorPortfolioAction(contractorId);
          setPortfolio(portfolioData);
        } catch (error) {
          console.error('Error loading portfolio:', error);
        } finally {
          setPortfolioLoading(false);
        }
      }
    }

    loadPortfolio();
  }, [activeTab, contractorId, portfolio.length]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="ml-2 text-sm text-muted-foreground">Ładowanie profilu...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!contractor) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Wykonawca nie znaleziony</h2>
            {onBack && <Button onClick={onBack}>Powrót do listy</Button>}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <div className="space-y-4 sm:space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div id="overview" className="scroll-mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* About */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                {/* Company Description */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">O firmie</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                      {(contractor as unknown as { description?: string }).description || 'Brak opisu firmy. Wykonawca nie dodał jeszcze informacji o swojej działalności.'}
                    </p>
                  </CardContent>
                </Card>

                {/* Key Statistics */}
                <div>
                  <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4 text-gray-900">Kluczowe statystyki</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {/* Projects Completed Stat */}
                    <Card className="hover:shadow-md transition-shadow">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Zrealizowanych projektów</CardTitle>
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl sm:text-3xl font-bold text-primary">{((contractor as unknown as { stats?: { projectsCompleted?: number } }).stats?.projectsCompleted || 0) > 0 ? (contractor as unknown as { stats?: { projectsCompleted?: number } }).stats?.projectsCompleted : '—'}</div>
                      </CardContent>
                    </Card>

                    {/* Client Satisfaction Stat */}
                    <Card className="hover:shadow-md transition-shadow bg-green-50/50 border-green-200">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Zadowolonych klientów</CardTitle>
                        <Star className="h-4 w-4 text-green-600 fill-green-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl sm:text-3xl font-bold text-green-700">{((contractor as unknown as { stats?: { clientSatisfaction?: number } }).stats?.clientSatisfaction || 0) > 0 ? `${(contractor as unknown as { stats?: { clientSatisfaction?: number } }).stats?.clientSatisfaction}%` : '—'}</div>
                      </CardContent>
                    </Card>

                    {/* Repeat Clients Stat */}
                    <Card className="hover:shadow-md transition-shadow">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Powracających klientów</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl sm:text-3xl font-bold text-primary">{((contractor as unknown as { stats?: { repeatClients?: number } }).stats?.repeatClients || 0) > 0 ? `${(contractor as unknown as { stats?: { repeatClients?: number } }).stats?.repeatClients}%` : '—'}</div>
                      </CardContent>
                    </Card>

                    {/* Response Time Stat */}
                    {(contractor as unknown as { stats?: { avgResponseTime?: string } }).stats?.avgResponseTime && (
                      <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-xs sm:text-sm font-medium">Średni czas odpowiedzi</CardTitle>
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-lg sm:text-xl font-bold text-primary">{(contractor as unknown as { stats?: { avgResponseTime?: string } }).stats?.avgResponseTime}</div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>

                {/* Certificates */}
                {((contractor as unknown as { certificates?: string[] }).certificates?.length || 0) > 0 && (
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4 text-gray-900">Certyfikaty i uprawnienia</h3>
                    <Card>
                      <CardContent className="pt-4 sm:pt-6">
                        <div className="flex flex-wrap gap-2">
                          {((contractor as unknown as { certificates?: string[] }).certificates || []).map((cert: string, index: number) => (
                            <Badge key={index} variant="secondary" className="bg-green-100 text-green-800 text-xs py-1.5 px-3">
                              <Award className="w-3 h-3 mr-1.5" />
                              {cert}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              {/* Contact Info */}
              <Card className="h-fit self-start">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Kontakt</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  {(contractor as unknown as { phone?: string }).phone && (
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm sm:text-base truncate">{(contractor as unknown as { phone?: string }).phone}</div>
                        <div className="text-xs sm:text-sm text-gray-500">Telefon</div>
                      </div>
                    </div>
                  )}
                  
                  {(contractor as unknown as { email?: string }).email && (
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm sm:text-base truncate">{(contractor as unknown as { email?: string }).email}</div>
                        <div className="text-xs sm:text-sm text-gray-500">Email</div>
                      </div>
                    </div>
                  )}
                  
                  {(contractor as unknown as { address?: string }).address && (
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm sm:text-base truncate">{(contractor as unknown as { address?: string }).address}</div>
                        <div className="text-xs sm:text-sm text-gray-500">Adres</div>
                      </div>
                    </div>
                  )}
                  
                  {(contractor as unknown as { website?: string }).website && (
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm sm:text-base truncate">{(contractor as unknown as { website?: string }).website}</div>
                        <div className="text-xs sm:text-sm text-gray-500">Strona internetowa</div>
                      </div>
                    </div>
                  )}

                  <Button className="w-full mt-3 sm:mt-4 text-sm sm:text-base" onClick={() => setShowQuoteModal(true)}>
                    Zapytaj o wycenę
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <div id="services" className="scroll-mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {((contractor as unknown as { services?: Array<{ name?: string; description?: string; price?: string; pricing?: unknown; category?: string | null }> }).services || []).map((service, index: number) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-sm sm:text-base">
                      {index === 0 && <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />}
                      {index === 1 && <FileText className="w-4 h-4 sm:w-5 sm:h-5" />}
                      {index === 2 && <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />}
                      <span>{service.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-3 sm:mb-4 text-sm">{service.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-base sm:text-lg font-bold text-green-600">{service.price}</span>
                      <Button size="sm" className="text-xs sm:text-sm" onClick={() => setShowQuoteModal(true)}>Zapytaj</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === 'portfolio' && (
          <div id="portfolio" className="scroll-mt-4">
            {portfolioLoading ? (
              <div className="text-center py-8">
                <div className="text-lg">Ładowanie portfolio...</div>
              </div>
            ) : (
              <>
                {portfolio.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {portfolio.map((project) => (
                      <Card key={project.id} className="overflow-hidden">
                        <div className="aspect-video bg-gray-200 rounded-t-lg overflow-hidden">
                          {project.images.length > 0 ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={project.images[0]} 
                              alt={project.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                              <span className="text-gray-400">Brak zdjęcia</span>
                            </div>
                          )}
                        </div>
                        <CardHeader>
                          <CardTitle className="text-sm sm:text-base">{project.title}</CardTitle>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{project.year}</Badge>
                            {project.category && (
                              <Badge variant="secondary">{project.category}</Badge>
                            )}
                            {((project as { isFeatured?: boolean }).isFeatured) && (
                              <Badge variant="default">Wyróżniony</Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-gray-600 text-sm">{project.description}</p>
                          
                          {(project as { location?: string }).location && (
                            <div className="flex items-center text-sm text-gray-500">
                              <MapPin className="w-4 h-4 mr-1" />
                              <span>{(project as { location?: string }).location || ''}</span>
                            </div>
                          )}
                          
                          {(project as { budget?: string }).budget && (
                            <div className="text-sm">
                              <span className="font-medium text-green-600">{(project as { budget?: string }).budget}</span>
                              {(project as { duration?: string }).duration && (
                                <span className="text-gray-500 ml-2">• {project.duration}</span>
                              )}
                            </div>
                          )}
                          
                          {(project as { clientFeedback?: string }).clientFeedback && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <p className="text-sm text-gray-700 italic">&quot;{(project as { clientFeedback?: string }).clientFeedback}&quot;</p>
                              {(project as { clientName?: string }).clientName && (
                                <p className="text-xs text-gray-500 mt-1">- {(project as { clientName?: string }).clientName}</p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Briefcase className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
                      <h3 className="text-base sm:text-lg font-medium mb-2">Brak projektów w portfolio</h3>
                      <p className="text-sm sm:text-base text-gray-600">Ten wykonawca nie ma jeszcze żadnych projektów w swoim portfolio.</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {/* Team Tab */}
        {activeTab === 'team' && (
          <div id="team" className="scroll-mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {((contractor as unknown as { team?: Array<{ name?: string; position?: string; image?: string; experience?: string }> }).team || []).map((member, index: number) => (
                <Card key={index}>
                  <CardContent className="pt-4 sm:pt-6 text-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-2xl sm:text-3xl font-bold text-primary">{member.name.charAt(0)}</span>
                    </div>
                    <h3 className="font-medium mb-1 text-sm sm:text-base">{member.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mb-2">{member.position}</p>
                    <Badge variant="secondary" className="text-xs">{member.experience}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div id="reviews" className="scroll-mt-4">
            <div className="space-y-4 sm:space-y-6">
              {/* Rating Summary */}
              {ratingSummary && ((ratingSummary as unknown as { totalReviews?: number }).totalReviews || 0) > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                      Podsumowanie ocen
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-primary mb-2">
                          {((ratingSummary as unknown as { averageRating?: number }).averageRating || 0).toFixed(1)}
                        </div>
                        <div className="flex justify-center mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-6 h-6 ${
                                i < Math.floor((ratingSummary as unknown as { averageRating?: number }).averageRating || 0)
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-300'
                              }`} 
                            />
                          ))}
                        </div>
                        <div className="text-sm text-gray-600">
                          {(ratingSummary as unknown as { totalReviews?: number }).totalReviews} {((ratingSummary as unknown as { totalReviews?: number }).totalReviews || 0) === 1 ? 'opinia' : 'opinii'}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {Object.entries((ratingSummary as unknown as { categoryRatings?: Record<string, number> }).categoryRatings || {}).map(([category, rating]) => {
                          if (Number(rating) === 0) return null;
                          return (
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
                          );
                        })}
                      </div>
                    </div>
                    
                    {Object.keys((ratingSummary as unknown as { ratingBreakdown?: Record<string, number> }).ratingBreakdown || {}).length > 0 && (
                      <div className="mt-6 pt-6 border-t">
                        <div className="text-sm font-semibold mb-3">Rozkład ocen:</div>
                        <div className="space-y-2">
                          {[5, 4, 3, 2, 1].map((stars) => {
                            const count = ((ratingSummary as unknown as { ratingBreakdown?: Record<string, number> }).ratingBreakdown?.[stars.toString()]) || 0;
                            const percentage = ((ratingSummary as unknown as { totalReviews?: number }).totalReviews || 0) > 0 
                              ? (count / ((ratingSummary as unknown as { totalReviews?: number }).totalReviews || 1)) * 100 
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
              {reviewsLoading ? (
                <div className="text-center py-8">
                  <div className="text-lg">Ładowanie opinii...</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.length > 0 ? (
                    reviews.map((review, index: number) => (
                      <Card key={(review as { id?: string }).id || index}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="font-medium">{(review as { reviewerName?: string; author?: string }).reviewerName || (review as { reviewerName?: string; author?: string }).author || ''}</h4>
                              <p className="text-sm text-gray-600">
                                {((review as { reviewerType?: string; authorType?: string }).reviewerType || (review as { reviewerType?: string; authorType?: string }).authorType) === 'manager' ? 'Zarządca' : 'Klient prywatny'}
                              </p>
                            </div>
                            <div className="flex items-center space-x-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-4 h-4 ${
                                    i < ((review as { rating?: number }).rating || 0) 
                                      ? 'text-yellow-400 fill-yellow-400' 
                                      : 'text-gray-300'
                                  }`} 
                                />
                              ))}
                            </div>
                          </div>
                          
                          {(review as { title?: string }).title && (
                            <h5 className="font-medium text-gray-900 mb-2">{(review as { title?: string }).title}</h5>
                          )}
                          
                          <p className="text-gray-700 mb-3">{(review as { comment?: string; text?: string }).comment || (review as { comment?: string; text?: string }).text || ''}</p>
                          
                          {/* Category Ratings */}
                          {(review as { categories?: Record<string, number> }).categories && Object.keys((review as { categories?: Record<string, number> }).categories || {}).length > 0 && (
                            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                              <div className="text-sm font-medium mb-2">Szczegółowe oceny:</div>
                              <div className="grid grid-cols-2 gap-2">
                                {Object.entries((review as { categories?: Record<string, number> }).categories || {}).map(([category, rating]) => (
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
                            <span>{new Date(String((review as { createdAt?: string; date?: string }).createdAt || (review as { createdAt?: string; date?: string }).date || '')).toLocaleDateString('pl-PL')}</span>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm" className="h-8 px-2">
                                <ThumbsUp className="w-3 h-3 mr-1" />
                                {(review as { helpfulCount?: number; helpful?: number }).helpfulCount || (review as { helpfulCount?: number; helpful?: number }).helpful || 0}
                              </Button>
                            </div>
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
                          <p>Ten wykonawca nie ma jeszcze żadnych opinii od klientów.</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quote Request Modal */}
      <QuoteRequestModal
        isOpen={showQuoteModal}
        onClose={() => setShowQuoteModal(false)}
        contractorId={contractorId}
        contractorName={contractor?.name || ''}
      />
    </div>
  );
}