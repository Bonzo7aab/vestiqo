import { StaticInfoPage, staticInfoMetadata } from '../../components/StaticInfoPage';
import { HelpPageCta } from '../../components/content/FaqAccordion';
import { HelpTimeline } from '../../components/content/MarketingPageLayout';
import {
  contractorHelpBenefits,
  contractorHelpIntro,
  contractorHelpSteps,
} from '../../lib/content/support-pages';
import { routes } from '../../lib/routes';

export const metadata = staticInfoMetadata(
  'Pomoc dla Wykonawców',
  'Przewodnik dla firm wykonawczych korzystających z Vestiqo.',
);

export default function ContractorHelpPage() {
  return (
    <StaticInfoPage title="Pomoc dla Wykonawców i Firm" description={contractorHelpIntro}>
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-[hsl(var(--brand-navy))]">
          Jak to działa: Od pierwszego kliknięcia do zdobycia zlecenia
        </h2>
        <HelpTimeline steps={contractorHelpSteps} />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-[hsl(var(--brand-navy))]">
          Dlaczego warto ofertować przez Vestiqo?
        </h2>
        <ul className="list-disc space-y-2 pl-6">
          {contractorHelpBenefits.map((item) => (
            <li key={item.slice(0, 40)}>{item}</li>
          ))}
        </ul>
      </section>

      <HelpPageCta
        text="Znajdź kolejne zlecenie dla swojej firmy."
        buttonLabel="Zarejestruj firmę za darmo"
        href={routes.rejestracja}
      />
    </StaticInfoPage>
  );
}
