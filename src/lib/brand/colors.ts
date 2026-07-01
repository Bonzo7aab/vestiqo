/**
 * Vestiqo brand colors from OPD-26 (Jira).
 * Source: https://sadurski.atlassian.net/browse/OPD-26
 *
 * Usage:
 * - UI components: prefer Tailwind tokens (`bg-primary`, `text-brand-navy`) backed by CSS vars
 * - JS/inline styles: import `BRAND_COLORS` hex values or `readThemeColors()` for runtime
 * - CSS authoring: palette slots in `globals.css` (--palette-1 … --palette-5)
 */

import { DEFAULT_PALETTE_HEX, hexToHslComponents } from '../theme/palette';

/** OPD-26 semantic color tokens (hex) — synced with default palette slots. */
export const BRAND_COLORS = {
  /** Headings, titles, authority elements */
  navy: DEFAULT_PALETTE_HEX.headings,
  /** CTA buttons, links, active toggles, notification dots */
  cta: DEFAULT_PALETTE_HEX.cta,
  /** Logo mark (asset-specific; slightly deeper than CTA) */
  logo: '#1D4ED8',
  /** Main platform background (same as footer `bg-muted`) */
  background: DEFAULT_PALETTE_HEX.background,
  /** Elevated surfaces — cards, panels, secondary buttons */
  surface: DEFAULT_PALETTE_HEX.surface,
  /** Highlighted sections, tiles */
  section: DEFAULT_PALETTE_HEX.background,
  /** New/unread notification highlight */
  unread: DEFAULT_PALETTE_HEX.accent,
  /** Body copy — not pure black */
  textBody: '#334155',
  /** Placeholders, helper text */
  textMuted: '#64748B',
  /** Validation errors, rejected states */
  error: '#DC2626',
} as const;

/**
 * HSL components for CSS custom properties (`hsl(var(--primary))` pattern).
 * Format: "H S% L%" without the hsl() wrapper.
 */
export const BRAND_COLORS_HSL = {
  navy: hexToHslComponents(BRAND_COLORS.navy),
  cta: hexToHslComponents(BRAND_COLORS.cta),
  background: hexToHslComponents(BRAND_COLORS.background),
  surface: hexToHslComponents(BRAND_COLORS.surface),
  section: hexToHslComponents(BRAND_COLORS.section),
  unread: hexToHslComponents(BRAND_COLORS.unread),
  textBody: '215 19% 35%',
  textMuted: '215 16% 47%',
  error: '0 72% 51%',
  white: '0 0% 100%',
} as const;

export type BrandColorKey = keyof typeof BRAND_COLORS;
