'use client';

import React from 'react';
import Link from 'next/link';
import { BrandLogo } from './BrandLogo';
import { footerBrandLinks, footerColumns } from '../lib/footer-links';

const linkClassName =
  'text-xs leading-tight text-muted-foreground hover:text-foreground transition-colors text-left';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-8 lg:grid-cols-4">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-brand-navy">Vestiqo</h3>
            <ul className="space-y-1.5">
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
            <div key={column.title} className="space-y-3">
              <h3 className="text-sm font-semibold text-brand-navy">
                {column.title}
              </h3>

              <ul className="space-y-1.5">
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

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 border-t border-border pt-6 md:justify-start">
          <Link href="/" className="inline-flex" aria-label="Vestiqo — strona główna">
            <BrandLogo variant="full" className="h-6 w-auto" />
          </Link>
          <span className="text-muted-foreground/60" aria-hidden>
            |
          </span>
          <p className="text-xs text-muted-foreground">© {year} Vestiqo</p>
        </div>
      </div>
    </footer>
  );
}
