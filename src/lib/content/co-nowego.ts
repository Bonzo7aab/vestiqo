export type ChangelogChangeType = 'Nowe' | 'Ulepszenie' | 'Naprawa';

export interface ChangelogItem {
  text: string;
  type?: ChangelogChangeType;
}

export interface ChangelogRelease {
  /** ISO date string (YYYY-MM-DD) for sorting and display */
  date: string;
  title: string;
  items: ChangelogItem[];
}

export const changelogIntro =
  'Krótki przegląd nowości i ulepszeń na platformie Vestiqo. Opisujemy zmiany prostym językiem — bez technicznego żargonu — żebyś od razu wiedział, co się poprawiło w pracy zarządcy i wykonawcy.';

export const changelogReleases: ChangelogRelease[] = [
  {
    date: '2026-08-01',
    title: 'Wygodniejsze zarządzanie konkursami',
    items: [
      {
        type: 'Ulepszenie',
        text: 'Przejrzystszy widok konkursów w panelu zarządcy — szybciej znajdziesz aktywne i zakończone nabory.',
      },
      {
        type: 'Ulepszenie',
        text: 'Łatwiejsze porównywanie ofert dzięki czytelniejszemu zestawieniu kluczowych informacji.',
      },
      {
        type: 'Naprawa',
        text: 'Poprawiliśmy drobne problemy z wyświetlaniem statusów aplikacji.',
      },
    ],
  },
  {
    date: '2026-06-15',
    title: 'Lepsze wsparcie dla wykonawców',
    items: [
      {
        type: 'Nowe',
        text: 'Szybszy dostęp do dokumentacji konkursu bezpośrednio z listy ofert.',
      },
      {
        type: 'Ulepszenie',
        text: 'Wyraźniejsze komunikaty przy składaniu oferty, żeby uniknąć niepełnych zgłoszeń.',
      },
    ],
  },
  {
    date: '2026-03-01',
    title: 'Start platformy Vestiqo',
    items: [
      {
        type: 'Nowe',
        text: 'Uruchomiliśmy platformę do transparentnych konkursów ofert dla wspólnot i wykonawców.',
      },
      {
        type: 'Nowe',
        text: 'Panele dla zarządców i wykonawców z rejestracją oraz podstawową pomocą w aplikacji.',
      },
    ],
  },
];

export const changelogTypeStyles: Record<ChangelogChangeType, string> = {
  Nowe: 'bg-emerald-100 text-emerald-800',
  Ulepszenie: 'bg-blue-100 text-blue-800',
  Naprawa: 'bg-slate-100 text-slate-700',
};

/** Format YYYY-MM-DD for Polish display, e.g. „1 sierpnia 2026”. */
export function formatChangelogDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  return new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
