import { routes } from '../routes';

export const cookiesPageContent = {
  title: 'Ustawienia plików cookie',
  description:
    'Informacje o plikach cookie wykorzystywanych w serwisie Vestiqo oraz możliwość zarządzania zgodami.',
  intro:
    'Pliki cookie to niewielkie pliki tekstowe zapisywane w Twojej przeglądarce. Służą m.in. do zapewnienia prawidłowego działania platformy, zapamiętania preferencji oraz — za Twoją zgodą — analizy ruchu na stronie.',
  categories: [
    {
      id: 'essential',
      name: 'Niezbędne',
      required: true,
      description:
        'Wymagane do logowania, bezpieczeństwa sesji i podstawowych funkcji platformy. Nie można ich wyłączyć.',
      examples: 'Uwierzytelnianie, preferencje sesji, zabezpieczenia CSRF.',
    },
    {
      id: 'functional',
      name: 'Funkcjonalne',
      required: false,
      description:
        'Pozwalają zapamiętać Twoje wybory (np. układ interfejsu) i poprawiają wygodę korzystania z serwisu.',
      examples: 'Zapamiętanie ustawień widoku, preferencji nawigacji.',
    },
    {
      id: 'analytics',
      name: 'Analityczne',
      required: false,
      description:
        'Pomagają nam zrozumieć, w jaki sposób użytkownicy korzystają z platformy, aby ją ulepszać. Dane są agregowane.',
      examples: 'Statystyki odwiedzin, popularność sekcji serwisu.',
    },
  ],
  manageHint:
    'Możesz w każdej chwili zmienić swoje preferencje dotyczące plików cookie funkcjonalnych i analitycznych.',
  privacyLink: routes.politykaPrywatnosci,
};
