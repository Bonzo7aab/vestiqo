'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { googleMapsConfig, mapOptions, getMarkerColors, createMarkerGlyph, lightenColor, clearMarkerGlyphCache } from '../lib/google-maps/config';
import { suppressNonDomioMapFeatures } from '../lib/google-maps/map-features';
import {
  ensureDomioMarkerStyles,
  getDomioMarkerPinElement,
  MARKER_PIN_SCALE,
  wrapDomioMarkerContent,
} from '../lib/google-maps/marker-content';
import { getCategoryColor } from '../lib/config/categoryConfig';
import {
  generateInfoWindowContent,
  generateMobileDrawerContent,
  bindMapInfoWindowDetailsButton,
  clearInfoWindowCache,
} from '../lib/google-maps/infoWindowContent';
import { getListingDetailHref } from '../lib/listing/listing-detail-url';
import { Job } from '../types/job';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from './ui/drawer';
import { useIsMobile } from './ui/use-mobile';
import { useUserProfile } from '../contexts/AuthContext';
import { AuthPromptPopover, AUTH_PROMPT_APPLY_OFFER } from './AuthPromptPopover';
import { usePaletteVersion } from '../lib/theme/use-palette-version';

interface GoogleMapProps {
  markers?: MapMarker[];
  center?: { lat: number; lng: number };
  zoom?: number;
  onMapClick?: (event: google.maps.MapMouseEvent) => void;
  onMarkerClick?: (markerId: string) => void;
  onBoundsChanged?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  className?: string;
  style?: React.CSSProperties;
  isMapExpanded?: boolean;
  isSmallMap?: boolean;
}

// Marker configuration interface
interface MarkerConfig {
  id: string;
  position: { lat: number; lng: number };
  title: string;
  onClick?: () => void;
  isSelected?: boolean;
  isHovered?: boolean;
  postType?: 'job' | 'contest';
  urgency?: 'low' | 'medium' | 'high';
  categorySlug?: string;
  jobData?: Job;
}

// Marker pool manager for reusing marker instances
class MarkerPool {
  private pool: google.maps.marker.AdvancedMarkerElement[] = [];
  private activeMarkers: Map<string, google.maps.marker.AdvancedMarkerElement> = new Map();
  private markerConfigs: Map<string, MarkerConfig> = new Map();
  private pinElementCache: Map<string, google.maps.marker.PinElement> = new Map();

