import { StaticInfoPage, staticInfoMetadata } from '../../components/StaticInfoPage';
import { HelpPageCta } from '../../components/content/FaqAccordion';
import { HelpTimeline } from '../../components/content/MarketingPageLayout';
import {
  managerHelpIntro,
  managerHelpSteps,
  managerSecurityStandards,
} from '../../lib/content/support-pages';
import { routes } from '../../lib/routes';

export const metadata = staticInfoMetadata(
  'Pomoc dla Zarządców',
  'Przewodnik krok po kroku dla zarządców, spółdzielni i wspólnot mieszkaniowych.',
);

export default function ManagerHelpPage() {
  return (
    <StaticInfoPage
      title="Pomoc dla Zarządcy, Spółdzielni i Wspólnot Mieszkaniowych"
      description={managerHelpIntro}
    >
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-[hsl(var(--brand-navy))]">
          Przewodnik: Jak sprawnie przeprowadzić konkurs ofert w 4 krokach
        </h2>
        <HelpTimeline steps={managerHelpSteps} />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-[hsl(var(--brand-navy))]">
          Standardy bezpieczeństwa i transparentności
        </h2>
        <ul className="list-disc space-y-2 pl-6">
          {managerSecurityStandards.map((item) => (
            <li key={item.slice(0, 40)}>{item}</li>
          ))}
        </ul>
      </section>

      <HelpPageCta
        text="Gotowy do przyspieszenia inwestycji?"
        buttonLabel="Dodaj bezpłatnie pierwszy konkurs ofert"
        href={routes.wyborTypuKonkursu}
      />
    </StaticInfoPage>
  );
}
