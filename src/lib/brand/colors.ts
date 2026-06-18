/**
 * Vestiqo brand colors from OPD-26 (Jira).
 * Source: https://sadurski.atlassian.net/browse/OPD-26
 *
 * Usage:
 * - UI components: prefer Tailwind tokens (`bg-primary`, `text-brand-navy`) backed by CSS vars
 * - JS/inline styles: import `BRAND_COLORS` hex values
 * - CSS authoring: use `BRAND_COLORS_HSL` values in `globals.css`
 */

/** OPD-26 semantic color tokens (hex). */
export const BRAND_COLORS = {
  /** Headings, titles, authority elements */
  navy: '#0F172A',
  /** CTA buttons, links, active toggles, notification dots */
  cta: '#2563EB',
  /** Logo mark (asset-specific; slightly deeper than CTA) */
  logo: '#1D4ED8',
  /** Main platform background */
  background: '#FFFFFF',
  /** Highlighted sections, tiles */
  section: '#F8FAFC',
  /** New/unread notification highlight */
  unread: '#EFF6FF',
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
  navy: '222 47% 11%',
  cta: '217 91% 53%',
  background: '0 0% 100%',
  section: '210 40% 98%',
  unread: '214 100% 97%',
  textBody: '215 19% 35%',
  textMuted: '215 16% 47%',
  error: '0 72% 51%',
  white: '0 0% 100%',
} as const;

export type BrandColorKey = keyof typeof BRAND_COLORS;