  acquire(id: string, config: MarkerConfig, map: google.maps.Map): google.maps.marker.AdvancedMarkerElement {
    // Check if marker already exists
    const existing = this.activeMarkers.get(id);
    if (existing) {
      // Update existing marker
      this.update(id, config, map);
      return existing;
    }

    // Try to reuse from pool
    let marker: google.maps.marker.AdvancedMarkerElement;
    if (this.pool.length > 0) {
      marker = this.pool.pop()!;
    } else {
      // Create new marker
      marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: config.position,
        title: config.title,
        zIndex: config.isHovered ? 1001 : 100,
      });
    }

    // Configure marker
    this.configureMarker(marker, config, map);
    
    // Track active marker
    this.activeMarkers.set(id, marker);
    this.markerConfigs.set(id, config);

    return marker;
  }

  private configureMarker(
    marker: google.maps.marker.AdvancedMarkerElement,
    config: MarkerConfig,
    map: google.maps.Map
  ): void {
    const colors = getMarkerColors();
    // OPD-105: contest markers use white pin + category-colored icon
    let backgroundColor: string;
    let glyphColor: string;
    let borderColor: string;

    if (config.postType === 'contest' && config.categorySlug) {
      const categoryColor = getCategoryColor(config.categorySlug);
      backgroundColor = colors.default.borderColor;
      glyphColor = categoryColor;
      borderColor = categoryColor;
    } else if (config.urgency && ['low', 'medium', 'high'].includes(config.urgency)) {
      backgroundColor = colors.priority[config.urgency];
      glyphColor = colors.default.glyphColor;
      borderColor = lightenColor(backgroundColor, 30);
    } else {
      backgroundColor = colors.priority.medium;
      glyphColor = colors.default.glyphColor;
      borderColor = lightenColor(backgroundColor, 30);
    }

    const postType = config.postType || 'job';
    const baseScale = config.isHovered ? MARKER_PIN_SCALE.hovered : MARKER_PIN_SCALE.default;

    const glyph = createMarkerGlyph(postType, glyphColor, config.categorySlug);
    const pinElement = new google.maps.marker.PinElement({
      background: backgroundColor,
      borderColor: borderColor,
      glyphColor: colors.default.glyphColor,
      glyph: glyph,
      scale: baseScale,
    });

    // Update marker properties
    marker.position = config.position;
    marker.title = config.title;

    const wrapper = wrapDomioMarkerContent({
      pinElement: pinElement.element,
      accentColor: borderColor,
      markerId: config.id,
      isHovered: config.isHovered,
    });
    marker.content = wrapper;
    marker.zIndex = config.isHovered ? 1001 : 100;
    marker.map = map;

    const element = marker.content as HTMLElement;
    element.style.zIndex = config.isHovered ? '1001' : '100';
  }

  update(id: string, config: Partial<MarkerConfig>, map: google.maps.Map): void {
    const marker = this.activeMarkers.get(id);
    if (!marker) return;

    const currentConfig = this.markerConfigs.get(id) || {} as MarkerConfig;
    const newConfig = { ...currentConfig, ...config };

    // Only reconfigure if visual properties changed
    const needsReconfig = 
      currentConfig.position?.lat !== newConfig.position?.lat ||
      currentConfig.position?.lng !== newConfig.position?.lng ||
      currentConfig.isHovered !== newConfig.isHovered ||
      currentConfig.urgency !== newConfig.urgency ||
      currentConfig.postType !== newConfig.postType ||
      currentConfig.categorySlug !== newConfig.categorySlug;

    if (needsReconfig) {
      this.configureMarker(marker, newConfig, map);
      this.markerConfigs.set(id, newConfig);
    }
  }

  release(id: string): void {
    const marker = this.activeMarkers.get(id);
    if (marker) {
      marker.map = null;
      this.activeMarkers.delete(id);
      this.markerConfigs.delete(id);
      // Return to pool (limit pool size to 50)
      if (this.pool.length < 50) {
        this.pool.push(marker);
      }
    }
  }

  releaseAll(): void {
    this.activeMarkers.forEach((marker) => {
      marker.map = null;
      if (this.pool.length < 50) {
        this.pool.push(marker);
      }
    });
    this.activeMarkers.clear();
    this.markerConfigs.clear();
  }

  getActiveMarkers(): Map<string, google.maps.marker.AdvancedMarkerElement> {
    return this.activeMarkers;
  }
}

// Viewport culling helper
function isMarkerInBounds(
  position: { lat: number; lng: number },
  bounds: { north: number; south: number; east: number; west: number },
  buffer: number = 0.1
): boolean {
  const latBuffer = (bounds.north - bounds.south) * buffer;
  const lngBuffer = (bounds.east - bounds.west) * buffer;

  return (
    position.lat >= bounds.south - latBuffer &&
    position.lat <= bounds.north + latBuffer &&
    position.lng >= bounds.west - lngBuffer &&
    position.lng <= bounds.east + lngBuffer
  );
}

