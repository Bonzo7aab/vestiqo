export const googleMapsConfig = {
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  libraries: ['places', 'geometry', 'marker'] as const,
  language: 'pl',
  region: 'PL',
};

export const mapOptions = {
  zoom: 11, // District-level view
  center: { lat: 52.1394, lng: 21.0458 }, // Ursynów, Warsaw
  mapTypeControl: true,
  streetViewControl: false,
  fullscreenControl: false,
  zoomControl: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ]
};

// Utility function to lighten a hex color by 2 shades
export const lightenColor = (hex: string, percent: number = 30): string => {
  // Remove # if present
  const color = hex.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  
  // Lighten by increasing RGB values
  const lighten = (value: number) => Math.min(255, Math.round(value + (255 - value) * (percent / 100)));
  
  const newR = lighten(r);
  const newG = lighten(g);
  const newB = lighten(b);
  
  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

// Marker colors - Priority determines background, job type determines icon
export const markerColors = {
  // Priority background colors
  priority: {
    low: '#10b981', // emerald-500 - green background
    medium: '#3b82f6', // blue-500 - blue background
    high: '#ef4444', // red-500 - red background
  },
  // Job type icon colors
  job: {
    glyphColor: '#3b82f6', // blue icon color for jobs
  },
  tender: {
    glyphColor: '#f97316', // orange icon color for tenders
  },
  // Selected state
  selected: {
    background: '#3b82f6', // blue-500 - blue for selected state
    borderColor: '#3b82f6', // Same as background (no visible border)
    glyphColor: '#ffffff',
  },
  // Legacy support
  default: {
    background: '#3b82f6', // blue
    borderColor: '#ffffff',
    glyphColor: '#ffffff',
  },
  urgent: {
    background: '#dc2626', // dark red
    borderColor: '#ffffff',
    glyphColor: '#ffffff',
  },
};

// SVG glyph cache - cache SVG elements by postType + backgroundColor combination
const glyphCache = new Map<string, SVGSVGElement>();

// Helper function to clone SVG element (required for reuse)
const cloneSVG = (svg: SVGSVGElement): SVGSVGElement => {
  return svg.cloneNode(true) as SVGSVGElement;
};

function appendMarkerStrokePath(
  svg: SVGSVGElement,
  d: string,
  backgroundColor: string,
  strokeWidth = '2',
): void {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', '#ffffff');
  path.setAttribute('stroke', backgroundColor);
  path.setAttribute('stroke-width', strokeWidth);
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);
}

/** Lucide FileSearch — fallback contest marker glyph. */
function appendFileSearchGlyph(svg: SVGSVGElement, strokeColor: string): void {
  appendMarkerStrokePath(svg, 'M14 2v4a2 2 0 0 0 2 2h4', strokeColor);
  appendMarkerStrokePath(
    svg,
    'M4.268 21a2 2 0 0 0 1.727 1H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 .268 1Z',
    strokeColor,
  );
  appendMarkerStrokePath(svg, 'm9 13-2.5 2.5', strokeColor);
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', '11.5');
  circle.setAttribute('cy', '11.5');
  circle.setAttribute('r', '2.5');
  circle.setAttribute('fill', '#ffffff');
  circle.setAttribute('stroke', strokeColor);
  circle.setAttribute('stroke-width', '2');
  svg.appendChild(circle);
}

type CategoryGlyphSlug =
  | 'roboty-budowlane-remonty'
  | 'sprzatanie-utrzymanie-czystosci'
  | 'zielen-tereny-zewnetrzne'
  | 'instalacje-systemy-techniczne'
  | 'przeglady-obsługa-techniczna'
  | 'ekspertyzy-projekty';

