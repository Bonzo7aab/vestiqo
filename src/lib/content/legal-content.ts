import { companyLegal } from './company-legal';

export interface LegalSection {
  title: string;
  paragraphs?: string[];
  list?: string[];
  subsections?: LegalSection[];
}

const c = companyLegal;

export const regulaminSections: LegalSection[] = [
  {
    title: 'Preambuła',
    paragraphs: [
      `Niniejszy Regulamin określa zasady korzystania z platformy internetowej Vestiqo, dostępnej pod adresem ${c.siteUrl}, prowadzonej przez ${c.name} Platforma działa w modelu B2B i stanowi infrastrukturę technologiczną służącą do organizacji konkursów ofert na prace remontowo-budowlane oraz utrzymaniowe w nieruchomościach.`,
    ],
  },
  {
    title: '§ 1. Definicje',
    list: [
      `Operator / Usługodawca – ${c.name} z siedzibą w ${c.city}, pod adresem ${c.address}, KRS: ${c.krs}, NIP: ${c.nip}, REGON: ${c.regon}.`,
      'Platforma / Serwis – serwis internetowy Vestiqo, umożliwiający kojarzenie Zamawiających z Wykonawcami oraz ustrukturyzowane zarządzanie procesami wyboru ofert.',
      'Zamawiający – podmiot organizujący konkurs ofert (w szczególności Zarządca Nieruchomości, Spółdzielnia Mieszkaniowa, Wspólnota Mieszkaniowa lub podmiot działający w ich imieniu).',
      'Wykonawca – podmiot gospodarczy składający lub zamierzający złożyć ofertę w ramach konkursu organizowanego na Platformie.',
      'Konto – oznaczony indywidualną nazwą (loginem) i hasłem zbiór zasobów w systemie teleinformatycznym Operatora.',
      'Użytkownik – zarówno Zamawiający, jak i Wykonawca korzystający z Platformy.',
      'Przedsiębiorca na prawach konsumenta – osoba fizyczna zawierająca umowę bezpośrednio związaną z jej działalnością gospodarczą, gdy z treści tej umowy wynika, że nie posiada ona dla tej osoby charakteru zawodowego.',
      'DSA – Rozporządzenie Parlamentu Europejskiego i Rady (UE) 2022/2065 w sprawie jednolitego rynku usług cyfrowych (Akt o usługach cyfrowych).',
    ],
  },
  {
    title: '§ 2. Usługi świadczone drogą elektroniczną i warunki techniczne',
    list: [
      'Prowadzenie Konta w Serwisie.',
      'Udostępnianie formularzy umożliwiających publikację konkursów ofert, konfigurację wymagań ofertowych oraz wgrywanie dokumentacji technicznej (dla Zamawiających).',
      'Udostępnianie publicznej wyszukiwarki ogłoszeń, otwartego wglądu w dokumentację oraz formularzy umożliwiających wprowadzenie wyceny i złożenie oferty (dla Wykonawców).',
      'Generowanie raportów porównawczych z nadesłanych ofert w formacie cyfrowym.',
      'Do korzystania z Serwisu wymagane jest urządzenie z dostępem do sieci Internet, poprawnie skonfigurowana przeglądarka internetowa oraz aktywny adres e-mail.',
      'Operator zapewnia bezpieczną transmisję danych za pomocą protokołu HTTPS (szyfrowanie SSL).',
    ],
  },
  {
    title: '§ 3. Rejestracja, warunki finansowe i zmiana regulaminu',
    paragraphs: [
      'Zawarcie umowy o świadczenie usługi prowadzenia Konta następuje w momencie zakończenia procesu rejestracji. Dla Wykonawcy rejestracja może zostać zainicjowana w momencie próby wysłania wypełnionego formularza ofertowego.',
      'Rejestracja Wykonawcy wymaga podania poprawnego numeru NIP. Operator zastrzega sobie prawo do weryfikacji danych firmy w bazach publicznych (CEIDG/KRS).',
      'Korzystanie z podstawowych funkcji Platformy w zakresie publikowania zapytań, przeglądania otwartych konkursów oraz generowania raportów jest bezpłatne.',
      'Operator zastrzega sobie prawo do wprowadzenia opłat za wybrane funkcjonalności na podstawie nowego Cennika. O zmianie Regulaminu lub Cennika Użytkownicy zostaną powiadomieni z co najmniej 14-dniowym wyprzedzeniem.',
    ],
  },
  {
    title: '§ 4. Moderacja treści i obowiązki wynikające z DSA',
    list: [
      'Użytkownik ponosi pełną odpowiedzialność za wszelkie treści wprowadzane do Serwisu.',
      'Zabrania się publikowania treści o charakterze bezprawnym, naruszających dobra osobiste osób trzecich, nieuczciwych ofert lub spamu.',
      `Operator wyznacza punkt kontaktowy ds. zgłaszania nielegalnych treści pod adresem: ${c.emails.dsa}.`,
      'W przypadku otrzymania zgłoszenia Operator ma prawo do usunięcia treści, zablokowania dostępu lub zablokowania Konta Użytkownika.',
    ],
  },
  {
    title: '§ 5. Wyłączenie odpowiedzialności w relacjach B2B',
    paragraphs: [
      'Vestiqo dostarcza wyłącznie infrastrukturę technologiczną. Operator nie jest stroną, pośrednikiem ani gwarantem umów zawieranych pomiędzy Zamawiającym a Wykonawcą.',
      'Operator nie ponosi odpowiedzialności za jakość, terminowość, bezpieczeństwo oraz rzetelność prac budowlanych realizowanych przez Wykonawców.',
    ],
  },
  {
    title: '§ 6. Prawa Przedsiębiorców na prawach konsumenta',
    paragraphs: [
      'Użytkownikowi będącemu Przedsiębiorcą na prawach konsumenta przysługuje prawo do odstąpienia od umowy w terminie 14 dni od dnia jej zawarcia.',
      `Oświadczenie o odstąpieniu może zostać wysłane na adres: ${c.emails.contact}.`,
    ],
  },
  {
    title: '§ 7. Postępowanie reklamacyjne i kontakt',
    list: [
      `Reklamacje dotyczące funkcjonowania Serwisu: ${c.emails.complaints}.`,
      'Operator rozpatruje reklamację w terminie 14 dni od dnia ich otrzymania.',
      `Oficjalny kanał kontaktu: ${c.emails.contact}.`,
    ],
  },
];

