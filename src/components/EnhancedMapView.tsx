import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapPin, Maximize2, Minimize2, Plus, Minus, Crosshair, Filter, Users, X } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Slider } from './ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  description: string;
  lat: number;
  lng: number;
  applications: number;
  rating: number;
  verified: boolean;
  urgent: boolean;
  premium: boolean;
  category: string;
  distance?: number;
}

interface EnhancedMapViewProps {
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  jobs?: Job[];
  selectedJobId?: string | null;
  onJobSelect?: (jobId: string) => void;
  hoveredJobId?: string | null;
  onJobHover?: (jobId: string | null) => void;
  userLocation?: { lat: number; lng: number } | null;
  onLocationChange?: (location: { lat: number; lng: number }) => void;
  searchRadius?: number;
  onRadiusChange?: (radius: number) => void;
}

// Real coordinates for Polish cities
const cityCoordinates = {
  'Warszawa': { lat: 52.2297, lng: 21.0122 },
  'Kraków': { lat: 50.0647, lng: 19.9450 },
  'Gdańsk': { lat: 54.3520, lng: 18.6466 },
  'Wrocław': { lat: 51.1079, lng: 17.0385 },
  'Poznań': { lat: 52.4064, lng: 16.9252 },
  'Łódź': { lat: 51.7592, lng: 19.4550 },
  'Katowice': { lat: 50.2649, lng: 19.0238 },
  'Szczecin': { lat: 53.4285, lng: 14.5528 },
  'Lublin': { lat: 51.2465, lng: 22.5684 },
  'Bydgoszcz': { lat: 53.1235, lng: 18.0084 }
};


// Helper function to calculate distance between two points
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Convert lat/lng to screen coordinates (Poland map bounds)
const latLngToScreen = (lat: number, lng: number, mapWidth: number, mapHeight: number) => {
  // Poland bounds approximately
  const bounds = {
    north: 55.0,
    south: 49.0,
    west: 14.0,
    east: 24.5
  };
  
  const x = ((lng - bounds.west) / (bounds.east - bounds.west)) * mapWidth;
  const y = ((bounds.north - lat) / (bounds.north - bounds.south)) * mapHeight;
  
  return { x: Math.max(0, Math.min(mapWidth, x)), y: Math.max(0, Math.min(mapHeight, y)) };
};

// Clustering function
const clusterJobs = (jobs: Job[], zoomLevel: number, mapWidth: number, mapHeight: number) => {
  const clusters: { jobs: Job[]; x: number; y: number; lat: number; lng: number }[] = [];
  const processed = new Set<string>();
  const clusterRadius = Math.max(30, 80 / zoomLevel); // Adjust cluster radius based on zoom
  
  jobs.forEach(job => {
    if (processed.has(job.id)) return;
    
    const jobScreen = latLngToScreen(job.lat, job.lng, mapWidth, mapHeight);
    const clusterJobs = [job];
    processed.add(job.id);
    
    // Find nearby jobs to cluster
    jobs.forEach(otherJob => {
      if (processed.has(otherJob.id)) return;
      
      const otherScreen = latLngToScreen(otherJob.lat, otherJob.lng, mapWidth, mapHeight);
      const distance = Math.sqrt(
        Math.pow(jobScreen.x - otherScreen.x, 2) + Math.pow(jobScreen.y - otherScreen.y, 2)
      );
      
      if (distance < clusterRadius) {
        clusterJobs.push(otherJob);
        processed.add(otherJob.id);
      }
    });
    
    // Calculate cluster center
    const avgLat = clusterJobs.reduce((sum, j) => sum + j.lat, 0) / clusterJobs.length;
    const avgLng = clusterJobs.reduce((sum, j) => sum + j.lng, 0) / clusterJobs.length;
    const center = latLngToScreen(avgLat, avgLng, mapWidth, mapHeight);
    
    clusters.push({
      jobs: clusterJobs,
      x: center.x,
      y: center.y,
      lat: avgLat,
      lng: avgLng
    });
  });
  
  return clusters;
};

