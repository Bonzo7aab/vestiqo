import { Briefcase, FileSearch, MessageSquare, Wrench } from 'lucide-react';
import {
  contractorHelpBenefits,
  contractorHelpIntro,
  contractorHelpSteps,
} from '../../lib/content/support-pages';
import { ContentSection } from './ContentSection';
import { HelpTimeline } from './MarketingPageLayout';
import { BenefitList, MarketingHeroIntro } from './marketing-primitives';

export function ContractorHelpPageContent() {
  return (
    <>
      <MarketingHeroIntro
        icon={Wrench}
        chips={[
          { icon: FileSearch, label: 'Otwarta dokumentacja' },
          { icon: Briefcase, label: 'Zlecenia B2B' },
          { icon: MessageSquare, label: 'Pytania na karcie' },
        ]}
      >
        {contractorHelpIntro}
      </MarketingHeroIntro>

      <ContentSection title="Jak to działa: Od pierwszego kliknięcia do zdobycia zlecenia">
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
          <HelpTimeline steps={contractorHelpSteps} />
        </div>
      </ContentSection>

      <ContentSection title="Dlaczego warto ofertować przez Vestiqo?" variant="muted">
        <BenefitList items={contractorHelpBenefits} />
      </ContentSection>
    </>
  );
}
