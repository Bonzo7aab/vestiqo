import { companyLegal } from './company-legal';

export const contactIntro =
  'Masz pytania dotyczące działania platformy? Potrzebujesz wsparcia przy konfiguracji konkursu ofert lub złożeniu oferty jako wykonawca? Jesteśmy do Twojej dyspozycji — wybierz najwygodniejszą formę kontaktu.';

export const contactRoleOptions = [
  { value: 'manager', label: 'Zarządcą nieruchomości lub Zarządem Wspólnoty' },
  { value: 'contractor', label: 'Wykonawcą (Firmą)' },
  { value: 'member', label: 'Członkiem Wspólnoty lub Spółdzielni' },
  { value: 'other', label: 'Inne' },
] as const;

export type ContactRole = (typeof contactRoleOptions)[number]['value'];

export const contactDirectEmails = [
  {
    label: 'Ogólne pytania i pomoc techniczna',
    email: companyLegal.emails.contact,
    description: 'Wsparcie z kontem, plikami lub formularzem',
  },
];

export const contactSuccessMessage =
  'Dziękujemy za wiadomość! Nasz zespół odpowie na Twoje zapytanie w ciągu maksymalnie 24 godzin.';
