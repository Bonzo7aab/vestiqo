import Link from 'next/link';
import {
  Building2,
  ClipboardCheck,
  FileWarning,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../ui/utils';

interface QuickAction {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

const actions: QuickAction[] = [
  {
    href: '/administracja/weryfikacja',
    label: 'Weryfikacja',
    description: 'Przeglądaj kolejkę weryfikacji kont i dokumentów użytkowników.',
    icon: ClipboardCheck,
  },
  {
    href: '/administracja/oferty',
    label: 'Oferty wykonawców',
    description: 'Moderuj aplikacje i oferty przetargowe zgłoszone przez wykonawców.',
    icon: FileWarning,
  },
  {
    href: '/administracja/ogloszenia',
    label: 'Zgłoszenia zarządców',
    description: 'Zarządzaj ogłoszeniami i przetargami opublikowanymi przez zarządców.',
    icon: Building2,
  },
  {
    href: '/administracja/ustawienia',
    label: 'Ustawienia',
    description: 'Konfiguruj rejestrację i wysyłaj komunikaty systemowe do użytkowników.',
    icon: Settings,
  },
];

export function AdminQuickActions() {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-brand-navy">Szybkie akcje</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Przejdź bezpośrednio do głównych obszarów moderacji platformy.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {actions.map(({ href, label, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'group flex gap-4 rounded-xl border border-border/60 bg-card p-5 shadow-sm',
              'transition-colors hover:border-primary/30 hover:bg-primary/[0.02]',
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <h3 className="font-semibold text-brand-navy group-hover:text-primary">{label}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
