'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CircleHelp,
  Mail,
  UserPlus,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { routes } from '../../lib/routes';
import { MarketingStagger, MarketingStaggerItem } from './MarketingReveal';

interface UsefulLink {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const USEFUL_LINKS: UsefulLink[] = [
  {
    href: routes.dlaWspolnot,
    title: 'Dla Wspólnot i Spółdzielni',
    description: 'Jak wygląda konkurs ofert na Vestiqo',
    icon: Building2,
  },
  {
    href: routes.dlaWykonawcow,
    title: 'Dla Wykonawców',
    description: 'Zlecenia B2B bez zgadywania',
    icon: Wrench,
  },
  {
    href: routes.faq,
    title: 'FAQ platformy',
    description: 'Najczęstsze pytania o Vestiqo',
    icon: CircleHelp,
  },
  {
    href: routes.rejestracja,
    title: 'Rejestracja',
    description: 'Załóż konto i dołącz do pilotażu',
    icon: UserPlus,
  },
  {
    href: routes.kontakt,
    title: 'Kontakt',
    description: 'Napisz do zespołu Vestiqo',
    icon: Mail,
  },
];

export function PilotUsefulLinks() {
  return (
    <MarketingStagger className="grid gap-3 sm:grid-cols-2">
      {USEFUL_LINKS.map((link) => {
        const Icon = link.icon;
        return (
          <MarketingStaggerItem key={link.href} className="h-full" hoverLift>
            <Link
              href={link.href}
              className="group flex h-full items-start gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/[0.03] hover:shadow-md"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-brand-navy">
                  {link.title}
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">
                  {link.description}
                </span>
              </span>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          </MarketingStaggerItem>
        );
      })}
    </MarketingStagger>
  );
}
