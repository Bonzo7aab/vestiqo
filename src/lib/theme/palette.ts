/**
 * Five-slot palette (Coolors-friendly) — single source for default brand colors.
 * Slots map to CSS custom properties --palette-1 … --palette-5.
 */

export const PALETTE_SLOTS = [
  'background',
  'headings',
  'cta',
  'surface',
  'accent',
] as const;

export type PaletteSlot = (typeof PALETTE_SLOTS)[number];

export const PALETTE_SLOT_LABELS: Record<PaletteSlot, string> = {
  background: 'Background',
  headings: 'Headings / text',
  cta: 'CTA / primary',
  surface: 'Surface / card',
  accent: 'Accent / highlight',
};

/** Default OPD-26 hex values (Coolors order: bg, headings, CTA, surface, accent). */
export const DEFAULT_PALETTE_HEX: Record<PaletteSlot, string> = {
  background: '#F8FAFC',
  headings: '#0F172A',
  cta: '#2563EB',
  surface: '#FFFFFF',
  accent: '#EFF6FF',
};

export const PALETTE_STORAGE_KEY = 'domio-dev-palette';

export const PALETTE_CHANGED_EVENT = 'domio:palette-changed';

/** CSS variable name for a palette slot (1-indexed). */
export function paletteVarName(slotIndex: number): string {
  return `--palette-${slotIndex}`;
}

export function slotToIndex(slot: PaletteSlot): number {
  return PALETTE_SLOTS.indexOf(slot) + 1;
}

/** Normalize user input to #RRGGBB (uppercase). */
export function normalizeHex(hex: string): string | null {
  const trimmed = hex.trim();
  const match = trimmed.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return null;

  let value = match[1];
  if (value.length === 3) {
    value = value
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return `#${value.toUpperCase()}`;
}

/** Convert #RRGGBB to "H S% L%" for shadcn CSS vars. */
export function hexToHslComponents(hex: string): string {
  const normalized = normalizeHex(hex);
  if (!normalized) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / delta + 2) * 60;
        break;
      default:
        h = ((r - g) / delta + 4) * 60;
        break;
    }
  }

  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Convert "H S% L%" to #RRGGBB. */
export function hslComponentsToHex(hsl: string): string {
  const match = hsl.trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!match) {
    throw new Error(`Invalid HSL components: ${hsl}`);
  }

  const h = Number(match[1]) / 360;
  const s = Number(match[2]) / 100;
  const l = Number(match[3]) / 100;

  const hue2rgb = (p: number, q: number, t: number): number => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  let r: number;
  let g: number;
  let b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (n: number) =>
    Math.round(n * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/** Parse Coolors paste: dash list, URL, or comma/space separated hex. */
export function parseCoolorsPaste(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const urlMatch = trimmed.match(/palette\/([0-9a-fA-F-]+)/i);
  const payload = (urlMatch?.[1] ?? trimmed).replace(/\s/g, '');

  if (/^[0-9a-fA-F]{3,6}(-[0-9a-fA-F]{3,6})+$/i.test(payload)) {
    return payload
      .split('-')
      .map((part) => normalizeHex(part))
      .filter((part): part is string => part !== null);
  }

  return trimmed
    .split(/[\s,]+/)
    .map((part) => normalizeHex(part))
    .filter((part): part is string => part !== null);
}
