import React, { useState } from 'react';
import { ArrowLeft, MapPin, Star, Shield, CheckCircle, Users, Building, Search, SlidersHorizontal, Award, Phone, Mail, Globe } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

interface ManagerBrowsePageProps {
  onBack?: () => void;
  onManagerSelect?: (managerId: string) => void;
}

import { BrowseManager } from '../lib/database/managers';
import { getManagers } from '../lib/data';

const locations = [
  'Wszystkie lokalizacje',
  'Warszawa',
  'Kraków', 
  'Gdańsk',
  'Wrocław',
  'Poznań',
  'Katowice'
];

const buildingSizes = [
  'Wszystkie rozmiary',
  'Małe wspólnoty (do 50 lokali)',
  'Średnie wspólnoty (50-200 lokali)',
  'Duże wspólnoty (200+ lokali)'
];

export default function ManagerBrowsePage({ onBack, onManagerSelect }: ManagerBrowsePageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Wszystkie lokalizacje');
  const [selectedSize, setSelectedSize] = useState('Wszystkie rozmiary');
  const [sortBy, setSortBy] = useState('rating');
  const [showFilters, setShowFilters] = useState(false);
  const [displayedManagers, setDisplayedManagers] = useState<BrowseManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsPerPage] = useState(6);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState<BrowseManager | null>(null);

  // Fetch managers from database
  React.useEffect(() => {
    async function loadManagers() {
      try {
        setLoading(true);
        const cityFilter = selectedLocation !== 'Wszystkie lokalizacje' ? selectedLocation : undefined;
        let data = await getManagers({ city: cityFilter, sortBy: sortBy as 'rating' | 'name' | 'buildings' | 'units' | 'experience', limit: 1000 }); // Get more to allow client-side filtering
        
        // Client-side filtering for size
        if (selectedSize !== 'Wszystkie rozmiary') {
          if (selectedSize === 'Małe wspólnoty (do 50 lokali)') {
            data = data.filter(m => m.units_count <= 50);
          } else if (selectedSize === 'Średnie wspólnoty (50-200 lokali)') {
            data = data.filter(m => m.units_count > 50 && m.units_count <= 200);
          } else if (selectedSize === 'Duże wspólnoty (200+ lokali)') {
            data = data.filter(m => m.units_count > 200);
          }
        }
        
        // Client-side search
        if (searchTerm) {
          data = data.filter(manager => 
            manager.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            manager.primary_needs.some(specialty => specialty.toLowerCase().includes(searchTerm.toLowerCase()))
          );
        }
        
        // Set total count and initial batch
        setTotalCount(data.length);
        const initialData = data.slice(0, itemsPerPage);
        setDisplayedManagers(initialData);
        setHasMore(data.length > itemsPerPage);
        setError(null);
      } catch (err) {
        console.error('Error loading managers:', err);
        setError('Nie udało się załadować zarządców');
      } finally {
        setLoading(false);
      }
    }
    loadManagers();
  }, [selectedLocation, sortBy, selectedSize, searchTerm, itemsPerPage]);

  const [loadingMore, setLoadingMore] = useState(false);

  const handleLoadMore = async () => {
    try {
      setLoadingMore(true);
      const cityFilter = selectedLocation !== 'Wszystkie lokalizacje' ? selectedLocation : undefined;
      let data = await getManagers({ city: cityFilter, sortBy: sortBy as 'rating' | 'buildings' | 'units' | 'experience' | 'name', limit: 1000 });
      
      // Apply same filters
      if (selectedSize !== 'Wszystkie rozmiary') {
        if (selectedSize === 'Małe wspólnoty (do 50 lokali)') {
          data = data.filter(m => m.units_count <= 50);
        } else if (selectedSize === 'Średnie wspólnoty (50-200 lokali)') {
          data = data.filter(m => m.units_count > 50 && m.units_count <= 200);
        } else if (selectedSize === 'Duże wspólnoty (200+ lokali)') {
          data = data.filter(m => m.units_count > 200);
        }
      }
      
      if (searchTerm) {
        data = data.filter(manager => 
          manager.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          manager.primary_needs.some(specialty => specialty.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }
      
      // Load next batch
      const nextBatch = data.slice(displayedManagers.length, displayedManagers.length + itemsPerPage);
      setDisplayedManagers(prev => [...prev, ...nextBatch]);
      setHasMore(displayedManagers.length + itemsPerPage < data.length);
      setTotalCount(data.length);
    } catch (err) {
      console.error('Error loading more managers:', err);
      setError('Nie udało się załadować więcej zarządców');
    } finally {
      setLoadingMore(false);
    }
  };

  const sortedManagers = displayedManagers;

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
                <span className="text-gray-900 font-medium">Zarządcy Nieruchomości</span>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Hero Section */}
        <div className="text-center mb-6 md:mb-12">
          <h1 className="hidden md:block text-2xl md:text-4xl font-bold mb-2 md:mb-4">Zarządcy Nieruchomości</h1>
          <p className="hidden md:block text-sm md:text-xl text-gray-600 mb-4 md:mb-8">
            Profesjonalni zarządcy dla Twojej wspólnoty mieszkaniowej
          </p>
          
          {/* Search and Filters */}
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-4 md:mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
                <Input
                  placeholder="Szukaj zarządców, specjalizacji, lokalizacji..."
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

                <Select value={selectedSize} onValueChange={setSelectedSize}>
                  <SelectTrigger>
                    <SelectValue placeholder="Rozmiar wspólnoty" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildingSizes.map(size => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'rating' | 'name' | 'buildings' | 'units' | 'experience')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sortuj według" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Najwyższa ocena</SelectItem>
                    <SelectItem value="buildings">Liczba budynków</SelectItem>
                    <SelectItem value="units">Liczba lokali</SelectItem>
                    <SelectItem value="experience">Doświadczenie</SelectItem>
                    <SelectItem value="name">Nazwa A-Z</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline"
                  onClick={() => {
                    setSelectedLocation('Wszystkie lokalizacje');
                    setSelectedSize('Wszystkie rozmiary');
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
            <p className="text-gray-600">Znaleziono {totalCount} zarządców</p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-b-2 border-blue-600 mx-auto"></div>
            <span className="ml-2 text-gray-600">Ładowanie zarządców...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <Building className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-medium mb-2">Błąd ładowania</h3>
            <p className="text-gray-600">{error}</p>
          </div>
        )}

        {/* Managers Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedManagers.map((manager) => (
            <Card key={manager.id} className="hover:shadow-lg transition-shadow duration-200 flex flex-col h-full">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={manager.avatar_url} alt={manager.name} />
                      <AvatarFallback>{manager.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">{manager.name}</CardTitle>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="font-medium">{manager.rating.toFixed(1)}</span>
                          <span className="text-gray-500 text-sm">({manager.review_count})</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 text-gray-500 text-sm">
                        <MapPin className="w-4 h-4" />
                        <span>{manager.city}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0 flex-1 flex flex-col">
                <div className="flex-1">
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {`${manager.organization_type}. ${manager.years_active} lat doświadczenia w zarządzaniu nieruchomościami.`}
                  </p>

                  {/* Specialties */}
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {manager.primary_needs.slice(0, 2).map((specialty, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {specialty}
                        </Badge>
                      ))}
                      {manager.primary_needs.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{manager.primary_needs.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Trust Indicators */}
                  <div className="flex items-center space-x-3 mb-4">
                    {manager.is_verified && (
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-xs text-green-700">Zweryfikowany</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-blue-700">Ubezpieczenie</span>
                    </div>
                    {manager.plan_type === 'premium' && (
                      <Badge variant="default" className="text-xs">
                        Premium
                      </Badge>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                    <div>
                      <div className="flex items-center space-x-1">
                        <Building className="w-4 h-4" />
                        <span>{manager.buildings_count} budynków</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{manager.units_count} lokali</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-1">
                        <Award className="w-4 h-4" />
                        <span>{manager.years_active} lat doświadczenia</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-green-600 font-medium">
                        Odpowiada w {manager.average_response_time}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Always at the bottom */}
                <div className="flex space-x-2 mt-auto pt-4">
                  <Button 
                    className="flex-1" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onManagerSelect?.(manager.id);
                    }}
                  >
                    Zobacz profil
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedManager(manager);
                      setContactDialogOpen(true);
                    }}
                  >
                    Kontakt
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        )}

        {/* Load More */}
        {sortedManagers.length > 0 && hasMore && (
          <div className="text-center mt-12">
            <Button 
              variant="outline" 
              size="lg" 
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2 inline-block"></div>
                  Ładowanie...
                </>
              ) : (
                'Załaduj więcej zarządców'
              )}
            </Button>
          </div>
        )}

        {/* No Results */}
        {!loading && !error && totalCount === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Building className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium mb-2">Brak wyników</h3>
            <p className="text-gray-600">
              Spróbuj zmienić kryteria wyszukiwania lub wybierz inną lokalizację.
            </p>
          </div>
        )}
      </div>

      {/* Contact Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kontakt</DialogTitle>
            <DialogDescription>
              Skontaktuj się z {selectedManager?.name || 'zarządcą'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedManager?.phone && (
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Phone className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Telefon</p>
                  <a href={`tel:${selectedManager.phone}`} className="text-sm text-gray-600 hover:text-gray-900">
                    {selectedManager.phone}
                  </a>
                </div>
              </div>
            )}
            
            {selectedManager?.email && (
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <Mail className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Email</p>
                  <a href={`mailto:${selectedManager.email}`} className="text-sm text-gray-600 hover:text-gray-900">
                    {selectedManager.email}
                  </a>
                </div>
              </div>
            )}
            
            {selectedManager?.website && (
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                  <Globe className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Strona internetowa</p>
                  <a 
                    href={selectedManager.website.startsWith('http') ? selectedManager.website : `https://${selectedManager.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    {selectedManager.website}
                  </a>
                </div>
              </div>
            )}
            
            {selectedManager?.address && (
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <MapPin className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Adres</p>
                  <p className="text-sm text-gray-600">{selectedManager.address}</p>
                </div>
              </div>
            )}

            {!selectedManager?.phone && !selectedManager?.email && !selectedManager?.website && !selectedManager?.address && (
              <p className="text-sm text-gray-500 text-center py-4">
                Brak dostępnych informacji kontaktowych
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}