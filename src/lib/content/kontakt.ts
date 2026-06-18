import { companyLegal } from './company-legal';

export const contactIntro =
  'Masz pytania dotyczące działania platformy? Potrzebujesz wsparcia przy konfiguracji pierwszego konkursu ofert, a może chcesz zgłosić niestandardowe zapytanie? Jesteśmy do Twojej dyspozycji. Wybierz najwygodniejszą dla siebie formę kontaktu.';

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
    email: companyLegal.emails.help,
    description: 'Wsparcie z kontem, plikami lub formularzem',
  },
  {
    label: 'Współpraca biznesowa i partnerstwa',
    email: companyLegal.emails.business,
    description: 'Duże spółdzielnie, zarządcy sieciowi i partnerzy komercyjni',
  },
];

export const contactSuccessMessage =
  'Dziękujemy za wiadomość! Nasz zespół odpowie na Twoje zapytanie w ciągu maksymalnie 24 godzin.';
