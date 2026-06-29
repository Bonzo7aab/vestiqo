"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { MapPin, Crosshair, Loader2, CheckCircle2, ChevronDown } from 'lucide-react';
import { getCurrentLocation, reverseGeocode } from '../lib/google-maps/geocoding';
import { googleMapsConfig } from '../lib/google-maps/config';
import { toast } from 'sonner';

interface LocationAutocompleteProps {
  value?: string;
  onLocationSelect: (location: string, address: string, lat: number, lng: number, sublocalityLevel1?: string) => void;
  required?: boolean;
  placeholder?: string;
  label?: string;
}

interface AutocompleteSuggestion {
  placePrediction: {
    placeId: string;
    text: {
      text: string;
    };
    structuredFormat?: {
      mainText: {
        text: string;
      };
      secondaryText?: {
        text: string;
      };
    };
  };
}

interface GeolocationErrorDetails {
  code?: number;
  message: string;
}

const getGeolocationErrorDetails = (error: unknown): GeolocationErrorDetails => {
  const fallbackMessage = 'Wystąpił błąd podczas pobierania lokalizacji';

  if (error instanceof Error) {
    const errorWithCode = error as Error & { code?: number };
    return {
      code: typeof errorWithCode.code === 'number' ? errorWithCode.code : undefined,
      message: error.message || fallbackMessage,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const errorRecord = error as Record<string, unknown>;
    const code = typeof errorRecord.code === 'number' ? errorRecord.code : undefined;
    const message =
      typeof errorRecord.message === 'string' && errorRecord.message.trim()
        ? errorRecord.message
        : fallbackMessage;

    return { code, message };
  }

  if (typeof error === 'string' && error.trim()) {
    return { message: error };
  }

  return { message: fallbackMessage };
};

export default function LocationAutocomplete({
  value = '',
  onLocationSelect,
  required = false,
  placeholder = 'Wpisz adres lub wybierz z listy',
  label = 'Lokalizacja *'
}: LocationAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [inputValue, setInputValue] = useState(value || '');
  
  // Session token for cost optimization
  const sessionTokenRef = useRef<unknown | null>(null);
  const requestIdRef = useRef(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const placesLibraryRef = useRef<{ AutocompleteSuggestion?: unknown; AutocompleteSessionToken?: new () => unknown } | null>(null);

  // Track mount state to prevent hydration mismatches
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load Google Maps script if not already loaded
  const loadGoogleMapsScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window is not available'));
        return;
      }

      // Check if Google Maps is already loaded
      if (window.google?.maps?.importLibrary) {
        resolve();
        return;
      }

      const apiKey = googleMapsConfig.apiKey;
      if (!apiKey) {
        reject(new Error('Google Maps API key is not configured'));
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        // Wait for script to load
        const checkInterval = setInterval(() => {
          if (window.google?.maps?.importLibrary) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);

        setTimeout(() => {
          clearInterval(checkInterval);
          if (!window.google?.maps?.importLibrary) {
            reject(new Error('Google Maps script failed to load'));
          }
        }, 10000);
        return;
      }

      // Use the bootstrap loader from Google Maps documentation
      const bootstrapLoader = `
        (g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=\`https://maps.\${c}apis.com/maps/api/js?\`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})
        ({key: "${apiKey}", v: "weekly"});
      `;

      const script = document.createElement('script');
      script.textContent = bootstrapLoader;
      const nonce = document.querySelector('script[nonce]')?.getAttribute('nonce');
      if (nonce) {
        script.nonce = nonce;
      }
      script.onerror = () => reject(new Error('Failed to load Google Maps script'));
      document.head.appendChild(script);

      // Wait for importLibrary to be available
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.importLibrary) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.google?.maps?.importLibrary) {
          reject(new Error('Google Maps failed to load within timeout'));
        }
      }, 10000);
    });
  }, []);

  // Initialize Places library using importLibrary
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;

    const initializePlacesLibrary = async () => {
      try {
        // Load Google Maps script if not already loaded
        await loadGoogleMapsScript();

        // Wait for importLibrary to be available
        let attempts = 0;
        while (attempts < 50 && !window.google?.maps?.importLibrary) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (!window.google?.maps?.importLibrary) {
          console.error('Google Maps importLibrary not available after timeout');
          toast.error('Nie udało się załadować Google Maps. Sprawdź konfigurację API key.');
          return;
        }

        const placesLibrary = await window.google.maps.importLibrary('places') as typeof google.maps.places;
        const AutocompleteSuggestion = placesLibrary.AutocompleteSuggestion;
        const AutocompleteSessionToken = placesLibrary.AutocompleteSessionToken;
        
        if (!AutocompleteSuggestion) {
          console.error('AutocompleteSuggestion not found in Places library');
          toast.error('Autocomplete API nie jest dostępne. Sprawdź czy Places API (New) jest włączone.');
          return;
        }
        
        placesLibraryRef.current = { AutocompleteSuggestion, AutocompleteSessionToken };
        
        // Create initial session token
        if (AutocompleteSessionToken) {
          sessionTokenRef.current = new AutocompleteSessionToken();
        }
      } catch (error: unknown) {
        console.error('Failed to load Places library:', error);
        toast.error(`Nie udało się załadować biblioteki miejsc: ${(error instanceof Error ? error.message : String(error)) || 'Nieznany błąd'}`);
      }
    };

    initializePlacesLibrary();
  }, [isMounted, loadGoogleMapsScript]);

  // Reset internal state when value becomes empty
  useEffect(() => {
    if (!value && isMounted) {
      setSelectedLocation('');
      setSelectedAddress('');
      setInputValue('');
      setSuggestions([]);
      setShowSuggestions(false);
    } else if (value && value !== inputValue) {
      setInputValue(value);
    }
    // inputValue is intentionally omitted - it's state set inside this effect, adding it would cause infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isMounted]);

  // Fetch autocomplete suggestions using the modern API
  const fetchAutocompleteSuggestions = useCallback(async (input: string) => {
    if (!input.trim()) {
      return;
    }

    // Wait for Places library to load if not ready
    if (!placesLibraryRef.current?.AutocompleteSuggestion) {
      // Wait up to 5 seconds for library to load
      let attempts = 0;
      while (attempts < 50 && !placesLibraryRef.current?.AutocompleteSuggestion) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (!placesLibraryRef.current?.AutocompleteSuggestion) {
        console.error('Places library failed to load');
        toast.error('Biblioteka miejsc Google Maps nie jest jeszcze gotowa. Spróbuj ponownie za chwilę.');
        return;
      }
    }

    try {
      setIsLoading(true);
      const requestId = ++requestIdRef.current;

      const { AutocompleteSuggestion } = placesLibraryRef.current;
      
      const request: { input: string; sessionToken: unknown; locationBias?: { center: { lat: number; lng: number }; radius: number }; includedRegionCodes?: string[] } = {
        input: input,
        sessionToken: sessionTokenRef.current,
        includedRegionCodes: ['PL'], // Restrict to Poland
      };

      const { suggestions } = await (AutocompleteSuggestion as { fetchAutocompleteSuggestions: (req: typeof request) => Promise<{ suggestions: AutocompleteSuggestion[] }> }).fetchAutocompleteSuggestions(request);

      // Check if this request is still the latest
      if (requestId !== requestIdRef.current) {
        return;
      }

      setSuggestions(suggestions || []);
      setShowSuggestions(true);
    } catch (error: unknown) {
      console.error('Autocomplete error:', error);
      if (requestIdRef.current > 0) {
        toast.error('Nie udało się pobrać sugestii lokalizacji');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle input changes with debouncing
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedIndex(-1);
    
    if (!newValue.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce autocomplete requests
    debounceTimerRef.current = setTimeout(async () => {
      await fetchAutocompleteSuggestions(newValue);
    }, 300);
  }, [fetchAutocompleteSuggestions]);


  // Handle place selection
  const handlePlaceSelect = async (suggestion: AutocompleteSuggestion) => {
    if (!placesLibraryRef.current || !suggestion.placePrediction) {
      return;
    }

    try {
      setIsLoading(true);
      setShowSuggestions(false);
      setInputValue('');

      // Convert place prediction to Place object
      const place = ((suggestion.placePrediction as unknown) as { toPlace: () => google.maps.places.Place }).toPlace();
      
      // Fetch place details
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location', 'addressComponents'],
      });

      if (!place.location) {
        toast.error('Nie udało się znaleźć lokalizacji');
        return;
      }

      // Extract city from address components
      let city = '';
      let sublocalityLevel1 = '';
      const addressComponents = place.addressComponents || [];
      
      interface AddressComponent {
        types: string[];
        longText?: string;
        shortText?: string;
      }
      
      const locality = (addressComponents as AddressComponent[]).find((component: AddressComponent) =>
        component.types.includes('locality')
      );
      
      if (locality) {
        city = locality.longText || locality.shortText || '';
      } else {
        const adminArea = (addressComponents as AddressComponent[]).find((component: AddressComponent) =>
          component.types.includes('administrative_area_level_1')
        );
        city = adminArea?.longText || adminArea?.shortText || place.displayName || '';
      }

      // Extract sublocality_level_1 (district/neighborhood)
      const sublocality = (addressComponents as AddressComponent[]).find((component: AddressComponent) =>
        component.types.includes('sublocality_level_1')
      );
      
      if (sublocality) {
        sublocalityLevel1 = sublocality.longText || sublocality.shortText || '';
      }

      const formattedAddress = place.formattedAddress || place.displayName || '';
      const lat = place.location.lat();
      const lng = place.location.lng();

      setSelectedLocation(city);
      setSelectedAddress(formattedAddress);
      setInputValue(formattedAddress);
      onLocationSelect(city, formattedAddress, lat, lng, sublocalityLevel1 || undefined);

      // Refresh session token after selection
      if (placesLibraryRef.current.AutocompleteSessionToken) {
        sessionTokenRef.current = new placesLibraryRef.current.AutocompleteSessionToken();
      }

      toast.success('Lokalizacja wybrana pomyślnie');
    } catch {
      // Ignore errors when processing place
      toast.error('Błąd podczas przetwarzania lokalizacji');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handlePlaceSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    if (isMounted) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMounted]);

  // Helper function to wait for Google Maps API to load
  const waitForGoogleMaps = (maxWaitTime = 10000): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }

      if (window.google?.maps?.Geocoder) {
        resolve(true);
        return;
      }

      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.Geocoder) {
          clearInterval(checkInterval);
          resolve(true);
        } else if (Date.now() - startTime > maxWaitTime) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 100);
    });
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Twoja przeglądarka nie obsługuje geolokalizacji');
      return;
    }

    setIsGeolocating(true);

    try {
      const googleMapsReady = await waitForGoogleMaps();
      
      if (!googleMapsReady) {
        toast.error('Google Maps nie jest jeszcze załadowane. Spróbuj ponownie za chwilę.');
        setIsGeolocating(false);
        return;
      }

      const position = await getCurrentLocation();
      const { lat, lng } = position;

      const reverseResult = await reverseGeocode(lat, lng);

      if (!reverseResult) {
        toast.error('Nie udało się pobrać adresu dla Twojej lokalizacji');
        setIsGeolocating(false);
        return;
      }

      const city = reverseResult.components.city || reverseResult.components.district || '';
      const address = reverseResult.address;
      const sublocalityLevel1 = reverseResult.components.sublocality_level_1 || '';

      if (!city) {
        toast.error('Nie udało się określić miasta dla Twojej lokalizacji');
        setIsGeolocating(false);
        return;
      }

      setSelectedLocation(city);
      setSelectedAddress(address);
      setInputValue(address);
      onLocationSelect(city, address, lat, lng, sublocalityLevel1 || undefined);
      
      toast.success('Użyto Twojej aktualnej lokalizacji');
    } catch (error: unknown) {
      const geolocationError = getGeolocationErrorDetails(error);
      console.error('Geolocation error:', {
        code: geolocationError.code,
        message: geolocationError.message,
        rawError: error,
      });

      if (geolocationError.code === 1) {
        toast.error('Dostęp do lokalizacji został odrzucony. Sprawdź ustawienia przeglądarki.');
      } else if (geolocationError.code === 2) {
        toast.error('Nie udało się określić lokalizacji. Sprawdź połączenie z internetem.');
      } else if (geolocationError.code === 3) {
        toast.error('Przekroczono limit czasu oczekiwania na lokalizację.');
      } else {
        toast.error(geolocationError.message);
      }
    } finally {
      setIsGeolocating(false);
    }
  };

  return (
    <div className="space-y-2 relative">
      <Label htmlFor="location-autocomplete">{label}</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
          <Input
            ref={inputRef}
            id="location-autocomplete"
            type="text"
            placeholder={placeholder}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            required={required}
            className="pl-10"
            disabled={isMounted && (isLoading || isGeolocating)}
            autoComplete="off"
          />
          {isMounted && isLoading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin z-10" />
          )}
          {isMounted && selectedLocation && !isLoading && (
            <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500 z-10" />
          )}
          {isMounted && showSuggestions && suggestions.length > 0 && !isLoading && (
            <ChevronDown className="absolute right-10 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
          )}

          {/* Suggestions dropdown */}
          {isMounted && showSuggestions && suggestions.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-auto"
            >
              {suggestions.map((suggestion, index) => {
                const prediction = suggestion.placePrediction;
                const mainText = prediction.structuredFormat?.mainText?.text || prediction.text.text;
                const secondaryText = prediction.structuredFormat?.secondaryText?.text;
                
                return (
                  <button
                    key={prediction.placeId}
                    type="button"
                    onClick={() => handlePlaceSelect(suggestion)}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
                      index === selectedIndex ? 'bg-gray-100' : ''
                    } ${index !== suggestions.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {mainText}
                        </div>
                        {secondaryText && (
                          <div className="text-xs text-gray-500 truncate">
                            {secondaryText}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleUseCurrentLocation}
          disabled={isMounted && (isGeolocating || isLoading)}
          className="shrink-0"
          title="Użyj mojej aktualnej lokalizacji"
        >
          {isMounted && isGeolocating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Crosshair className="h-4 w-4" />
          )}
        </Button>
      </div>
      {isMounted && selectedLocation && (
        <p className="text-sm text-gray-600 flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          <span>{selectedAddress}</span>
        </p>
      )}
    </div>
  );
}