export const EnhancedMapView: React.FC<EnhancedMapViewProps> = ({
  isExpanded = false,
  onToggleExpand,
  jobs = [],
  selectedJobId,
  onJobSelect,
  hoveredJobId,
  onJobHover,
  userLocation,
  onLocationChange,
  searchRadius = 25,
  onRadiusChange
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showUserLocation, setShowUserLocation] = useState(true);
  const [showJobClusters, setShowJobClusters] = useState(true);
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  
  // Ensure client-side only rendering for dynamic calculations
  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      setIsClient(true);
    }, 0);
  }, []);
  
  const mapDimensions = useMemo(() => {
    if (!isClient) {
      // Use consistent dimensions during SSR
      return isExpanded ? { width: 1100, height: 600 } : { width: 384, height: 500 };
    }
    
    return isExpanded 
      ? { 
          width: window.innerWidth - 100, 
          height: window.innerHeight - 200 
        }
      : { width: 384, height: 500 };
  }, [isExpanded, isClient]);

  // Get user location or show city selector
  const getUserLocation = () => {
    setIsGettingLocation(true);
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          onLocationChange?.(location);
          setIsGettingLocation(false);
        },
        (_error) => {
          console.warn('Nie można uzyskać lokalizacji automatycznie');
          setIsGettingLocation(false);
          // Show toast with helpful message
          toast.info('Wybierz miasto', {
            description: 'Nie można automatycznie wykryć Twojej lokalizacji. Wybierz miasto z listy.',
            action: {
              label: 'Wybierz',
              onClick: () => setShowCitySelector(true)
            }
          });
          // Show city selector
          setShowCitySelector(true);
        },
        { 
          timeout: 5000, 
          enableHighAccuracy: false,
          maximumAge: 300000
        }
      );
    } else {
      console.warn('Geolokalizacja nie jest dostępna w tej przeglądarce');
      setIsGettingLocation(false);
      toast.info('Wybierz miasto', {
        description: 'Geolokalizacja nie jest dostępna. Wybierz miasto z listy.',
      });
      setShowCitySelector(true);
    }
  };

  // Filter jobs by radius if user location is available
  const filteredJobs = useMemo(() => {
    if (!userLocation || !showJobClusters) return jobs;
    
    return jobs.filter(job => {
      const distance = calculateDistance(userLocation.lat, userLocation.lng, job.lat, job.lng);
      return distance <= searchRadius;
    });
  }, [jobs, userLocation, searchRadius, showJobClusters]);

  // Create clusters (client-side only to prevent hydration mismatch)
  const clusters = useMemo(() => {
    if (!isClient) return [];
    return clusterJobs(filteredJobs, zoomLevel, mapDimensions.width, mapDimensions.height);
  }, [filteredJobs, zoomLevel, mapDimensions, isClient]);

  const zoomIn = () => setZoomLevel(Math.min(zoomLevel + 0.3, 3));
  const zoomOut = () => setZoomLevel(Math.max(zoomLevel - 0.3, 0.5));

  // Handle city selection
  const handleCitySelect = (cityName: string) => {
    const coordinates = cityCoordinates[cityName as keyof typeof cityCoordinates];
    if (coordinates) {
      onLocationChange?.(coordinates);
      setShowCitySelector(false);
      toast.success(`Lokalizacja ustawiona na ${cityName}`, {
        description: `Pokazano zgłoszenia w promieniu ${searchRadius} km od ${cityName}.`
      });
    }
  };

  // Don't automatically set location - let user choose
  // useEffect(() => {
  //   if (!userLocation) {
  //     // Set default to Warsaw silently - user can change via city selector
  //     onLocationChange?.({ lat: 52.2297, lng: 21.0122 });
  //   }
  // }, [userLocation, onLocationChange]);

  return (
    <div className={`relative ${isExpanded ? 'fixed inset-0 z-50' : 'w-96'}`} style={{ backgroundColor: '#ffffff', borderLeft: '1px solid #e2e8f0' }}>
      {/* Map Header */}
      <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid #e2e8f0' }}>
        <h3 className="font-semibold">Mapa Zgłoszeń</h3>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="text-xs">
            {filteredJobs.length} zgłoszeń
          </Badge>
          
          {/* Filters Popover */}
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <Filter className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <h4 className="font-medium">Ustawienia Mapy</h4>
                
                {/* Search Radius */}
                {userLocation && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Promień wyszukiwania</label>
                      <span className="text-sm text-muted-foreground">{searchRadius} km</span>
                    </div>
                    <Slider
                      value={[searchRadius]}
                      onValueChange={(value) => onRadiusChange?.(value[0])}
                      max={100}
                      min={5}
                      step={5}
                      className="w-full"
                    />
                  </div>
                )}
                
                {/* Location Actions */}
                {userLocation && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Twoja lokalizacja</label>
                      <span className="text-xs text-muted-foreground">
                        {Object.entries(cityCoordinates).find(([_, coords]) => 
                          Math.abs(coords.lat - userLocation.lat) < 0.1 && 
                          Math.abs(coords.lng - userLocation.lng) < 0.1
                        )?.[0] || 'Niestandardowa'}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCitySelector(true)}
                      className="w-full text-xs"
                    >
                      Zmień miasto
                    </Button>
                  </div>
                )}
                
                {/* Toggle Options */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Pokaż moją lokalizację</label>
                    <Switch 
                      checked={showUserLocation} 
                      onCheckedChange={setShowUserLocation}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Grupuj zgłoszenia</label>
                    <Switch 
                      checked={showJobClusters} 
                      onCheckedChange={setShowJobClusters}
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button 
            variant="ghost" 
            size={isExpanded ? "default" : "icon"}
            onClick={onToggleExpand}
            className={isExpanded ? "h-8 px-3" : "w-8 h-8"}
            title={isExpanded ? "Zmniejsz mapę" : "Powiększ mapę"}
          >
            {isExpanded ? (
              <>
                <Minimize2 className="w-4 h-4 mr-2" />
                Zmniejsz mapę
              </>
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative h-full overflow-hidden" ref={mapRef}>
        {/* Custom Poland Map */}
        <div 
          className="w-full h-full bg-gradient-to-br from-blue-50 via-green-50 to-blue-100 relative cursor-move"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 80%, rgba(120, 160, 180, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(160, 180, 120, 0.3) 0%, transparent 50%),
              linear-gradient(45deg, rgba(0,0,0,0.05) 1px, transparent 1px),
              linear-gradient(-45deg, rgba(0,0,0,0.05) 1px, transparent 1px)
            `,
            backgroundSize: '100% 100%, 100% 100%, 20px 20px, 20px 20px',
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease-out',
            width: `${mapDimensions.width}px`,
            height: `${mapDimensions.height}px`
          }}
        >
          {/* Geographic Features */}
          <div className="absolute inset-0">
            <svg className="w-full h-full opacity-30">
              {/* Vistula River */}
              <path
                d="M 100 400 Q 200 350 300 380 Q 400 360 500 340 Q 600 320 700 300"
                stroke="#4f9eff"
                strokeWidth="3"
                fill="none"
                opacity="0.6"
              />
              {/* Oder River */}
              <path
                d="M 50 450 Q 100 400 150 380 Q 200 360 250 340 Q 300 320 350 300"
                stroke="#4f9eff"
                strokeWidth="2"
                fill="none"
                opacity="0.4"
              />
            </svg>
          </div>

          {/* User Location */}
          {isClient && userLocation && showUserLocation && (
            <div
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
              style={{
                left: `${latLngToScreen(userLocation.lat, userLocation.lng, mapDimensions.width, mapDimensions.height).x}px`,
                top: `${latLngToScreen(userLocation.lat, userLocation.lng, mapDimensions.width, mapDimensions.height).y}px`
              }}
            >
              <div className="relative">
                <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
                <div className="absolute inset-0 w-4 h-4 bg-blue-500 rounded-full animate-ping opacity-30"></div>
                {/* Search Radius Circle */}
                <div 
                  className="absolute border-2 border-blue-300 border-dashed rounded-full opacity-30"
                  style={{
                    width: `${(searchRadius / 100) * Math.min(mapDimensions.width, mapDimensions.height)}px`,
                    height: `${(searchRadius / 100) * Math.min(mapDimensions.width, mapDimensions.height)}px`,
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)'
                  }}
                ></div>
              </div>
            </div>
          )}

          {/* Job Clusters */}
          {isClient && clusters.map((cluster, index) => {
            const isSelected = cluster.jobs.some(job => job.id === selectedJobId);
            const isHovered = cluster.jobs.some(job => job.id === hoveredJobId);
            const hasUrgent = cluster.jobs.some(job => job.urgent);
            const hasPremium = cluster.jobs.some(job => job.premium);
            const isMultiple = cluster.jobs.length > 1;
            
            return (
              <div
                key={`cluster-${index}`}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-10"
                style={{
                  left: `${cluster.x}px`,
                  top: `${cluster.y}px`,
                  zIndex: isSelected ? 25 : isHovered ? 20 : 10
                }}
                onClick={() => {
                  if (isMultiple) {
                    setSelectedCluster(selectedCluster === `cluster-${index}` ? null : `cluster-${index}`);
                  } else {
                    onJobSelect?.(cluster.jobs[0].id);
                  }
                }}
                onMouseEnter={() => {
                  if (!isMultiple) {
                    onJobHover?.(cluster.jobs[0].id);
                  }
                }}
                onMouseLeave={() => {
                  if (!isMultiple) {
                    onJobHover?.(null);
                  }
                }}
              >
                {/* Marker Pin */}
                <div className="relative">
                  <div 
                    className={`
                      rounded-full flex items-center justify-center shadow-lg transition-all duration-200 border-2 border-white
                      ${isSelected ? 'scale-125' : 'group-hover:scale-110'}
                      ${isMultiple ? 'w-10 h-10' : 'w-8 h-8'}
                    `}
                    style={{ 
                      backgroundColor: hasUrgent ? '#dc2626' : hasPremium ? '#7c3aed' : '#1e40af'
                    }}
                  >
                    {isMultiple ? (
                      <Users className="w-5 h-5 text-white" />
                    ) : (
                      <MapPin className="w-4 h-4 text-white" />
                    )}
                  </div>
                  
                  {/* Pulse Animation */}
                  <div 
                    className="absolute inset-0 rounded-full animate-ping opacity-30"
                    style={{ 
                      backgroundColor: hasUrgent ? '#dc2626' : hasPremium ? '#7c3aed' : '#1e40af',
                      width: isMultiple ? '40px' : '32px',
                      height: isMultiple ? '40px' : '32px'
                    }}
                  ></div>
                  
                  {/* Job Count Badge */}
                  {isMultiple && (
                    <div className="absolute -top-2 -right-2 bg-card text-foreground text-xs rounded-full w-6 h-6 flex items-center justify-center border border-border font-medium">
                      {cluster.jobs.length}
                    </div>
                  )}
                </div>

                {/* Popup Card for Single Job */}
                {!isMultiple && (isSelected || isHovered) && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 z-30">
                    <Card className="w-64 shadow-xl animate-in fade-in-0 zoom-in-95 duration-200">
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <h4 className="font-medium text-sm line-clamp-2">{cluster.jobs[0].title}</h4>
                            {cluster.jobs[0].urgent && (
                              <Badge variant="destructive" className="text-xs ml-2">Pilne</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">{cluster.jobs[0].company}</p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{cluster.jobs[0].applications} ofert</span>
                            <span className="font-medium text-success">{cluster.jobs[0].salary}</span>
                          </div>
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-white"></div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Cluster Jobs List */}
                {isMultiple && selectedCluster === `cluster-${index}` && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 z-30">
                    <Card className="w-80 max-h-96 overflow-y-auto shadow-xl animate-in fade-in-0 zoom-in-95 duration-200">
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm mb-3">{cluster.jobs.length} zgłoszeń w tym obszarze</h4>
                          {cluster.jobs.map(job => (
                            <div 
                              key={job.id}
                              className="p-2 border rounded cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                onJobSelect?.(job.id);
                                setSelectedCluster(null);
                              }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h5 className="text-sm font-medium line-clamp-1">{job.title}</h5>
                                  <p className="text-xs text-muted-foreground line-clamp-1">{job.company}</p>
                                  <p className="text-xs font-medium text-success mt-1">{job.salary}</p>
                                </div>
                                <div className="flex flex-col items-end space-y-1 ml-2">
                                  {job.urgent && <Badge variant="destructive" className="text-xs">Pilne</Badge>}
                                  {job.premium && <Badge variant="secondary" className="text-xs">Premium</Badge>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-white"></div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-4 right-4 flex flex-col space-y-1 rounded-lg shadow-lg z-[1000]" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomIn}
            className="w-8 h-8 hover:bg-gray-100"
            disabled={zoomLevel >= 3}
          >
            <Plus className="w-4 h-4" />
          </Button>
          <div className="w-6 h-px bg-gray-200 mx-auto"></div>
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomOut}
            className="w-8 h-8 hover:bg-gray-100"
            disabled={zoomLevel <= 0.5}
          >
            <Minus className="w-4 h-4" />
          </Button>
        </div>

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
                      onLocationChange?.({ lat: 52.2297, lng: 21.0122 });
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
                  <SelectContent>
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

        {/* Map Stats */}
        <div className="absolute top-4 right-4 bg-card rounded-lg shadow p-3 text-xs max-w-48">
          <div className="font-medium mb-2">Statystyki</div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Widoczne zgłoszenia:</span>
              <span className="font-medium">{filteredJobs.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Pilne:</span>
              <span className="text-destructive font-medium">{filteredJobs.filter(job => job.urgent).length}</span>
            </div>
            <div className="flex justify-between">
              <span>Premium:</span>
              <span className="text-purple-600 font-medium">{filteredJobs.filter(job => job.premium).length}</span>
            </div>
            {userLocation && (
              <>
                <div className="flex justify-between">
                  <span>Promień:</span>
                  <span className="font-medium">{searchRadius} km</span>
                </div>
                <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                  <span>📍 {Object.entries(cityCoordinates).find(([_, coords]) => 
                    Math.abs(coords.lat - userLocation.lat) < 0.1 && 
                    Math.abs(coords.lng - userLocation.lng) < 0.1
                  )?.[0] || 'Lokalizacja'}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Map Legend */}
        <div className="absolute bottom-4 left-16 bg-card rounded-lg shadow p-3 text-xs">
          <div className="font-medium mb-2">Legenda</div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <span>Standardowe</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-destructive"></div>
              <span>Pilne</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-purple-600"></div>
              <span>Premium</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Twoja lokalizacja</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedMapView;