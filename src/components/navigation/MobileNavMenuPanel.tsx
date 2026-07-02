'use client';

import type { LucideIcon } from 'lucide-react';
import { BrandLogo } from '../BrandLogo';
import { PanelMenuItemButton } from './PanelMenuItemButton';

export interface MobileNavMenuItem {
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick: () => void;
}

interface MobileNavMenuPanelProps {
  title?: string;
  subtitle?: string;
  items: MobileNavMenuItem[];
  isItemActive?: (item: MobileNavMenuItem) => boolean;
}

export function MobileNavMenuPanel({
  title = 'Menu',
  subtitle = 'Nawiguj po platformie Vestiqo',
  items,
  isItemActive,
}: MobileNavMenuPanelProps) {
  return (
    <div className="flex flex-col overflow-hidden">
      <div className="border-b border-border/70 bg-gradient-to-br from-primary/10 via-card to-muted/25 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20 shadow-sm">
            <BrandLogo variant="mark" className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight text-foreground">{title}</p>
            {subtitle ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-1 bg-card p-2 pb-4">
        {items.map((item) => (
          <PanelMenuItemButton
            key={item.label}
            label={item.label}
            icon={item.icon}
            onClick={item.onClick}
            isActive={isItemActive?.(item) ?? false}
          />
        ))}
      </div>
    </div>
  );
}
