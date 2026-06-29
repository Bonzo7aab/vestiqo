'use client';

import React from 'react';
import { FileText } from 'lucide-react';
import { getCategoryIcon } from '../../lib/config/categoryConfig';
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
  iconClassName = 'h-6 w-6',
}: CategoryIconTileProps): React.ReactElement {
  const iconType = categorySlug ? getCategoryIcon(categorySlug) : FileText;

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card',
        className ?? 'h-12 w-12',
      )}
      aria-hidden
    >
      {React.createElement(iconType, { className: iconClassName, style: { color } })}
    </div>
  );
}
