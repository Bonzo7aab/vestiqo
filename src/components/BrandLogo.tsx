'use client';

import Image from 'next/image';
import { BRAND } from '../lib/brand';
import { cn } from './ui/utils';

interface BrandLogoProps {
  variant?: 'full' | 'mark';
  className?: string;
  onClick?: () => void;
}

export function BrandLogo({
  variant = 'full',
  className,
  onClick,
}: BrandLogoProps) {
  const src = variant === 'mark' ? BRAND.markPath : BRAND.logoPathPng;
  const width = variant === 'mark' ? 32 : 140;
  const height = 32;

  const image = (
    <Image
      src={src}
      alt={BRAND.name}
      width={width}
      height={height}
      className={cn(
        variant === 'full' ? 'h-8 w-auto' : 'h-8 w-8',
        onClick && 'cursor-pointer',
        className,
      )}
      priority={variant === 'full'}
      unoptimized
    />
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex shrink-0 items-center border-0 bg-transparent p-0"
        aria-label={`${BRAND.name} — strona główna`}
      >
        {image}
      </button>
    );
  }

  return image;
}
