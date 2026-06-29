import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Star, Shield, CheckCircle, Users, Briefcase, Search, SlidersHorizontal, Loader2, MessageCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BrowseContractor, ContractorFilters } from '../lib/database/contractors';
import { getContractors } from '../lib/data';

interface ContractorBrowsePageProps {
  onBack?: () => void;
  onContractorSelect?: (contractorId: string) => void;
}

const categories = [
  'Wszystkie kategorie',
  'Utrzymanie Czystości i Zieleni',
  'Roboty Remontowo-Budowlane', 
  'Instalacje i systemy',
  'Utrzymanie techniczne i konserwacja',
  'Specjalistyczne usługi'
];

const locations = [
  'Wszystkie lokalizacje',
  'Warszawa',
  'Kraków', 
  'Gdańsk',
  'Wrocław',
  'Poznań',
  'Katowice'
];

export default function ContractorBrowsePage({ onBack, onContractorSelect }: ContractorBrowsePageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Wszystkie kategorie');
  const [selectedLocation, setSelectedLocation] = useState('Wszystkie lokalizacje');
  const [sortBy, setSortBy] = useState('rating');
  const [showFilters, setShowFilters] = useState(false);
  const [contractors, setContractors] = useState<BrowseContractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_expandedContractor] = useState<string | null>(null);
  const [contractorReviews] = useState<{[key: string]: Array<Record<string, unknown>>}>({});
  const [contractorRatings] = useState<{[key: string]: Record<string, unknown>}>({});
  const [currentLimit, setCurrentLimit] = useState(6);
  const [hasMoreContractors, setHasMoreContractors] = useState(false);

  // Fetch contractors from database
  useEffect(() => {
    const loadContractors = async () => {
      try {
        setLoading(true);
        setError(null);
        setCurrentLimit(6); // Reset to initial limit when filters change
        
        const filters: ContractorFilters = {
          city: selectedLocation === 'Wszystkie lokalizacje' ? undefined : selectedLocation,
          category: selectedCategory === 'Wszystkie kategorie' ? undefined : selectedCategory,
          searchQuery: searchTerm || undefined,
          sortBy: sortBy as 'rating' | 'jobs' | 'reviews' | 'name',
          limit: 7, // Fetch 7 to check if there are more (we'll use first 6)
          offset: 0
        };

        const data = await getContractors(filters);
        // Deduplicate contractors by ID to prevent duplicate keys
        const uniqueContractors = Array.from(
          new Map(data.map(c => [c.id, c])).values()
        );
        
        // Use first 6 items, check if there are more
        const contractorsToShow = uniqueContractors.slice(0, 6);
        setContractors(contractorsToShow);
        setHasMoreContractors(uniqueContractors.length > 6);
      } catch (err) {
        console.error('Error loading contractors:', err);
        setError('Nie udało się załadować wykonawców. Spróbuj ponownie.');
      } finally {
        setLoading(false);
      }
    };

    loadContractors();
  }, [searchTerm, selectedCategory, selectedLocation, sortBy]);

  // Load more contractors function
  const loadMoreContractors = async () => {
    try {
      setLoadingMore(true);
      
      const filters: ContractorFilters = {
        city: selectedLocation === 'Wszystkie lokalizacje' ? undefined : selectedLocation,
        category: selectedCategory === 'Wszystkie kategorie' ? undefined : selectedCategory,
        searchQuery: searchTerm || undefined,
        sortBy: sortBy as 'rating' | 'jobs' | 'reviews' | 'name',
        limit: 7, // Fetch 7 to check if there are more (we'll use first 6)
        offset: currentLimit
      };

      const moreData = await getContractors(filters);
      
      if (moreData.length > 0) {
        // Deduplicate: filter out contractors that already exist in the current list
        // Calculate the actual count before state update to ensure accurate pagination
        // Use functional update to get current contractors and calculate what to add
        let actualAddedCount = 0;
        setContractors(prev => {
          const existingIds = new Set(prev.map(c => c.id));
          const newContractors = moreData.filter(c => !existingIds.has(c.id));
          // Use first 6 new contractors
          const contractorsToAdd = newContractors.slice(0, 6);
          actualAddedCount = contractorsToAdd.length;
          return [...prev, ...contractorsToAdd];
        });
        
        // Update currentLimit based on actual number added (not always 6)
        // This ensures pagination offset stays in sync with displayed items
        setCurrentLimit(prev => prev + actualAddedCount);
        
        // Check if there are still more contractors (if we got 7, there might be more)
        setHasMoreContractors(moreData.length > 6);
      } else {
        setHasMoreContractors(false);
      }
    } catch (err) {
      console.error('Error loading more contractors:', err);
      setHasMoreContractors(false);
    } finally {
      setLoadingMore(false);
    }
  };

  // Transform contractors for display - using real data from database
  const displayContractors = contractors.map(contractor => {
    const primaryServices = Array.isArray(contractor.primary_services) ? contractor.primary_services : [];
    const specializations = Array.isArray(contractor.specializations) ? contractor.specializations : [];
    const certifications = Array.isArray(contractor.certifications) ? contractor.certifications : [];
    
    // Use real description from database if available, otherwise build from real data fields
    let description = contractor.description;
    // Check if description exists and is a string before calling trim()
    if (!description || typeof description !== 'string' || description.trim() === '') {
      // Fallback: build description from real data (specializations and years_in_business)
      const specializationText = specializations.length > 0 
        ? specializations.join(', ') 
        : (primaryServices.length > 0 ? primaryServices.join(', ') : '');
      const yearsText = contractor.years_in_business > 0 
        ? `${contractor.years_in_business} lat doświadczenia w branży`
        : '';
      description = specializationText && yearsText
        ? `${specializationText}. ${yearsText}.`
        : (specializationText || yearsText || 'Profesjonalne usługi budowlane');
    }
    
    return {
      id: contractor.id,
      name: contractor.name,
      specialties: primaryServices.slice(0, 3),
      description,
      logo: contractor.avatar_url || '/api/placeholder/80/80',
      location: contractor.city || 'Nieznana lokalizacja',
      rating: contractor.rating || 0,
      reviewCount: contractor.review_count || 0,
      completedJobs: contractor.completed_projects || 0,
      verified: contractor.is_verified,
      hasInsurance: contractor.has_oc,
      isPremium: contractor.plan_type === 'pro',
      certificates: certifications.slice(0, 2),
      priceRange: contractor.price_range || 'Wycena indywidualna',
      responseTime: contractor.response_time || '24h',
      foundedYear: contractor.founded_year,
      employeeCount: contractor.employee_count || '1-5',
      categories: primaryServices.length > 0 ? [primaryServices[0]] : [] // Map to simplified categories
    };
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12 md:h-16">
            <div className="flex items-center space-x-2 md:space-x-4">
              {onBack && (
                <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 md:h-10 md:w-10">
                  <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
              )}
              <nav className="flex space-x-1 md:space-x-2 text-xs md:text-sm text-gray-500">
                <span>Strona główna</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">Wykonawcy</span>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Hero Section */}
        <div className="text-center mb-6 md:mb-12">
          <h1 className="hidden md:block text-2xl md:text-4xl font-bold mb-2 md:mb-4">Zweryfikowani Wykonawcy</h1>
          <p className="hidden md:block text-sm md:text-xl text-gray-600 mb-4 md:mb-8">
            Znajdź najlepszych specjalistów dla swojej wspólnoty mieszkaniowej
          </p>
          
          {/* Search and Filters */}
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-4 md:mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
                <Input
                  placeholder="Szukaj wykonawców, usług, specjalizacji..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 md:pl-10 h-10 md:h-12 bg-gray-100 border-gray-300 text-sm md:text-base"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                className="h-10 md:h-12 px-4 md:px-6 text-sm md:text-base"
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filtry
              </Button>
            </div>

            {/* Filter Bar */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-card rounded-lg border">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Lokalizacja" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(location => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sortuj według" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Najwyższa ocena</SelectItem>
                    <SelectItem value="jobs">Liczba zgłoszeń</SelectItem>
                    <SelectItem value="reviews">Liczba opinii</SelectItem>
                    <SelectItem value="name">Nazwa A-Z</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline"
                  onClick={() => {
                    setSelectedCategory('Wszystkie kategorie');
                    setSelectedLocation('Wszystkie lokalizacje');
                    setSearchTerm('');
                  }}
                >
                  Wyczyść filtry
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Results Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold">Wyniki wyszukiwania</h2>
            <p className="text-gray-600">
              {loading ? 'Ładowanie...' : `Znaleziono ${displayContractors.length} wykonawców`}
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Ładowanie wykonawców...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <Users className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-medium mb-2 text-red-600">Błąd ładowania</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Spróbuj ponownie
            </Button>
          </div>
        )}

        {/* Contractors Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayContractors.map((contractor) => {
              const isExpanded = _expandedContractor === contractor.id;
              const reviews = contractorReviews[contractor.id] || [];
              const ratings = contractorRatings[contractor.id];
              
              return (
                <Card key={contractor.id} className="hover:shadow-lg transition-shadow duration-200 flex flex-col">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={contractor.logo} alt={contractor.name} />
                          <AvatarFallback>{contractor.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-1">{contractor.name}</CardTitle>
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="font-medium">{contractor.rating.toFixed(1)}</span>
                              <span className="text-gray-500 text-sm">({contractor.reviewCount})</span>
                            </div>
                            {ratings && (
                              <div className="text-xs text-gray-500">
                                {Object.entries(ratings.categoryRatings || {}).map(([key, value]) => (
                                  <span key={key} className="mr-2">
                                    {key}: {Number(value).toFixed(1)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 text-gray-500 text-sm">
                            <MapPin className="w-4 h-4" />
                            <span>{contractor.location}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 flex flex-col flex-1">
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {contractor.description}
                    </p>

                    {/* Specialties */}
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1">
                        {contractor.specialties.slice(0, 2).map((specialty, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                        {contractor.specialties.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{contractor.specialties.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Trust Indicators */}
                    <div className="flex items-center space-x-3 mb-4">
                      {contractor.verified && (
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-xs text-green-700">Zweryfikowany</span>
                        </div>
                      )}
                      {contractor.hasInsurance && (
                        <div className="flex items-center space-x-1">
                          <Shield className="w-4 h-4 text-blue-500" />
                          <span className="text-xs text-blue-700">Ubezpieczenie</span>
                        </div>
                      )}
                      {contractor.isPremium && (
                        <Badge variant="default" className="text-xs">
                          Premium
                        </Badge>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                      <div>
                        <div className="flex items-center space-x-1">
                          <Briefcase className="w-4 h-4" />
                          <span>{contractor.completedJobs} zgłoszeń</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>{contractor.employeeCount} pracowników</span>
                        </div>
                      </div>
                    </div>

                    {/* Price and Response Time */}
                    <div className="flex justify-between items-center text-sm mb-4">
                      <span className="font-medium text-green-600">{contractor.priceRange}</span>
                      <span className="text-gray-500">Odpowiada w {contractor.responseTime}</span>
                    </div>

                    {/* Reviews Section */}
                    {isExpanded && reviews.length > 0 && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-medium mb-2 flex items-center">
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Najnowsze opinie
                        </h4>
                        <div className="space-y-2">
                          {reviews.slice(0, 2).map((review, index) => (
                            <div key={index} className="text-xs">
                              <div className="flex items-center space-x-1 mb-1">
                                <div className="flex">
                                  {[...Array(5)].map((_, i) => (
                                    <Star 
                                      key={i} 
                                      className={`w-3 h-3 ${i < (typeof review.rating === 'number' ? review.rating : 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                    />
                                  ))}
                                </div>
                                <span className="font-medium">{String(review.reviewerName || '')}</span>
                                <span className="text-gray-500">
                                  {new Date(String(review.createdAt || '')).toLocaleDateString('pl-PL')}
                                </span>
                              </div>
                              <p className="text-gray-600 line-clamp-2">{String(review.comment || '')}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-2 mt-auto pt-4">
                      <Button 
                        className="flex-1" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onContractorSelect?.(contractor.id);
                        }}
                      >
                        Zobacz profil
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Load More */}
        {!loading && !error && displayContractors.length > 0 && hasMoreContractors && (
          <div className="text-center mt-12">
            <Button 
              variant="outline" 
              size="lg"
              onClick={loadMoreContractors}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ładowanie...
                </>
              ) : (
                'Załaduj więcej wykonawców'
              )}
            </Button>
          </div>
        )}

        {/* No Results */}
        {!loading && !error && displayContractors.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium mb-2">Brak wyników</h3>
            <p className="text-gray-600">
              Spróbuj zmienić kryteria wyszukiwania lub wybierz inną kategorię.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}