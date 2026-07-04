import { mapOptions } from './config';

const HIDDEN_MAP_FEATURE_KEYS = [
  'POI',
  'POI_ATTRACTION',
  'POI_BUSINESS',
  'POI_GOVERNMENT',
  'POI_MEDICAL',
  'POI_PARK',
  'POI_PLACE_OF_WORSHIP',
  'POI_SCHOOL',
  'POI_SPORTS_COMPLEX',
  'TRANSIT',
] as const;

/** Hide Google default POIs/transit so only Domio listing markers remain visible. */
export function suppressNonDomioMapFeatures(map: google.maps.Map): void {
  map.setOptions({
    clickableIcons: false,
    styles: mapOptions.styles,
  });

  // Vector maps (mapId) — hide each POI layer explicitly; generic POI alone may leave pins visible.
  const mapsApi = google.maps as typeof google.maps & {
    FeatureType?: Record<string, google.maps.FeatureType>;
    FeatureDisplay?: Record<string, string>;
  };

  const hiddenDisplay = mapsApi.FeatureDisplay?.NONE ?? 'none';
  const hideStyle = (): google.maps.FeatureStyleOptions =>
    ({ display: hiddenDisplay }) as google.maps.FeatureStyleOptions;

  for (const key of HIDDEN_MAP_FEATURE_KEYS) {
    const featureType = mapsApi.FeatureType?.[key];
    if (featureType == null) {
      continue;
    }

    try {
      const layer = map.getFeatureLayer(featureType);
      layer.style = hideStyle;
    } catch {
      // Feature layers require a compatible vector map — JSON styles are the raster fallback.
    }
  }
}
