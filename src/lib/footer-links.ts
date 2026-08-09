import { routes } from './routes';

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export const footerBrandLinks: FooterLink[] = [
  { label: 'O nas', href: routes.oNas },
  { label: 'Kontakt', href: routes.kontakt },
];

export const footerColumns: FooterColumn[] = [
  {
    title: 'Dla użytkowników',
    links: [
      { label: 'Kategorie usług', href: routes.kategorieUslug },
      {
        label: 'Wspólnoty i Spółdzielnie',
        href: routes.dlaWspolnot,
      },
      { label: 'Wykonawcy i Firmy', href: routes.dlaWykonawcow },
    ],
  },
  {
    title: 'Wsparcie',
    links: [
      { label: 'Najczęściej zadawane pytania', href: routes.faq },
      { label: 'Co nowego', href: routes.coNowego },
      { label: 'Pomoc dla Zarządców', href: routes.pomocDlaZarzadcow },
      { label: 'Pomoc dla Wykonawców', href: routes.pomocDlaWykonawcow },
    ],
  },
  {
    title: 'Informacje',
    links: [
      { label: 'Regulamin', href: routes.regulamin },
      { label: 'Polityka prywatności i RODO', href: routes.politykaPrywatnosci },
      { label: 'Ustawienia plików cookie', href: routes.ustawieniaPlikowCookie },
    ],
  },
];
