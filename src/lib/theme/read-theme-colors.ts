import { DEFAULT_PALETTE_HEX } from './palette';
import { hslComponentsToHex, normalizeHex } from './palette';

export interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  card: string;
  accent: string;
  brandNavy: string;
  border: string;
  destructive: string;
  success: string;
  white: string;
  mutedForeground: string;
}

const FALLBACKS: ThemeColors = {
  background: DEFAULT_PALETTE_HEX.background,
  foreground: '#334155',
  primary: DEFAULT_PALETTE_HEX.cta,
  card: DEFAULT_PALETTE_HEX.surface,
  accent: DEFAULT_PALETTE_HEX.accent,
  brandNavy: DEFAULT_PALETTE_HEX.headings,
  border: '#E2E8F0',
  destructive: '#DC2626',
  success: '#10B981',
  white: '#FFFFFF',
  mutedForeground: '#64748B',
};

function readHexVar(root: HTMLElement, hexName: string, hslName: string, fallback: string): string {
  const hex = root.style.getPropertyValue(hexName).trim()
    || getComputedStyle(root).getPropertyValue(hexName).trim();
  if (hex) {
    const normalized = normalizeHex(hex);
    if (normalized) return normalized;
  }

  const hsl = getComputedStyle(root).getPropertyValue(hslName).trim();
  if (hsl) {
    try {
      return hslComponentsToHex(hsl);
    } catch {
      // fall through
    }
  }

  return fallback;
}

/** Read current theme colors as hex — client-side only (maps, inline styles). */
export function readThemeColors(root: HTMLElement = document.documentElement): ThemeColors {
  if (typeof window === 'undefined') {
    return FALLBACKS;
  }

  return {
    background: readHexVar(root, '--background-hex', '--background', FALLBACKS.background),
    foreground: readHexVar(root, '--foreground-hex', '--foreground', FALLBACKS.foreground),
    primary: readHexVar(root, '--primary-hex', '--primary', FALLBACKS.primary),
    card: readHexVar(root, '--card-hex', '--card', FALLBACKS.card),
    accent: readHexVar(root, '--accent-hex', '--accent', FALLBACKS.accent),
    brandNavy: readHexVar(root, '--brand-navy-hex', '--brand-navy', FALLBACKS.brandNavy),
    border: readHexVar(root, '--border-hex', '--border', FALLBACKS.border),
    destructive: readHexVar(root, '--destructive-hex', '--destructive', FALLBACKS.destructive),
    success: readHexVar(root, '--success-hex', '--success', FALLBACKS.success),
    white: readHexVar(root, '--white-hex', '--primary-foreground', FALLBACKS.white),
    mutedForeground: readHexVar(root, '--muted-foreground-hex', '--muted-foreground', FALLBACKS.mutedForeground),
  };
}
