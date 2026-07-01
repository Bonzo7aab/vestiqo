import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import { FileText } from 'lucide-react';
import { getCategoryConfig } from '../../lib/config/categoryConfig';
import { cn } from '../ui/utils';

export function categoryColorMix(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

interface CategoryIconBadgeProps {
  slug: string;
  color?: string;
  icon?: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const BADGE_SIZES = {
  sm: { box: 'h-8 w-8 rounded-sm', icon: 'h-4 w-4' },
  md: { box: 'h-9 w-9 rounded-sm', icon: 'h-[1.125rem] w-[1.125rem]' },
  lg: { box: 'h-11 w-11 rounded-sm', icon: 'h-5 w-5' },
} as const;

export function CategoryIconBadge({
  slug,
  color,
  icon,
  size = 'md',
  className,
}: CategoryIconBadgeProps) {
  const config = getCategoryConfig(slug);
  const Icon = icon ?? config?.icon ?? FileText;
  const accentColor = color ?? config?.color ?? '#2563EB';
  const dimensions = BADGE_SIZES[size];

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center border border-border/50',
        dimensions.box,
        className,
      )}
      style={{ backgroundColor: categoryColorMix(accentColor, 10) }}
      aria-hidden
    >
      <Icon className={dimensions.icon} strokeWidth={2.25} style={{ color: accentColor }} />
    </span>
  );
}

interface CategoryAccentStyle {
  borderColor: string;
  iconBg: string;
  iconColor: string;
  selectedBg: string;
  countBg: string;
  countColor: string;
}

export function getCategoryAccentStyle(color: string, isSelected: boolean): CategoryAccentStyle {
  return {
    borderColor: isSelected ? categoryColorMix(color, 55) : categoryColorMix(color, 18),
    iconBg: categoryColorMix(color, isSelected ? 14 : 10),
    iconColor: color,
    selectedBg: isSelected ? categoryColorMix(color, 6) : 'transparent',
    countBg: isSelected ? categoryColorMix(color, 14) : 'hsl(var(--muted))',
    countColor: isSelected ? color : 'hsl(var(--muted-foreground))',
  };
}

export function categoryAccentBarStyle(color: string, visible: boolean): CSSProperties {
  return {
    backgroundColor: visible ? color : 'transparent',
  };
}

export const subcategoryTagBase =
  'inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-all duration-150';

export const subcategoryTagRest =
  'border-border/80 bg-background text-foreground hover:border-primary/35 hover:bg-primary/5 hover:text-primary';

export const subcategoryTagSelected =
  'border-primary/40 bg-primary/8 text-primary shadow-sm';