export const ppdoSections: LegalSection[] = [
  {
    title: 'Załącznik nr 1: Umowa Powierzenia Przetwarzania Danych Osobowych (PPDO)',
    paragraphs: [
      'Niniejsza Umowa stanowi integralną część Regulaminu Serwisu Vestiqo i określa prawa oraz obowiązki stron w zakresie przetwarzania danych osobowych.',
    ],
    subsections: [
      {
        title: '§ 1. Oświadczenia Stron i Cel Powierzenia',
        list: [
          'Zamawiający oświadcza, że jest Administratorem danych osobowych osób fizycznych wprowadzanych do Serwisu.',
          'Zamawiający zobowiązuje się do anonimizacji dokumentacji publicznie udostępnianej wykonawcom.',
          'Operator zapewnia wystarczające gwarancje wdrożenia odpowiednich środków technicznych i organizacyjnych zgodnie z RODO.',
          'Powierzenie obejmuje przetwarzanie wyłącznie w celu świadczenia usług drogą elektroniczną.',
        ],
      },
      {
        title: '§ 2. Zakres i Kategorie Danych',
        list: [
          'Dane identyfikacyjne (np. imię, nazwisko, stanowisko).',
          'Dane kontaktowe (np. służbowy numer telefonu, adres e-mail).',
        ],
      },
      {
        title: '§ 3. Obowiązki Operatora (Procesora)',
        list: [
          'Przetwarzanie danych wyłącznie na udokumentowane polecenie Zamawiającego.',
          'Zapewnienie poufności przez osoby upoważnione do przetwarzania danych.',
          'Zabezpieczenie danych poprzez SSL i kontrolę dostępu do baz danych.',
          'Pomoc Zamawiającemu w realizacji praw osób, których dane dotyczą.',
        ],
      },
      {
        title: '§ 4. Podpowierzenie danych',
        list: [
          'Zamawiający wyraża zgodę na podpowierzenie przetwarzania podprocesorom (hosting, bazy danych, mailing).',
          'Operator nakłada na podprocesorów takie same obowiązki ochrony danych.',
          'Operator informuje o planowanych zmianach podprocesorów.',
        ],
      },
      {
        title: '§ 5. Audyt i Odpowiedzialność',
        paragraphs: [
          'Operator udostępnia informacje niezbędne do wykazania spełnienia obowiązków z art. 28 RODO i umożliwia audyt po uzgodnieniu terminu (min. 30 dni). Koszty audytu ponosi Zamawiający.',
        ],
      },
      {
        title: '§ 6. Czas trwania umowy i zwrot danych',
        paragraphs: [
          'Umowa obowiązuje przez cały czas posiadania aktywnego Konta. Po usunięciu Konta Operator usuwa lub zwraca dane, chyba że prawo wymaga dalszego przechowywania.',
        ],
      },
    ],
  },
];

export const politykaSections: LegalSection[] = [
  {
    title: 'Wstęp',
    paragraphs: [
      'Niniejsza Polityka Prywatności określa zasady przetwarzania i ochrony danych osobowych użytkowników korzystających z platformy Vestiqo zgodnie z RODO.',
    ],
  },
  {
    title: '§ 1. Administrator Danych Osobowych',
    paragraphs: [
      `Administratorem danych osobowych jest ${c.name} z siedzibą w ${c.city}, adres e-mail: ${c.emails.contact}.`,
    ],
  },
  {
    title: '§ 2. Cele i Podstawy Przetwarzania Danych',
    list: [
      'Świadczenie usług drogą elektroniczną — prowadzenie konta, formularze ofertowe, powiadomienia (art. 6 ust. 1 lit. b RODO).',
      'Obsługa zgłoszeń i kontaktu — formularz kontaktowy, karta pytań w konkursie (art. 6 ust. 1 lit. f RODO).',
      'Wypełnienie obowiązków prawnych — faktury, sprawozdawczość finansowa (art. 6 ust. 1 lit. c RODO).',
    ],
  },
  {
    title: '§ 3. Odbiorcy Danych i Okres Przechowywania',
    list: [
      'Dane mogą być przekazywane zaufanym podmiotom technologicznym (hosting, bazy danych, mailing) na podstawie umów powierzenia.',
      'Dane przetwarzane w celu obsługi konta przechowywane są przez okres jego aktywności, a po usunięciu — przez czas niezbędny do zabezpieczenia roszczeń prawnych.',
    ],
  },
  {
    title: '§ 4. Prawa Użytkownika',
    list: [
      'Dostęp do swoich danych oraz otrzymanie ich kopii.',
      'Sprostowanie (poprawianie) swoich danych.',
      'Usunięcie danych lub ograniczenie ich przetwarzania.',
      'Wniesienie sprzeciwu wobec przetwarzania na podstawie prawnie uzasadnionego interesu.',
      'Wniesienie skargi do Prezesa Urzędu Ochrony Danych Osobowych (PUODO).',
    ],
  },
];
