import {
  Building2,
  CheckCircle,
  Clock,
  FileText,
  Search,
  Shield,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { routes } from '../routes';

export interface HomeHeroFlowStep {
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface HomeHeroFlow {
  title: string;
  icon: LucideIcon;
  steps: HomeHeroFlowStep[];
}

export const homeHeroContent = {
  headline: 'Konkursy ofert dla wspólnot oraz spółdzielni',
  description:
    'Niezależna platforma wspierająca zarządców nieruchomości, zarządy wspólnot i firmy wykonawcze w prowadzeniu transparentnych, bezpiecznych i sprawnych konkursów ofert B2B.',
  ctas: [
    {
      label: 'Dołącz jako wykonawca albo zarządca',
      href: routes.rejestracja,
      variant: 'default' as const,
    },
  ],
  managerFlow: {
    title: 'Dla zarządców',
    icon: Building2,
    steps: [
      {
        title: 'Dodaj bezpłatny konkurs',
        description:
          'Opisz zakres prac i załącz dokumentację — utworzenie konkursu na platformie jest bezpłatne.',
        icon: FileText,
      },
      {
        title: 'Czekaj na oferty',
        description:
          'Zaproszeni wykonawcy i firmy z platformy składają wiążące oferty w wyznaczonym terminie.',
        icon: Clock,
      },
      {
        title: 'Wybierz najlepszą',
        description:
          'Porównaj ceny, terminy i warunki w jednym miejscu, a następnie wybierz najkorzystniejszą ofertę.',
        icon: CheckCircle,
      },
    ],
  } satisfies HomeHeroFlow,
  contractorFlow: {
    title: 'Dla wykonawców',
    icon: Wrench,
    steps: [
      {
        title: 'Szybka rejestracja i weryfikacja',
        description:
          'Załóż konto firmy — system zweryfikuje dane po NIP-ie w CEIDG lub KRS.',
        icon: Shield,
      },
      {
        title: 'Przeglądasz i wyceniasz',
        description:
          'Przeglądaj konkursy w swoim regionie, analizuj dokumentację i przygotuj wycenę.',
        icon: Search,
      },
      {
        title: 'Ocena oferty',
        description:
          'Złóż wiążącą ofertę online — zamawiający ją oceni i powiadomi Cię o wyniku konkursu.',
        icon: CheckCircle,
      },
    ],
  } satisfies HomeHeroFlow,
};
