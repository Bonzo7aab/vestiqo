import {
  Bell,
  Building2,
  CheckCircle,
  ClipboardList,
  FileText,
  Search,
  Shield,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { routes } from '../routes';
import {
  communitiesPageContent,
  contractorsPageContent,
} from './dla-uzytkownikow';

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
  headline: 'Konkursy ofert i przetargi remontowe dla wspólnot oraz spółdzielni',
  description:
    'Niezależna platforma wspierająca zarządców nieruchomości, zarządy wspólnot i firmy wykonawcze w prowadzeniu transparentnych, bezpiecznych i sprawnych konkursów ofert B2B.',
  ctas: [
    {
      label: 'Utwórz konkurs',
      href: routes.wyborTypuKonkursu,
      variant: 'default' as const,
    },
    {
      label: 'Dołącz jako wykonawca',
      href: routes.rejestracja,
      variant: 'outline' as const,
    },
  ],
  managerFlow: {
    title: 'Dla zarządców',
    icon: Building2,
    steps: communitiesPageContent.steps.map((step, index) => ({
      title: step.title,
      description: step.description,
      icon: [FileText, ClipboardList, CheckCircle][index] ?? FileText,
    })),
  } satisfies HomeHeroFlow,
  contractorFlow: {
    title: 'Dla wykonawców',
    icon: Wrench,
    steps: contractorsPageContent.steps.map((step, index) => ({
      title: step.title,
      description: step.description,
      icon: [Search, Shield, Bell][index] ?? Search,
    })),
  } satisfies HomeHeroFlow,
};
