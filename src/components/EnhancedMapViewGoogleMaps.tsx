'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { X, Crosshair, Maximize2, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import GoogleMap, { MapMarker } from './GoogleMap';
import { getCurrentLocation, calculateDistance } from '../lib/google-maps/geocoding';
import { extractCity, extractSublocality } from '../utils/locationMapping';
import type { Job } from '../types/job';
import type { FilterState } from './JobFilters';
import { resolveCategorySlugFromJob } from '../lib/config/categoryConfig';
import { jobMatchesFilters, matchesFavoritesFilter } from '../lib/filters/filter-logic';
import { getBookmarkedJobs } from '../utils/bookmarkStorage';
import { BOOKMARK_COUNT_CHANGED_EVENT } from '../utils/bookmarkCountOverrides';

interface EnhancedMapViewProps {
  isExpanded?: boolean;
  /** When true, map fills the parent column instead of fixed fullscreen. */
  fillContainer?: boolean;
  /** When true with isExpanded, map fills parent next to page sidebar filters (no overlay filters). */
  fillParent?: boolean;
  onToggleExpand?: () => void;
  jobs?: Job[]; // Jobs for map markers (can be bounds-filtered)
  allJobs?: Job[]; // All jobs for filters (should not be bounds-filtered)
  selectedJobId?: string | null;
  onJobSelect?: (jobId: string) => void;
  hoveredJobId?: string | null;
  onJobHover?: (jobId: string | null) => void;
  userLocation?: { lat: number; lng: number } | null;
  onLocationChange?: (location: { lat: number; lng: number }) => void;
  onCityNameChange?: (cityName: string | null) => void;
  searchRadius?: number;
  onRadiusChange?: (radius: number) => void;
  filters?: FilterState;
  onFiltersChange?: (filters: FilterState) => void;
  showCitySelector?: boolean;
  onCitySelectorClose?: () => void;
  onBoundsChanged?: (bounds: { north: number; south: number; east: number; west: number }) => void;
}

// Real coordinates for Polish cities
const cityCoordinates = {
  'Warszawa': { lat: 52.2297, lng: 21.0122 },
  'Kraków': { lat: 50.0647, lng: 19.9450 },
  'Gdańsk': { lat: 54.3520, lng: 18.6466 },
  'Wrocław': { lat: 51.1079, lng: 17.0385 },
  'Poznań': { lat: 52.4064, lng: 16.9252 },
  'Katowice': { lat: 50.2649, lng: 19.0238 },
  'Łódź': { lat: 51.7592, lng: 19.4560 },
  'Lublin': { lat: 51.2465, lng: 22.5684 },
  'Białystok': { lat: 53.1325, lng: 23.1688 },
  'Szczecin': { lat: 53.4285, lng: 14.5528 }
};

