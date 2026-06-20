import { routes } from './routes';

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export const footerColumns: FooterColumn[] = [
  {
    title: 'Vestiqo',
    links: [
      { label: 'O nas', href: routes.oNas },
      { label: 'Kontakt', href: routes.kontakt },
    ],
  },
  {
    title: 'Dla użytkowników',
    links: [
      { label: 'Kategorie usług', href: routes.kategorieUslug },
      {
        label: 'Dla Wspólnot i Spółdzielni Mieszkaniowych',
        href: routes.dlaWspolnot,
      },
      { label: 'Dla Wykonawców i Firm', href: routes.dlaWykonawcow },
    ],
  },
  {
    title: 'Wsparcie',
    links: [
      { label: 'Najczęściej zadawane pytania', href: routes.faq },
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

export const footerTagline =
  'Vestiqo – Profesjonalna platforma do zarządzania konkursami w nieruchomościach.';
