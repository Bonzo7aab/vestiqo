import type { FaqItem } from './support-pages';

export interface PilotPartner {
  name: string;
  detail: string;
}

export interface PilotAudience {
  title: string;
  forWhom: string;
  benefits: string[];
}

export const PILOT_JOIN_ANCHOR = 'dolacz';

export const pilotProgramContent = {
  title: 'Program Pilotażowy Vestiqo',
  description:
    'Dołącz do grona pierwszych zarządców nieruchomości oraz sprawdzonych wykonawców, którzy wspólnie z nami tworzą standard cyfrowych konkursów w Polsce.',
  intro:
    'Program pilotażowy Vestiqo powstał, aby w realnym środowisku dopracować narzędzie, które rozwiąże największe bolączki tradycyjnych konkursów ofert.',
  ctaLabel: 'Dołącz do pilotażu',
  goalsTitle: 'Cele programu pilotażowego',
  goals: [
    {
      title: 'Testowanie w realnych warunkach rynkowych',
      text: 'Weryfikacja całego cyklu — od wystawienia zapytania przez zarządcę, przez automatyczne zaciąganie parametrów z danych technicznych budynków, aż po złożenie oferty przez wykonawcę.',
    },
    {
      title: 'Redukcja pytań od wykonawców do zera',
      text: 'Sprawdzenie, czy generowany zakres danych technicznych eliminuje potrzebę ciągłych telefonów i doprecyzowywania zapytań przez firmy.',
    },
    {
      title: 'Maksymalne skrócenie czasu wystawiania konkursu',
      text: 'Dopracowanie interfejsu tak, aby przygotowanie pełnego zapytania ofertowego dla budynku zajmowało zarządcy mniej niż 2 minuty.',
    },
    {
      title: 'Bezpośredni wpływ na rozwój platformy',
      text: 'Wdrażanie usprawnień i dodatkowych funkcji na podstawie informacji zwrotnej od uczestników pilotażu.',
    },
  ],
  participantsTitle: 'Kto uczestniczy w pilotażu',
  managersTitle: 'Zarządcy i Wspólnoty',
  contractorsTitle: 'Wykonawcy',
  managers: [] as PilotPartner[],
  contractors: [] as PilotPartner[],
  recruitmentTitle: 'Twój rejon lub branża nie ma jeszcze pełnej reprezentacji?',
  recruitmentText:
    'Dołącz jako jeden z pierwszych partnerów w swoim obszarze i zyskaj darmowy dostęp oraz stałe warunki preferencyjne.',
  managersAudience: {
    title: 'Dla Zarządców i Administratorów Nieruchomości',
    forWhom:
      'Zarządcy, administratorzy oraz zarządy wspólnot i spółdzielni mieszkaniowych.',
    benefits: [
      'Bezpłatny dostęp do wszystkich funkcji platformy na cały czas trwania pilotażu.',
      'Osobiste wsparcie przy wprowadzaniu pierwszych wspólnot i budynków do systemu.',
      'Dostęp do modułu Paszportu Technicznego, który automatycznie uzupełnia szczegóły zapytań ofertowych.',
      'Stały, bezpośredni wpływ na kształt i rozwój funkcji systemu.',
    ],
  } satisfies PilotAudience,
  contractorsAudience: {
    title: 'Dla Wykonawców i Firm Serwisowo-Przeglądowych',
    forWhom:
      'Fachowcy i przedsiębiorstwa z uprawnieniami (gaz, komin, elektryka, budowlaniec, Ppoż.).',
    benefits: [
      'Dostęp do zweryfikowanych zapytań ofertowych bez żadnych opłat i prowizji.',
      'Zapytania zawierające kompletne dane techniczne obiektu — koniec z wycenianiem „w ciemno” lub ciągłymi wizjami lokalnymi.',
      'Wyróżniony status zweryfikowanego wykonawcy na platformie po oficjalnym starcie.',
    ],
  } satisfies PilotAudience,
  stepsTitle: 'Zasady i przebieg uczestnictwa',
  steps: [
    {
      title: 'Rejestracja na Vestiqo — około 2 minuty',
      description:
        'Zakładasz konto na oficjalnej stronie rejestracji, wybierając rolę zarządcy lub wykonawcy.',
    },
    {
      title: 'Konfiguracja i krótkie wdrożenie — 15 minut',
      description:
        'Pomagamy Ci wprowadzić pierwszy budynek lub skonfigurować profil wykonawcy oraz pokazujemy najszybszą ścieżkę obsługi.',
    },
    {
      title: 'Aktywne korzystanie — w trakcie pilotażu',
      description:
        'Wystawiasz realne zapytania ofertowe lub odpowiadasz na konkursy. Dzielisz się z nami swoją opinią: co działa intuicyjnie, a co warto usprawnić.',
    },
    {
      title: 'Gwarancja warunków specjalnych — po zakończeniu',
      description:
        'Jako współtwórca platformy otrzymujesz gwarancję preferencyjnych, stałych warunków współpracy po oficjalnym otwarciu serwisu.',
    },
  ],
  faqTitle: 'Najczęściej zadawane pytania',
  faqItems: [
    {
      id: 'pilot-faq-free',
      question: 'Dlaczego udział w pilotażu jest darmowy?',
      answer:
        'Pilotaż to etap wspólnego dopracowywania narzędzia. W zamian za Twój test i szczery feedback udostępniamy pełną funkcjonalność Vestiqo bez żadnych opłat.',
    },
    {
      id: 'pilot-faq-duration',
      question: 'Jak długo trwa program pilotażowy?',
      answer:
        'Pilotaż zaplanowany jest na czas przetestowania pełnych cykli konkursowych (szacunkowo od 2 do 3 miesięcy).',
    },
    {
      id: 'pilot-faq-data',
      question: 'Jak chronione są dane budynków i firmy?',
      answer:
        'Wszystkie dane przechowywane są na bezpiecznych, polskich serwerach zgodnie z wymogami RODO. Dane techniczne obiektów wykorzystywane są wyłącznie do celów przygotowania precyzyjnej wyceny wewnątrz platformy.',
    },
  ] satisfies FaqItem[],
  joinTitle: 'Dołącz do programu',
  joinIntro:
    'Zarejestruj się na oficjalnej stronie Vestiqo — to ta sama ścieżka, z której korzystają wszyscy użytkownicy. Po założeniu konta pomożemy Ci we wdrożeniu.',
} as const;