export const EnhancedMapViewGoogleMaps: React.FC<EnhancedMapViewProps> = ({
  isExpanded = false,
  fillContainer = false,
  fillParent = false,
  onToggleExpand,
  jobs = [], // Jobs for map markers (can be bounds-filtered)
  allJobs, // All jobs for filters (should not be bounds-filtered, falls back to jobs if not provided)
  selectedJobId,
  onJobSelect,
  hoveredJobId,
  onJobHover: _onJobHover,
  userLocation,
  onLocationChange,
  onCityNameChange,
  searchRadius = 25,
  onRadiusChange: _onRadiusChange,
  filters,
  onFiltersChange,
  showCitySelector: externalShowCitySelector = false,
  onCitySelectorClose,
  onBoundsChanged
}) => {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [showJobClusters] = useState(true); // Always show all jobs
  const [mapCenter, setMapCenter] = useState({ lat: 52.1394, lng: 21.0458 }); // Ursynów, Warsaw
  const [mapZoom, setMapZoom] = useState(13); // District-level view
  const [selectedCityName, setSelectedCityName] = useState<string | null>(null);
  const [bookmarkedJobIds, setBookmarkedJobIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const syncBookmarks = () => {
      try {
        const ids = getBookmarkedJobs().map((b) => b.id);
        setBookmarkedJobIds(new Set(ids));
      } catch {
        setBookmarkedJobIds(new Set());
      }
    };
    syncBookmarks();
    window.addEventListener('focus', syncBookmarks);
    window.addEventListener(BOOKMARK_COUNT_CHANGED_EVENT, syncBookmarks);
    return () => {
      window.removeEventListener('focus', syncBookmarks);
      window.removeEventListener(BOOKMARK_COUNT_CHANGED_EVENT, syncBookmarks);
    };
  }, []);

  // Function to find city name from coordinates
  const findCityNameFromCoordinates = (lat: number, lng: number): string | null => {
    // Simple distance-based city detection
    for (const [cityName, coords] of Object.entries(cityCoordinates)) {
      const distance = Math.sqrt(
        Math.pow(coords.lat - lat, 2) + Math.pow(coords.lng - lng, 2)
      );
      if (distance < 0.5) { // Within ~50km radius
        return cityName;
      }
    }
    return null;
  };

  // Initialize map center based on user location or default to Warsaw
  useEffect(() => {
    if (userLocation) {
      setMapCenter(userLocation);
      // Try to find the city name for the user's location
      const cityName = findCityNameFromCoordinates(userLocation.lat, userLocation.lng);
      if (cityName) {
        setSelectedCityName(cityName);
        onCityNameChange?.(cityName);
      }
    }
  }, [userLocation, onCityNameChange]);

  // Handle external showCitySelector prop
  useEffect(() => {
    if (externalShowCitySelector) {
      setShowCitySelector(true);
    }
  }, [externalShowCitySelector]);

  // Get user location or show city selector
  const getUserLocation = async () => {
    setIsGettingLocation(true);
    
    try {
      const location = await getCurrentLocation();
      onLocationChange?.(location);
      setMapCenter(location);
      setMapZoom(15);
      
      // Try to find the city name for the user's location
      const cityName = findCityNameFromCoordinates(location.lat, location.lng);
      if (cityName) {
        setSelectedCityName(cityName);
        onCityNameChange?.(cityName);
      }
      
      setIsGettingLocation(false);
    } catch {
      setIsGettingLocation(false);
      
      toast.info('Wybierz miasto', {
        description: 'Nie można automatycznie wykryć Twojej lokalizacji. Wybierz miasto z listy.',
        action: {
          label: 'Wybierz',
          onClick: () => setShowCitySelector(true)
        }
      });
      
      setShowCitySelector(true);
    }
  };

  // Handle city selection
  const handleCitySelect = (cityName: string) => {
    const coordinates = cityCoordinates[cityName as keyof typeof cityCoordinates];
    if (coordinates) {
      setSelectedCityName(cityName);
      onCityNameChange?.(cityName);
      onLocationChange?.(coordinates);
      setMapCenter(coordinates);
      setMapZoom(12);
      setShowCitySelector(false);
      onCitySelectorClose?.();
    }
  };

  // Deep equality check helper for filters
  const filtersRef = useRef<FilterState | undefined>(filters);
  const filtersStringRef = useRef<string>('');
  const [filtersChanged, setFiltersChanged] = useState(false);
  
  // Update refs and check if filters changed using useEffect
  useEffect(() => {
    const filtersString = JSON.stringify(filters);
    const currentString = filtersStringRef.current;
    if (filtersString !== currentString) {
      filtersStringRef.current = filtersString;
      filtersRef.current = filters;
      setFiltersChanged(true);
    } else {
      setFiltersChanged(false);
    }
  }, [filters]);

  // Filter jobs by radius if user location is available
  const filteredJobs = useMemo(() => {
    if (!userLocation || !showJobClusters) return jobs;
    
    return jobs.filter(job => {
      const distance = calculateDistance(userLocation.lat, userLocation.lng, job.lat, job.lng);
      return distance <= searchRadius;
    });
  }, [jobs, userLocation, searchRadius, showJobClusters]);

  // Split filter functions for better memoization
  const filterByPostType = useCallback((job: Job, filterPostTypes?: string[]): boolean => {
    if (!filterPostTypes || filterPostTypes.length === 0) return true;
    const jobPostType = job.postType || 'job';
    if (filterPostTypes.length === 2 && filterPostTypes.includes('job') && filterPostTypes.includes('contest')) {
      return true;
    }
    return filterPostTypes.includes(jobPostType);
  }, []);

  const filterByCategory = useCallback((job: Job, filterCategories?: string[]): boolean => {
    if (!filterCategories || filterCategories.length === 0) return true;
    const jobCategory = typeof job.category === 'string' 
      ? job.category 
      : (job.category?.name || 'Inne');
    return filterCategories.includes(jobCategory);
  }, []);

  const filterByLocation = useCallback((job: Job, filterCities?: string[], filterSublocalities?: string[]): boolean => {
    if ((!filterCities || filterCities.length === 0) && (!filterSublocalities || filterSublocalities.length === 0)) {
      return true;
    }
    
    const jobCity = extractCity(job.location);
    const jobSublocality = extractSublocality(job.location);
    
    if (filterSublocalities && filterSublocalities.length > 0) {
      const matchesSublocality = filterSublocalities.some(sublocalityKey => {
        const [filterCity, filterSublocality] = sublocalityKey.split(':');
        return jobCity === filterCity && jobSublocality === filterSublocality;
      });
      
      if (matchesSublocality) {
        return true;
      }
      
      const citiesWithSelectedSublocalities = new Set(
        filterSublocalities.map(s => s.split(':')[0])
      );
      
      const cityExplicitlySelected = filterCities && filterCities.some(city => 
        city === jobCity && !citiesWithSelectedSublocalities.has(city)
      );
      
      return !!cityExplicitlySelected;
    } else if (filterCities && filterCities.length > 0) {
      return !!jobCity && filterCities.includes(jobCity);
    }
    
    return true;
  }, []);

  const filterByBudget = useCallback((job: Job, budgetRanges?: string[], budgetMin?: number | null, budgetMax?: number | null): boolean => {
    const jobBudgetMin = ('budget_min' in job ? job.budget_min : undefined) as number | undefined;
    const jobBudgetMax = ('budget_max' in job ? job.budget_max : undefined) as number | undefined;
    const hasBudgetMin = jobBudgetMin != null && jobBudgetMin !== undefined;
    const hasBudgetMax = jobBudgetMax != null && jobBudgetMax !== undefined;
    
    // Budget ranges filter
    if (budgetRanges && budgetRanges.length > 0) {
      if (!hasBudgetMin && !hasBudgetMax) {
        // Job has no budget, skip range filtering
      } else {
        const min = hasBudgetMin ? Number(jobBudgetMin) : (hasBudgetMax ? 0 : 0);
        const max = hasBudgetMax ? Number(jobBudgetMax) : (hasBudgetMin ? Number(jobBudgetMin) : Infinity);

        let matchesRange = false;
        for (const range of budgetRanges) {
          if (range === '<5000' && max < 5000) {
            matchesRange = true;
            break;
          } else if (range === '5000-20000' && min <= 20000 && max >= 5000) {
            matchesRange = true;
            break;
          } else if (range === '20000+' && min >= 20000) {
            matchesRange = true;
            break;
          }
        }
        
        if (!matchesRange) {
          return false;
        }
      }
    }

    // Budget min filter
    if (budgetMin !== undefined && budgetMin !== null) {
      if (jobBudgetMin === null && jobBudgetMax === null) {
        // Skip filter
      } else {
        const jobMaxBudget = jobBudgetMax ?? jobBudgetMin ?? 0;
        if (jobMaxBudget < budgetMin) {
          return false;
        }
      }
    }

    // Budget max filter
    if (budgetMax !== undefined && budgetMax !== null) {
      if (jobBudgetMin === null && jobBudgetMax === null) {
        // Skip filter
      } else {
        const jobMinBudget = jobBudgetMin ?? jobBudgetMax ?? 0;
        if (jobMinBudget > budgetMax) {
          return false;
        }
      }
    }

    return true;
  }, []);

  // Apply map filters (always apply filters, not just when expanded)
  // Only recalculate if filters actually changed or filteredJobs changed
  const filteredByMapFilters = useMemo(() => {
    if (!filters) return filteredJobs;
    
    // If filters haven't changed and we have cached result, we could return early
    // But since filteredJobs might have changed, we still need to filter
    
    const result = filteredJobs.filter((job) => {
      if (
        filters.favoritesOnly &&
        !matchesFavoritesFilter(job.id, true, bookmarkedJobIds)
      ) {
        return false;
      }
      return jobMatchesFilters(job, filters);
    });

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filteredJobs,
    filters,
    filtersChanged,
    bookmarkedJobIds,
    filterByPostType,
    filterByCategory,
    filterByLocation,
    filterByBudget,
  ]);

  // Convert jobs to map markers
  const mapMarkers: MapMarker[] = useMemo(() => {
    // Always use filteredByMapFilters to ensure consistent filtering with job list
    const jobsToShow = filteredByMapFilters;
    
    return jobsToShow.map(job => {
      // Normalize urgency to ensure it's valid
      const urgency = job.urgency && ['low', 'medium', 'high'].includes(job.urgency.toLowerCase())
        ? job.urgency.toLowerCase() as 'low' | 'medium' | 'high'
        : 'medium';
      
      return {
        id: job.id,
        position: { lat: job.lat, lng: job.lng },
        title: job.title,
        onClick: () => onJobSelect?.(job.id),
        isSelected: selectedJobId === job.id,
        isHovered: hoveredJobId === job.id,
        isUrgent: job.urgent, // Legacy support
        postType: job.postType || 'job', // Job type for icon selection
        urgency, // Priority level for color selection
        categorySlug: resolveCategorySlugFromJob({ category: job.category }),
        jobData: job,
      };
    });
  }, [filteredByMapFilters, selectedJobId, hoveredJobId, onJobSelect]);

  // Handle map clicks
  const handleMapClick = (_event: google.maps.MapMouseEvent) => {
    // Map click handler - can be used for future functionality
  };

  // Handle marker clicks
  const handleMarkerClick = (markerId: string) => {
    onJobSelect?.(markerId);
  };

  const containerClass = isExpanded
    ? fillParent
      ? 'absolute inset-0 w-full h-full min-h-0'
      : 'fixed top-0 left-0 right-0 bottom-0 z-50 w-full h-[calc(100vh-4rem-5rem)] md:h-[calc(100vh-4rem)]'
    : fillContainer
      ? 'w-full h-full min-h-0 flex-1'
      : 'w-[450px] h-[450px]';

  return (
    <div className={`relative transition-all duration-300 flex-shrink-0 ${containerClass}`}>
      {/* Map Container */}
      <div className={`relative w-full h-full overflow-hidden bg-muted ${
        isExpanded ? 'rounded-none border-none' : 'rounded-lg border border-border'
      }`}>
        <GoogleMap
          markers={mapMarkers}
          center={mapCenter}
          zoom={mapZoom}
          onMapClick={handleMapClick}
          onMarkerClick={handleMarkerClick}
          onBoundsChanged={onBoundsChanged}
          className="w-full h-full"
          isMapExpanded={isExpanded}
          isSmallMap={!isExpanded}
        />

        {/* Back to list — prominent when fullscreen map */}
        {onToggleExpand && isExpanded && (
          <div className="absolute z-[1001] top-4 right-4">
            <Button
              variant="default"
              size="lg"
              onClick={onToggleExpand}
              className="h-11 px-5 font-semibold shadow-xl bg-primary text-primary-foreground hover:bg-primary/90 border-2 border-primary-foreground/20"
              aria-label="Wróć do listy ogłoszeń"
            >
              <ArrowLeft className="w-5 h-5 mr-2 shrink-0" />
              Wróć do listy
            </Button>
          </div>
        )}

        {/* Expand (compact map only) */}
        {onToggleExpand && !isExpanded && !fillContainer && (
          <div className="absolute z-[1001] top-4 right-4 hidden md:block">
            <Button
              variant="outline"
              size="icon"
              onClick={onToggleExpand}
              className="w-10 h-10 bg-card shadow-lg"
              title="Powiększ mapę"
              aria-label="Powiększ mapę"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        )}

        {onToggleExpand && !isExpanded && fillContainer && (
          <div className="absolute z-[1001] top-4 right-4">
            <Button
              variant="default"
              size="lg"
              onClick={onToggleExpand}
              className="h-11 px-5 font-semibold shadow-xl bg-primary text-primary-foreground hover:bg-primary/90"
              aria-label="Wróć do listy ogłoszeń"
            >
              <ArrowLeft className="w-5 h-5 mr-2 shrink-0" />
              Wróć do listy
            </Button>
          </div>
        )}

        {/* Location Button */}
        <div className="absolute bottom-4 left-4 z-[1000]">
          <Button
            variant="outline"
            size="icon"
            onClick={getUserLocation}
            disabled={isGettingLocation}
            className="w-10 h-10 bg-card shadow-lg"
            title="Użyj mojej lokalizacji"
          >
            <Crosshair className={`w-4 h-4 ${isGettingLocation ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* City Selector Modal */}
        {showCitySelector && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000]">
            <Card className="w-96 max-w-[90vw]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Wybierz swoje miasto</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowCitySelector(false);
                      // Set default to Warsaw
                      const defaultLocation = { lat: 52.2297, lng: 21.0122 };
                      const defaultCityName = 'Warszawa';
                      setSelectedCityName(defaultCityName);
                      onCityNameChange?.(defaultCityName);
                      onLocationChange?.(defaultLocation);
                      setMapCenter(defaultLocation);
                      setMapZoom(12);
                      onCitySelectorClose?.();
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Nie można automatycznie wykryć Twojej lokalizacji. Wybierz miasto, aby zobaczyć zgłoszenia w pobliżu.
                </p>
                <Select onValueChange={handleCitySelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz miasto" />
                  </SelectTrigger>
                  <SelectContent className="z-[3000]">
                    {Object.keys(cityCoordinates).map((cityName) => (
                      <SelectItem key={cityName} value={cityName}>
                        {cityName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
};

export default EnhancedMapViewGoogleMaps;
