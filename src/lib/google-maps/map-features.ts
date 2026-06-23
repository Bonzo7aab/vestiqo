import { mapOptions } from './config';

/** Hide Google default POIs/transit so only Domio listing markers remain visible. */
export function suppressNonDomioMapFeatures(map: google.maps.Map): void {
  map.setOptions({
    clickableIcons: false,
    styles: mapOptions.styles,
  });

  // Runtime API may expose POI layers even when @types/google.maps is outdated.
  const mapsApi = google.maps as typeof google.maps & {
    FeatureType?: Record<string, google.maps.FeatureType>;
    FeatureDisplay?: Record<string, string>;
  };

  const featureTypes = ['POI', 'TRANSIT']
    .map((key) => mapsApi.FeatureType?.[key])
    .filter((value): value is google.maps.FeatureType => value != null);

  const hiddenDisplay = mapsApi.FeatureDisplay?.NONE ?? 'none';

  for (const featureType of featureTypes) {
    try {
      const layer = map.getFeatureLayer(featureType);
      layer.style = () => ({ display: hiddenDisplay } as google.maps.FeatureStyleOptions);
    } catch {
      // Feature layers require a compatible vector map — JSON styles are the raster fallback.
    }
  }
}
