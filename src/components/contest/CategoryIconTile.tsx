'use client';

import React from 'react';
import { CategoryIconBadge } from '../categories/category-visual';
import { cn } from '../ui/utils';

interface CategoryIconTileProps {
  categorySlug?: string;
  color: string;
  className?: string;
  iconClassName?: string;
}

export function CategoryIconTile({
  categorySlug,
  color,
  className,
  iconClassName: _iconClassName,
}: CategoryIconTileProps): React.ReactElement {
  return (
    <CategoryIconBadge
      slug={categorySlug ?? ''}
      color={color}
      size="lg"
      className={cn(className ?? 'h-12 w-12')}
    />
  );
}