/** OPD-105: Lucide category icons for map markers. */
function appendCategoryGlyph(
  svg: SVGSVGElement,
  categorySlug: CategoryGlyphSlug,
  strokeColor: string,
): void {
  switch (categorySlug) {
    case 'roboty-budowlane-remonty':
      appendMarkerStrokePath(
        svg,
        'm15 12-8.373 8.373a1 1 0 1 1-3-3L12 9',
        strokeColor,
      );
      appendMarkerStrokePath(svg, 'm18 15 4-4', strokeColor);
      appendMarkerStrokePath(
        svg,
        'm21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26A6 6 0 0 0 6.24 8.24l-1.52 1.52A2 2 0 0 0 4 11.172V12a2 2 0 0 0 2 2h1',
        strokeColor,
      );
      break;
    case 'sprzatanie-utrzymanie-czystosci':
      appendMarkerStrokePath(svg, 'm16 22-1-4', strokeColor);
      appendMarkerStrokePath(
        svg,
        'M19 13.99a1 1 0 0 0 1-1V12a2 2 0 0 0-2-2h-3a1 1 0 0 1-1-1V4a2 2 0 0 0-4 0v5a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2v.99a1 1 0 0 0 1 1',
        strokeColor,
      );
      appendMarkerStrokePath(
        svg,
        'M5 14h14l1.973 6.767A1 1 0 0 1 20 22H4a1 1 0 0 1-.973-1.233z',
        strokeColor,
      );
      appendMarkerStrokePath(svg, 'm8 22 1-4', strokeColor);
      break;
    case 'zielen-tereny-zewnetrzne':
      appendMarkerStrokePath(
        svg,
        'm17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z',
        strokeColor,
      );
      break;
    case 'instalacje-systemy-techniczne':
      appendMarkerStrokePath(
        svg,
        'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z',
        strokeColor,
      );
      break;
    case 'przeglady-obsługa-techniczna':
      appendMarkerStrokePath(
        svg,
        'M11 2v2',
        strokeColor,
      );
      appendMarkerStrokePath(svg, 'M5 2v2', strokeColor);
      appendMarkerStrokePath(
        svg,
        'M5 3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-1',
        strokeColor,
      );
      appendMarkerStrokePath(svg, 'M3 9h18', strokeColor);
      appendMarkerStrokePath(svg, 'm9 16 2 2 4-4', strokeColor);
      break;
    case 'ekspertyzy-projekty':
      appendMarkerStrokePath(
        svg,
        'm16.24 7.76 1.804 5.411a2 2 0 0 1-1.265 2.507l-3.776 1.257a2 2 0 0 1-2.507-1.265L7.76 9.24a2 2 0 0 1 1.265-2.507l3.776-1.257a2 2 0 0 1 2.507 1.265z',
        strokeColor,
      );
      appendMarkerStrokePath(svg, 'm7.5 7.5 9 9', strokeColor);
      appendMarkerStrokePath(svg, 'M12 2v2', strokeColor);
      appendMarkerStrokePath(svg, 'M19 9h2', strokeColor);
      appendMarkerStrokePath(svg, 'M5 15H3', strokeColor);
      appendMarkerStrokePath(svg, 'M9 19v2', strokeColor);
      break;
    default:
      appendFileSearchGlyph(svg, strokeColor);
  }
}

function isCategoryGlyphSlug(slug: string): slug is CategoryGlyphSlug {
  return (
    slug === 'roboty-budowlane-remonty' ||
    slug === 'sprzatanie-utrzymanie-czystosci' ||
    slug === 'zielen-tereny-zewnetrzne' ||
    slug === 'instalacje-systemy-techniczne' ||
    slug === 'przeglady-obsługa-techniczna' ||
    slug === 'ekspertyzy-projekty'
  );
}

export function getContestMarkerIconSvg(strokeColor: string, size = 14): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M4.268 21a2 2 0 0 0 1.727 1H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 .268 1Z"/><path d="m9 13-2.5 2.5"/><circle cx="11.5" cy="11.5" r="2.5"/></svg>`;
}

// Marker glyphs/icons for job types
// Returns SVG element for use in Google Maps PinElement glyph
export const createMarkerGlyph = (
  postType: 'job' | 'contest',
  glyphColor: string,
  categorySlug?: string,
): SVGSVGElement => {
  const cacheKey = `${postType}-${glyphColor}-${categorySlug ?? 'none'}`;

  const cached = glyphCache.get(cacheKey);
  if (cached) {
    return cloneSVG(cached);
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.style.width = '18px';
  svg.style.height = '18px';
  svg.style.display = 'block';

  if (categorySlug && isCategoryGlyphSlug(categorySlug)) {
    appendCategoryGlyph(svg, categorySlug, glyphColor);
  } else {
    appendFileSearchGlyph(svg, glyphColor);
  }

  glyphCache.set(cacheKey, svg);

  return cloneSVG(svg);
};
