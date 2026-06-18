import { BRAND_COLORS } from './brand/colors';

export { BRAND_COLORS, BRAND_COLORS_HSL } from './brand/colors';
export type { BrandColorKey } from './brand/colors';

export const BRAND = {
  name: 'Vestiqo',
  logoPath: '/brand/vestiqo-logo.svg',
  logoPathPng: '/brand/vestiqo-logo.png',
  markPath: '/brand/vestiqo-mark.svg',
  color: BRAND_COLORS.logo,
} as const;
