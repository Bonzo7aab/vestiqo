export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const faqIntro =
  'Masz pytania dotyczące działania platformy Vestiqo? W tym FAQ znajdziesz odpowiedzi na najważniejsze kwestie techniczne, prawne i organizacyjne dla zarządców nieruchomości oraz wykonawców.';

export const faqManagerItems: FaqItem[] = [
  {
    id: 'faq-q1',
    question:
      'Czy korzystanie z platformy Vestiqo jest płatne dla zarządców nieruchomości?',
    answer:
      'Nie. Publikowanie konkursów ofert, załączanie dokumentacji technicznej, przedmiarów oraz generowanie raportu z podsumowaniem konkursu jest dla spółdzielni, wspólnot i zarządców nieruchomości bezpłatne.',
  },
  {
    id: 'faq-q2',
    question:
      'Jak platforma chroni zarząd przed zarzutami o brak transparentności?',
    answer:
      'Cały proces konkursowy odbywa się w 100% cyfrowo i niezależnie. System rejestruje czas wpłynięcia każdej oferty i blokuje modyfikacje po przesłaniu. Wszystkie dokumenty są archiwizowane, tworząc nienaruszalny ślad rewizyjny.',
  },
  {
    id: 'faq-q3',
    question:
      'W jaki sposób system pomaga porównać oferty z różnych firm wykonawczych?',
    answer:
      'Zarządca określa kluczowe składowe do porównania. Wykonawcy wprowadzają wyceny w dedykowane pola, a system generuje jednolite zestawienie wszystkich stawek ramię w ramię.',
  },
];

export const faqContractorItems: FaqItem[] = [
  {
    id: 'faq-q4',
    question:
      'Jakie kryteria musi spełnić moja firma, aby dołączyć do platformy?',
    answer:
      'Stawiamy na rzetelność. Podczas rejestracji system weryfikuje status prawny Twojej firmy w rejestrach CEIDG/KRS na podstawie numeru NIP.',
  },
  {
    id: 'faq-q5',
    question:
      'Czy opisy zamówień i przedmiary robót są publicznie widoczne dla każdego?',
    answer:
      'Tak. Cała dokumentacja techniczna jest widoczna od razu, bez konieczności zakładania konta. Dopiero przy wysyłce oferty system poprosi o zalogowanie lub podanie NIP-u.',
  },
  {
    id: 'faq-q6',
    question: 'W jaki sposób dowiem się o nowym konkursie w mojej okolicy?',
    answer:
      'Podczas rejestracji system dopasuje kody PKD do kategorii usług. Gdy pojawi się nowy konkurs pasujący do Twojej specjalizacji i regionu, wyślemy powiadomienie z linkiem.',
  },
];

export const managerHelpIntro =
  'Dowiedz się, jak krok po kroku maksymalnie wykorzystać możliwości platformy Vestiqo, aby skrócić czas wyboru wykonawcy, zachowując przy tym pełną transparentność.';

export const managerHelpSteps = [
  {
    title: 'Krok 1: Dodanie zapytania i dokumentacji',
    description:
      'Wybierz kategorię usług i opisz planowane prace. Wgraj specyfikację, zdjęcia lub przedmiar w dowolnym formacie (PDF, Excel, Word).',
  },
  {
    title: 'Krok 2: Elastyczne zapraszanie wykonawców',
    description:
      'System generuje unikalny link do konkursu. Prześlij go stałym wykonawcom — dodatkowo zaprosimy zweryfikowane firmy z rynku.',
  },
  {
    title: 'Krok 3: Szybki i bezpieczny nabór ofert',
    description:
      'Firmy analizują dokumentację i uzupełniają wycenę. System weryfikuje podmiot przez rejestrację, gwarantując oferty od realnych firm.',
  },
  {
    title: 'Krok 4: Protokół i gotowe podsumowanie',
    description:
      'Wszystkie oferty trafiają do jednego widoku porównawczego. Jednym kliknięciem generujesz protokół z wyboru ofert (PDF).',
  },
];

export const managerSecurityStandards = [
  'Weryfikacja podmiotów: każda firma przechodzi automatyczną weryfikację statusu działalności przez integrację z bazami CEIDG oraz KRS.',
  'Nienaruszalny ślad rewizyjny: każda akcja — od publikacji po złożenie oferty — jest logowana w systemie ze stemplem czasowym.',
];

export const contractorHelpIntro =
  'Dowiedz się, jak krok po kroku budować pozycję swojej firmy na platformie Vestiqo, zdobywać zlecenia od spółdzielni oraz wspólnot mieszkaniowych i precyzyjnie wyceniać oferty bez marnowania czasu.';

export const contractorHelpSteps = [
  {
    title: 'Krok 1: Otwarty dostęp do dokumentacji',
    description:
      'Po kliknięciu w link do konkursu otrzymujesz pełny wgląd w opisy prac, wymagania i pliki techniczne — bez barier technologicznych.',
  },
  {
    title: 'Krok 2: Powiadomienia idealnie dopasowane do Ciebie',
    description:
      'System dopasuje kody PKD do kategorii usług. Gdy w Twojej okolicy pojawi się nowe zlecenie, dostaniesz powiadomienie.',
  },
  {
    title: 'Krok 3: Szybkie wyjaśnianie wątpliwości',
    description:
      'Zadaj pytania bezpośrednio na karcie konkursu. Odpowiedź zarządcy eliminuje dodatkowe telefony i zapewnia komplet informacji.',
  },
  {
    title: 'Krok 4: Proste składanie ofert i szybka rejestracja',
    description:
      'Wycenę wprowadzasz w formularzu przygotowanym przez zarządcę. Logowanie na końcu to jedyna formalność przed wysłaniem oferty.',
  },
];

export const contractorHelpBenefits = [
  'Koniec z „pustymi” zapytaniami: trafiasz do decydentów z realnym budżetem i zatwierdzonym planem remontowym.',
  'Gwarancja uczciwości: proces jest w 100% cyfrowy — konkurencja nie zna Twoich stawek przed zamknięciem konkursu.',
];
