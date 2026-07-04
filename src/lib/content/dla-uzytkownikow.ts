import { routes } from '../routes';

export const communitiesPageContent = {
  title: 'Dla Wspólnot i Spółdzielni Mieszkaniowych',
  description:
    'Transparentne konkursy ofert i przetargi remontowe dla zarządców nieruchomości, wspólnot i spółdzielni mieszkaniowych.',
  intro:
    'Wybór wykonawcy dużego remontu — od termomodernizacji po wymianę pionów — to ogromna odpowiedzialność przed mieszkańcami. Vestiqo to platforma dla zarządców nieruchomości, która wspiera zarządy wspólnot i rady nadzorcze spółdzielni w prowadzeniu transparentnych, bezpiecznych i szybkich konkursów ofert.',
  pillarsTitle: '3 filary bezpieczeństwa Twojej nieruchomości',
  pillarsIntro:
    'Procesy inwestycyjne w sektorze mieszkaniowym wymagają najwyższych standardów. Platforma Vestiqo została zaprojektowana tak, aby odpowiadać na unikalne wyzwania prawne i organizacyjne wielorodzinnych budynków.',
  pillars: [
    {
      title: '1. Absolutna transparentność',
      intro:
        'Zarządcy i zarządy wspólnot często mierzą się z nieufnością mieszkańców co do sposobu wyboru wykonawców.',
      text: 'Cały proces zbierania ofert jest w 100% cyfrowy i niezależny. Każda firma budowlana otrzymuje dostęp do tej samej dokumentacji technicznej, a system blokuje możliwość edycji stawek po wyznaczonym terminie.',
    },
    {
      title: '2. Ochrona funduszu remontowego',
      intro:
        'Dotarcie do wielu rzetelnych wykonawców na własną rękę bywa trudne, a ograniczona liczba ofert w przetargu prowadzi do przepłacania za robociznę.',
      text: 'Publikując konkurs na platformie, możesz łatwo udostępnić go swoim stałym wykonawcom, a nasz system dodatkowo zaprosi do udziału zweryfikowane firmy z rynku.',
    },
    {
      title: '3. Koniec z „porównywaniem nieporównywalnego”',
      intro:
        'Zmorą przy ocenie ofert jest analiza kosztorysów, z których każdy jest przygotowany w zupełnie innym formacie.',
      text: 'Tworząc konkurs, sam decydujesz, jakie kluczowe składowe chcesz porównać. Po zakończeniu konkursu system automatycznie generuje czytelne, jednolite zestawienie wszystkich stawek ramię w ramię.',
    },
  ],
  report: {
    title: 'Gotowy raport na zebranie mieszkańców lub rady',
    text: 'Po zamknięciu konkursu jednym kliknięciem generujesz oficjalny protokół z wyboru ofert — gotowy do wydruku, przedstawienia Radzie Wspólnoty lub podpięcia pod uchwałę właścicieli.',
  },
  stepsTitle: 'Jak zacząć? To prostsze niż myślisz',
  steps: [
    {
      title: 'Dodaj bezpłatny konkurs',
      description:
        'Opisujesz zakres prac i załączasz posiadaną dokumentację w dowolnym formacie (PDF, Excel, Word).',
    },
    {
      title: 'Skonfiguruj formularz wymagań',
      description:
        'Wskaż systemowi, jakie kluczowe parametry i etapy cenowe wykonawca musi uzupełnić na platformie.',
    },
    {
      title: 'Wybieraj z pewnością',
      description:
        'Zaproś swoje sprawdzone ekipy lub pozwól nam dostarczyć dodatkowe oferty z rynku. Podejmij decyzję w oparciu o twarde dane.',
    },
  ],
  cta: {
    label: 'Utwórz darmowy konkurs dla swojej nieruchomości',
    href: routes.wyborTypuKonkursu,
  },
};

export const contractorsPageContent = {
  title: 'Dla Wykonawców i Firm',
  description:
    'Stabilne zlecenia B2B i przetargi remontowe od wypłacalnych partnerów: wspólnot, spółdzielni i zarządców nieruchomości.',
  intro:
    'Szukasz stabilnych, dobrze przygotowanych zleceń B2B od wypłacalnych partnerów? Vestiqo łączy rzetelne firmy budowlane i usługowe ze spółdzielniami, wspólnotami mieszkaniowymi oraz zarządcami. Otrzymujesz zapytania ofertowe dopasowane do Twojej specjalizacji i regionu działania.',
  reasonsTitle: 'Trzy powody, dla których warto tu być',
  reasons: [
    {
      title: 'Zlecenia z zabezpieczonym budżetem',
      text: 'Wspólnoty i spółdzielnie realizują remonty w oparciu o zatwierdzone plany gospodarcze i zabezpieczone fundusze remontowe. Masz pewność, że inwestycja ma realne finansowanie.',
    },
    {
      title: 'Pełny wgląd w dokumentację i prosta wycena',
      text: 'Dokumentacja techniczna i wymagania zarządcy są w pełni otwarte od razu — bez konieczności zakładania konta w ciemno. Uzupełniasz gotowy formularz wyceny i dorzucasz kosztorys jako PDF.',
    },
    {
      title: 'Równe szanse i uczciwa konkurencja',
      text: 'Eliminujemy mechanizm wybierania „znajomych firm”. Proces zbierania ofert jest w 100% cyfrowy, a Twoje stawki są bezpieczne do momentu zamknięcia konkursu.',
    },
  ],
  stepsTitle: 'Jak automatycznie otrzymywać zlecenia?',
  steps: [
    {
      title: 'Przeglądasz i wyceniasz',
      description:
        'Wchodzisz w interesujący Cię konkurs i analizujesz otwarte dokumenty.',
    },
    {
      title: 'Szybka weryfikacja przez NIP',
      description:
        'System pobiera dane z CEIDG/KRS po podaniu NIP-u, potwierdzając status Twojej firmy.',
    },
    {
      title: 'Odbierasz alerty na e-mail',
      description:
        'Gdy w wybranym regionie pojawi się nowy konkurs pasujący do Twojej specjalizacji, natychmiast dostaniesz powiadomienie.',
    },
  ],
  cta: {
    label: 'Zarejestruj firmę i odbieraj zlecenia B2B',
    href: routes.rejestracja,
  },
};

export const serviceCategoriesIntro =
  'Przeglądaj pełną strukturę kategorii usług remontowo-budowlanych realizowanych w zasobach wspólnot i spółdzielni mieszkaniowych. Wybierz interesującą Cię specjalizację, aby przejść bezpośrednio do aktualnych, otwartych konkursów ofert.';