const MapComponent: React.FC<{
  markers: MapMarker[];
  center: { lat: number; lng: number };
  zoom: number;
  onMapClick?: (event: google.maps.MapMouseEvent) => void;
  onMarkerClick?: (markerId: string) => void;
  onBoundsChanged?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  isMapExpanded?: boolean;
  isSmallMap?: boolean;
}> = ({ markers, center, zoom, onMapClick, onMarkerClick: _onMarkerClick, onBoundsChanged, isMapExpanded = false, isSmallMap = false }) => {
  const router = useRouter();
  const { user } = useUserProfile();
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map>();
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null);
  const [selectedJobForMobile, setSelectedJobForMobile] = useState<Job | null>(null);
  
  // Use refs for marker management (avoid React re-renders)
  const markerPoolRef = useRef<MarkerPool | null>(null);
  const mapMarkersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const infoWindowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveringInfoWindowRef = useRef<boolean>(false);
  const boundsDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastBoundsRef = useRef<{ north: number; south: number; east: number; west: number } | null>(null);
  const bouncingMarkerRef = useRef<HTMLElement | null>(null);
  const currentBoundsRef = useRef<{ north: number; south: number; east: number; west: number } | null>(null);
  // const loadingChunkRef = useRef<number>(0); // Unused variable
  const activeInfoWindowMarkerIdRef = useRef<string | null>(null);
  const markerDomListenerControllersRef = useRef(
    new WeakMap<google.maps.marker.AdvancedMarkerElement, AbortController>(),
  );
  const isMobile = useIsMobile();
  const paletteVersion = usePaletteVersion();

  const openListingDetails = useCallback((listingId: string) => {
    router.push(getListingDetailHref({ id: listingId }));
  }, [router]);

  const bindInfoWindowInteractions = useCallback(
    (listingId: string) => {
      setTimeout(() => {
        bindMapInfoWindowDetailsButton(listingId, openListingDetails);

        const infoWindowElement = document.querySelector(
          `.gm-style-iw-d [data-listing-id="${listingId}"]`,
        );
        if (!infoWindowElement) return;

        infoWindowElement.addEventListener('mouseenter', () => {
          isHoveringInfoWindowRef.current = true;
          if (infoWindowTimeoutRef.current) {
            clearTimeout(infoWindowTimeoutRef.current);
            infoWindowTimeoutRef.current = null;
          }
        });

        infoWindowElement.addEventListener('mouseleave', () => {
          isHoveringInfoWindowRef.current = false;
        });
      }, 100);
    },
    [openListingDetails],
  );

  // Initialize marker pool
  useEffect(() => {
    ensureDomioMarkerStyles();
    if (!markerPoolRef.current) {
      markerPoolRef.current = new MarkerPool();
    }
  }, []);

  useEffect(() => {
    if (mapRef.current && !map) {
      const newMap = new google.maps.Map(mapRef.current, {
        ...mapOptions,
        center,
        zoom,
        mapId: 'DOMIO_MAP_ID',
      });
      
      setMap(newMap);
      suppressNonDomioMapFeatures(newMap);

      // Initialize info window
      const newInfoWindow = new google.maps.InfoWindow({
        disableAutoPan: true,
        pixelOffset: new google.maps.Size(0, -10),
        ariaLabel: 'Szczegóły ogłoszenia',
        maxWidth: 360,
      });
      setInfoWindow(newInfoWindow);

      // Disable all Google Maps InfoWindow animations with CSS
      const style = document.createElement('style');
      style.textContent = `
        .gm-style-iw-c {
          transition: none !important;
          animation: none !important;
        }
        .gm-style-iw-tc {
          transition: none !important;
          animation: none !important;
        }
        .gm-style-iw {
          transition: none !important;
          animation: none !important;
        }
        .gm-style-iw-d {
          transition: none !important;
          animation: none !important;
        }
        .gm-style-iw-ch {
          transition: none !important;
          animation: none !important;
        }
      `;
      if (!document.querySelector('#gm-infowindow-no-animation')) {
        style.id = 'gm-infowindow-no-animation';
        document.head.appendChild(style);
      }

      // Add bounce animation CSS for markers
      const bounceStyle = document.createElement('style');
      bounceStyle.textContent = `
        @keyframes markerBounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .marker-bounce,
        .domio-map-marker__pin.marker-bounce {
          animation: markerBounce 1s ease-in-out infinite;
        }
      `;
      if (!document.querySelector('#marker-bounce-style')) {
        bounceStyle.id = 'marker-bounce-style';
        document.head.appendChild(bounceStyle);
      }

      // Track infoWindow close to stop bounce animation
      const stopBounce = () => {
        if (bouncingMarkerRef.current) {
          bouncingMarkerRef.current.classList.remove('marker-bounce');
          bouncingMarkerRef.current = null;
        }
      };

      // Track infoWindow close event
      google.maps.event.addListener(newInfoWindow, 'closeclick', () => {
        activeInfoWindowMarkerIdRef.current = null;
        stopBounce();
      });

      // Add click listener to close infoWindow when clicking on map
      newMap.addListener('click', (event: google.maps.MapMouseEvent) => {
        activeInfoWindowMarkerIdRef.current = null;
        stopBounce();
        newInfoWindow.close();
        
        if (isMobile) {
          setSelectedJobForMobile(null);
        }
        
        if (onMapClick) {
          onMapClick(event);
        }
      });

      // Add bounds_changed listener with debouncing
      if (onBoundsChanged) {
        newMap.addListener('bounds_changed', () => {
          if (boundsDebounceRef.current) {
            clearTimeout(boundsDebounceRef.current);
          }

          boundsDebounceRef.current = setTimeout(() => {
            const bounds = newMap.getBounds();
            if (bounds) {
              const northEast = bounds.getNorthEast();
              const southWest = bounds.getSouthWest();
              
              const newBounds = {
                north: northEast.lat(),
                south: southWest.lat(),
                east: northEast.lng(),
                west: southWest.lng(),
              };

              // Update current bounds for viewport culling
              currentBoundsRef.current = newBounds;

              // Only trigger callback if bounds changed significantly (>1% difference)
              const hasSignificantChange = !lastBoundsRef.current || 
                Math.abs(newBounds.north - lastBoundsRef.current.north) > (newBounds.north - newBounds.south) * 0.01 ||
                Math.abs(newBounds.south - lastBoundsRef.current.south) > (newBounds.north - newBounds.south) * 0.01 ||
                Math.abs(newBounds.east - lastBoundsRef.current.east) > (newBounds.east - newBounds.west) * 0.01 ||
                Math.abs(newBounds.west - lastBoundsRef.current.west) > (newBounds.east - newBounds.west) * 0.01;

              if (hasSignificantChange) {
                lastBoundsRef.current = newBounds;
                onBoundsChanged(newBounds);
              }

              // Update marker visibility based on new bounds
              if (markerPoolRef.current && currentBoundsRef.current) {
                const bounds = currentBoundsRef.current;
                const pool = markerPoolRef.current;
                const activeMarkers = pool.getActiveMarkers();
                
                markers.forEach((markerConfig) => {
                  const isVisible = isMarkerInBounds(markerConfig.position, bounds);
                  const marker = activeMarkers.get(markerConfig.id);
                  
                  if (marker) {
                    if (isVisible && !marker.map) {
                      marker.map = newMap;
                    } else if (!isVisible && marker.map) {
                      marker.map = null;
                    }
                  }
                });
              }
            }
          }, 500);
        });

        // Set initial bounds immediately when map is ready
        const setInitialBounds = () => {
          try {
            const bounds = newMap.getBounds();
            if (bounds) {
              const northEast = bounds.getNorthEast();
              const southWest = bounds.getSouthWest();
              
              const initialBounds = {
                north: northEast.lat(),
                south: southWest.lat(),
                east: northEast.lng(),
                west: southWest.lng(),
              };
              
            lastBoundsRef.current = initialBounds;
              currentBoundsRef.current = initialBounds;
              if (onBoundsChanged) {
                onBoundsChanged(initialBounds);
              }
            }
          } catch (e) {
            // Map might not be fully ready yet, will retry
            console.debug('Could not set initial bounds yet:', e);
          }
        };

        // Try to set bounds immediately (multiple attempts to ensure it works)
        setTimeout(() => {
          setInitialBounds();
        }, 50);
        
        setTimeout(() => {
          setInitialBounds();
        }, 200);

        // Also set bounds when map is idle (backup)
        const idleListener = newMap.addListener('idle', () => {
          setInitialBounds();
          google.maps.event.removeListener(idleListener);
        });
      }
    }
  }, [mapRef, map, center, zoom, onMapClick, onBoundsChanged, markers, isMobile]);

  // Update map center and zoom when props change
  useEffect(() => {
    if (map) {
      map.setCenter(center);
      map.setZoom(zoom);
    }
  }, [map, center, zoom]);

  // Helper function to create marker event handlers
  const createMarkerHandlers = useCallback((
    marker: google.maps.marker.AdvancedMarkerElement,
    markerData: MarkerConfig,
    mapInstance: google.maps.Map,
    infoWindowInstance: google.maps.InfoWindow
  ) => {
    const openInfoWindow = (_isFromClick: boolean = false) => {
      if (!markerData.jobData) return;

      // Always allow hover to show infoWindow for any marker
      // Click always works regardless of state

      if (isMobile) {
        setSelectedJobForMobile(markerData.jobData);
        return;
      }

      if (!infoWindowInstance) return;

      if (infoWindowTimeoutRef.current) {
        clearTimeout(infoWindowTimeoutRef.current);
        infoWindowTimeoutRef.current = null;
      }

      if (bouncingMarkerRef.current) {
        bouncingMarkerRef.current.classList.remove('marker-bounce');
      }

      const element = marker.content as HTMLElement;
      element.style.zIndex = '1001';
      const pinElement = getDomioMarkerPinElement(element);
      if (!isMobile) {
        pinElement.classList.add('marker-bounce');
        bouncingMarkerRef.current = pinElement;
      }

      const content = generateInfoWindowContent(markerData.jobData, isSmallMap);
      infoWindowInstance.setContent(content);
      infoWindowInstance.open(mapInstance, marker);
      
      // Track the active marker
      activeInfoWindowMarkerIdRef.current = markerData.id;

      bindInfoWindowInteractions(markerData.id);
    };

    // Click listener - always allow clicks to switch
    marker.addListener('click', () => {
      openInfoWindow(true);
    });

    // Hover listeners (desktop only)
    if (!isMobile) {
      const element = marker.content as HTMLElement;
      const previousController = markerDomListenerControllersRef.current.get(marker);
      previousController?.abort();

      const controller = new AbortController();
      markerDomListenerControllersRef.current.set(marker, controller);

      element.addEventListener(
        'mouseenter',
        () => {
          openInfoWindow(false);
        },
        { signal: controller.signal },
      );

      element.addEventListener(
        'mouseleave',
        () => {
          element.style.zIndex = '100';
        },
        { signal: controller.signal },
      );
    }
  }, [isMobile, isSmallMap, bindInfoWindowInteractions]);

  // Rebuild markers when dev palette changes
  useEffect(() => {
    if (!markerPoolRef.current) return;
    ensureDomioMarkerStyles();
    clearMarkerGlyphCache();
    clearInfoWindowCache();
    markerPoolRef.current.releaseAll();
    mapMarkersRef.current.clear();
  }, [paletteVersion]);

  // Update markers with pooling, viewport culling, and incremental loading
  useEffect(() => {
    if (!map || !infoWindow || !markerPoolRef.current) return;

    const pool = markerPoolRef.current;
    const activeMarkers = pool.getActiveMarkers();
    
    // Try to get bounds from map
    let mapBounds: google.maps.LatLngBounds | null = null;
    try {
      mapBounds = map.getBounds();
    } catch {
      // Map might not be ready yet
      console.debug('Map bounds not available yet');
    }
    
    // Get bounds for viewport culling
    // Use currentBoundsRef if available (plain object), otherwise use map bounds
    let cullingBounds: { north: number; south: number; east: number; west: number } | null = null;
    if (currentBoundsRef.current) {
      // Use cached bounds (plain object)
      cullingBounds = currentBoundsRef.current;
    } else if (mapBounds) {
      // Use map bounds (google.maps.LatLngBounds object)
      const northEast = mapBounds.getNorthEast();
      const southWest = mapBounds.getSouthWest();
      cullingBounds = {
        north: northEast.lat(),
        south: southWest.lat(),
        east: northEast.lng(),
        west: southWest.lng(),
      };
      // Cache it for next time
      currentBoundsRef.current = cullingBounds;
    }
    
    // If no bounds available yet and we have markers, show all markers initially
    // They'll be filtered once bounds are available

    // Filter markers by viewport (with buffer)
    // If no bounds available yet, show all markers (they'll be filtered once bounds are available)
    // This ensures markers are visible on initial load
    const visibleMarkers = cullingBounds
      ? markers.filter(m => isMarkerInBounds(m.position, cullingBounds))
      : markers; // Show all markers if bounds not available yet

    // Get current marker IDs
    const currentMarkerIds = new Set(visibleMarkers.map(m => m.id));
    const existingMarkerIds = new Set(activeMarkers.keys());

    // Release markers that are no longer needed
    existingMarkerIds.forEach((id) => {
      if (!currentMarkerIds.has(id)) {
        pool.release(id);
      }
    });

    // Batch marker creation/update
    const CHUNK_SIZE = 50;
    const chunks: MapMarker[][] = [];
    for (let i = 0; i < visibleMarkers.length; i += CHUNK_SIZE) {
      chunks.push(visibleMarkers.slice(i, i + CHUNK_SIZE));
    }

    // Process first chunk immediately
    const processChunk = (chunk: MapMarker[], chunkIndex: number) => {
      chunk.forEach((markerData) => {
        const config: MarkerConfig = {
          id: markerData.id,
          position: markerData.position,
          title: markerData.title,
          onClick: markerData.onClick,
          isSelected: markerData.isSelected,
          isHovered: markerData.isHovered,
          postType: markerData.postType,
          urgency: markerData.urgency,
          categorySlug: markerData.categorySlug,
          jobData: markerData.jobData,
        };

        const marker = pool.acquire(markerData.id, config, map);
        mapMarkersRef.current.set(markerData.id, marker);

        // Set up event handlers (only if marker is new or needs handlers)
        if (!markerData.jobData) return;
        
        // Only set up handlers if marker doesn't have them yet (check by looking for existing listeners)
        // Clear existing listeners to avoid duplicates
        google.maps.event.clearInstanceListeners(marker);
        
        // Get the element and ensure it has the data attribute
        const element = marker.content as HTMLElement;
        if (element) {
          element.setAttribute('data-marker-id', markerData.id);
        }
        
        createMarkerHandlers(marker, config, map, infoWindow);
      });

      // Process next chunk in idle time
      if (chunkIndex < chunks.length - 1) {
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(() => {
            processChunk(chunks[chunkIndex + 1], chunkIndex + 1);
          });
        } else {
          setTimeout(() => {
            processChunk(chunks[chunkIndex + 1], chunkIndex + 1);
          }, 0);
        }
      }
    };

    if (chunks.length > 0) {
      processChunk(chunks[0], 0);
    }
  }, [map, infoWindow, markers, createMarkerHandlers, paletteVersion]);

  // Handle programmatic hover state changes
  useEffect(() => {
    if (!map || !infoWindow || !markerPoolRef.current) return;

    const pool = markerPoolRef.current;
    const hoveredMarkerData = markers.find(m => m.isHovered);

    // Always show infoWindow when hovering over any marker
    if (hoveredMarkerData && hoveredMarkerData.jobData) {
      const marker = pool.getActiveMarkers().get(hoveredMarkerData.id);
      if (marker) {
        if (infoWindowTimeoutRef.current) {
          clearTimeout(infoWindowTimeoutRef.current);
          infoWindowTimeoutRef.current = null;
        }

        // Don't pan/zoom when map is expanded - user wants to stay at current view
        if (!isMapExpanded) {
          const zoom = map.getZoom() || 12;
          const scale = Math.pow(2, zoom);
          const pixelsPerDegree = (256 * scale) / 360;
          const latOffset = 110 / pixelsPerDegree;

          const offsetPosition = {
            lat: hoveredMarkerData.position.lat + latOffset,
            lng: hoveredMarkerData.position.lng
          };
          map.panTo(offsetPosition);
        }

        const content = generateInfoWindowContent(hoveredMarkerData.jobData, isSmallMap);
        infoWindow.setContent(content);
        infoWindow.open(map, marker);
        
        // Track the active marker
        activeInfoWindowMarkerIdRef.current = hoveredMarkerData.id;

        bindInfoWindowInteractions(hoveredMarkerData.id);
      }
    }
  }, [map, infoWindow, markers, isSmallMap, isMapExpanded, bindInfoWindowInteractions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (infoWindowTimeoutRef.current) {
        clearTimeout(infoWindowTimeoutRef.current);
      }
      if (boundsDebounceRef.current) {
        clearTimeout(boundsDebounceRef.current);
      }
      if (markerPoolRef.current) {
        markerPoolRef.current.releaseAll();
      }
    };
  }, []);

  return (
    <>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      
      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          open={!!selectedJobForMobile}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedJobForMobile(null);
            }
          }}
        >
          <DrawerContent className="max-h-[85vh] flex flex-col">
            <DrawerHeader className="pb-4 pt-6">
              <DrawerTitle className="sr-only">Szczegóły zgłoszenia</DrawerTitle>
            </DrawerHeader>
            
            <div className="flex-1 px-6 pb-4 overflow-y-auto">
              {selectedJobForMobile && (
                <div
                  dangerouslySetInnerHTML={{
                    __html: generateMobileDrawerContent(selectedJobForMobile),
                  }}
                />
              )}
            </div>

            <div className="sticky bottom-0 bg-card p-4 pt-4 pb-4">
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedJobForMobile(null)}
                  className="flex-1 py-4 px-6 bg-gray-200 text-gray-900 rounded-lg font-semibold text-base hover:bg-gray-300 transition-colors"
                  aria-label="Zamknij"
                >
                  Zamknij
                </button>
                {selectedJobForMobile ? (
                  <button
                    type="button"
                    onClick={() => {
                      openListingDetails(selectedJobForMobile.id);
                      setSelectedJobForMobile(null);
                    }}
                    className="flex-1 py-4 px-6 bg-card text-primary border border-primary rounded-lg font-semibold text-base hover:bg-primary/5 transition-colors"
                    aria-label="Szczegóły konkursu"
                  >
                    Szczegóły
                  </button>
                ) : null}
                {user ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedJobForMobile) {
                        window.dispatchEvent(
                          new CustomEvent('openApplicationModal', {
                            detail: { jobId: selectedJobForMobile.id },
                          }),
                        );
                        setSelectedJobForMobile(null);
                      }
                    }}
                    className="flex-1 py-4 px-6 bg-primary text-primary-foreground rounded-lg font-semibold text-base hover:bg-primary/90 transition-colors"
                    aria-label="Złóż ofertę"
                  >
                    Złóż ofertę
                  </button>
                ) : (
                  <AuthPromptPopover
                    title={AUTH_PROMPT_APPLY_OFFER.title}
                    description={AUTH_PROMPT_APPLY_OFFER.description}
                    align="center"
                  >
                    <button
                      type="button"
                      className="flex-1 py-4 px-6 bg-primary text-primary-foreground rounded-lg font-semibold text-base hover:bg-primary/90 transition-colors"
                      aria-label="Złóż ofertę"
                    >
                      Złóż ofertę
                    </button>
                  </AuthPromptPopover>
                )}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
};

