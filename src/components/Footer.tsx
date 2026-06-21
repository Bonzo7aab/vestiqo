'use client';

import React from 'react';
import Link from 'next/link';
import { BrandLogo } from './BrandLogo';
import { footerBrandLinks, footerColumns, footerTagline } from '../lib/footer-links';
import { cn } from './ui/utils';

const linkClassName =
  'text-sm text-muted-foreground hover:text-foreground transition-colors text-left';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-muted">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--brand-navy))]">Vestiqo</h3>
            <ul className="space-y-2.5">
              {footerBrandLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={linkClassName}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title} className="space-y-4">
              <h3 className="text-sm font-semibold text-[hsl(var(--brand-navy))]">
                {column.title}
              </h3>

              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className={linkClassName}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className={cn(
            'mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6',
            'md:flex-row md:items-center',
          )}
        >
          <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <Link href="/" className="inline-flex" aria-label="Vestiqo — strona główna">
              <BrandLogo variant="full" className="h-6 w-auto" />
            </Link>
            <span className="text-muted-foreground/60" aria-hidden>
              |
            </span>
            <p className="text-xs text-muted-foreground">© {year} Vestiqo</p>
          </div>
          <p className="text-center text-sm text-muted-foreground md:text-right">{footerTagline}</p>
        </div>
      </div>
    </footer>
  );
}
