export type NewsCategory = 'Aktualności' | 'Dla Zarządców' | 'Dla Wykonawców';

export interface NewsArticle {
  slug: string;
  category: NewsCategory;
  title: string;
  excerpt: string;
  body: string[];
}

export const newsIntro =
  'Bądź na bieżąco z rozwojem platformy Vestiqo oraz nowoczesnymi trendami w zarządzaniu zamówieniami na rynku nieruchomości. Znajdziesz tu oficjalne komunikaty, porady techniczne oraz przewodniki dla zarządców i wykonawców.';

export const newsArticles: NewsArticle[] = [
  {
    slug: 'vestiqo-oficjalnie-startuje',
    category: 'Aktualności',
    title: 'Cyfrowa rewolucja w przetargach nieruchomości – platforma Vestiqo oficjalnie startuje!',
    excerpt:
      'Z dumą ogłaszamy oficjalny start platformy Vestiqo: nowoczesnego systemu B2B dla konkursów ofert w nieruchomościach.',
    body: [
      'Rynek zarządzania nieruchomościami w Polsce od lat mierzy się z brakiem czasu, ogromną odpowiedzialnością prawną oraz archaicznymi metodami komunikacji. Tradycyjne zbieranie ofert oparte na setkach chaotycznych wiadomości e-mail właśnie odchodzi do przeszłości.',
      'Vestiqo to dedykowana infrastruktura technologiczna stworzona z myślą o unikalnych realiach rynku wielorodzinnych budynków mieszkalnych. Zarządcy otrzymują intuicyjny panel do uruchamiania transparentnych konkursów, a wykonawcy — otwarty dostęp do pełnej dokumentacji technicznej.',
      'Naszym celem jest eliminacja barier technologicznych i zbędnej papierologii w sektorze nieruchomości. Oficjalnie otwieramy rejestrację i zapraszamy do bezpłatnego przetestowania systemu.',
    ],
  },
  {
    slug: 'idealny-konkurs-ofert-dla-zarzadcow',
    category: 'Dla Zarządców',
    title: 'Jak przygotować idealny konkurs ofert i uniknąć chaosu w wycenach?',
    excerpt:
      'Przewodnik dla zarządców nieruchomości: 3 zasady idealnego konkursu ofert i automatyczne zestawienie ramię w ramię.',
    body: [
      'Każdy zarządca doskonale zna moment, gdy na skrzynkę spływa kilkanaście kosztorysów — każdy w innym formacie. Analiza takich danych zajmuje długie godziny, a końcowy wniosek przypomina „porównywanie nieporównywalnego”.',
      'Kluczem jest ustrukturyzowany format wymagań, który wdrażamy w Vestiqo: otwarta dokumentacja na start, definiowanie kluczowych składowych zamiast mikro-pozycji oraz automatyczne zestawienie ramię w ramię.',
      'Dzięki temu po zamknięciu naboru system jednym kliknięciem generuje gotowy raport z wszystkimi kluczowymi ofertami w jednolitej tabeli.',
    ],
  },
  {
    slug: 'zlecenia-b2b-dla-wykonawcow',
    category: 'Dla Wykonawców',
    title:
      'Zlecenia od wspólnot i spółdzielni mieszkaniowych. Jak skutecznie składać oferty i wygrywać kontrakty B2B?',
    excerpt:
      'Rynek zamówień dla wspólnot to stabilne źródło przychodów — wygrywa profesjonalizm formalny, nie najniższa cena.',
    body: [
      'Rynek zamówień realizowanych dla wspólnot mieszkaniowych to jedno z najbardziej stabilnych źródeł przychodów dla firm remontowo-budowlanych. Środki na inwestycje są zabezpieczone na kontach funduszów remontowych.',
      'We wspólnotach decyzję podejmuje rada nadzorcza lub mieszkańcy — kluczem jest profesjonalizm formalny i przejrzystość oferty, nie wyłącznie najniższa cena.',
      'Składając ofertę przez Vestiqo, eliminujesz ryzyko, że Twoja wycena zginie w gąszczu maili. Masz gwarancję, że o wygranej zadecydują twarde kompetencje i rzetelność.',
    ],
  },
];

export const newsCategoryStyles: Record<NewsCategory, string> = {
  Aktualności: 'bg-slate-100 text-slate-700',
  'Dla Zarządców': 'bg-blue-100 text-blue-800',
  'Dla Wykonawców': 'bg-emerald-100 text-emerald-800',
};