const LoadingComponent = () => (
  <div className="flex items-center justify-center h-full bg-muted">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
      <p className="text-sm text-muted-foreground">Ładowanie mapy...</p>
    </div>
  </div>
);

const ErrorComponent = ({ status }: { status: Status }) => (
  <div className="flex items-center justify-center h-full bg-muted">
    <div className="text-center">
      <div className="text-red-500 mb-2">⚠️</div>
      <p className="text-sm text-muted-foreground">
        {status === Status.FAILURE 
          ? 'Nie można załadować mapy. Sprawdź klucz API.'
          : 'Ładowanie mapy...'
        }
      </p>
    </div>
  </div>
);

export interface MapMarker {
  id: string;
  position: { lat: number; lng: number };
  title: string;
  onClick?: () => void;
  isSelected?: boolean;
  isHovered?: boolean;
  isUrgent?: boolean; // Legacy support
  postType?: 'job' | 'contest';
  urgency?: 'low' | 'medium' | 'high';
  categorySlug?: string;
  jobData?: Job;
}

export const GoogleMap: React.FC<GoogleMapProps> = ({
  markers = [],
  center = { lat: 52.2297, lng: 21.0122 },
  zoom = 12,
  onMapClick,
  onMarkerClick,
  onBoundsChanged,
  className = '',
  style = { height: '100%' },
  isMapExpanded = false,
  isSmallMap = false
}) => {
  const render = useCallback((status: Status) => {
    switch (status) {
      case Status.LOADING:
        return <LoadingComponent />;
      case Status.FAILURE:
        return <ErrorComponent status={status} />;
      case Status.SUCCESS:
        return (
          <MapComponent
            markers={markers}
            center={center}
            zoom={zoom}
            onMapClick={onMapClick}
            onMarkerClick={onMarkerClick}
            onBoundsChanged={onBoundsChanged}
            isMapExpanded={isMapExpanded}
            isSmallMap={isSmallMap}
          />
        );
    }
  }, [markers, center, zoom, onMapClick, onMarkerClick, onBoundsChanged, isMapExpanded, isSmallMap]);

  if (!googleMapsConfig.apiKey || googleMapsConfig.apiKey === 'your_google_maps_api_key_here') {
    return (
      <div className="flex items-center justify-center h-full bg-muted border border-dashed border-border rounded-lg">
        <div className="text-center p-6 max-w-md">
          <div className="text-blue-500 mb-4 text-4xl">🗺️</div>
          <h3 className="font-medium mb-2">Mapa Google</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Aby zobaczyć mapę, skonfiguruj klucz API Google Maps.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs">
            <p className="font-medium text-blue-800 mb-1">Instrukcja:</p>
            <ol className="text-blue-700 space-y-1 text-left">
              <li>1. Otwórz plik .env.local</li>
              <li>2. Dodaj swój klucz API Google Maps</li>
              <li>3. Uruchom ponownie serwer dev</li>
            </ol>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Zobacz GOOGLE_MAPS_SETUP.md aby uzyskać szczegółowe instrukcje.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      <Wrapper apiKey={googleMapsConfig.apiKey} libraries={[...googleMapsConfig.libraries] as ('places' | 'geometry' | 'drawing' | 'visualization')[]} render={render} />
    </div>
  );
};

export default GoogleMap;
