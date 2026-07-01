import { ClipboardList, Shield, ShieldCheck } from 'lucide-react';
import {
  managerHelpIntro,
  managerHelpSteps,
  managerSecurityStandards,
} from '../../lib/content/support-pages';
import { ContentSection } from './ContentSection';
import { HelpTimeline } from './MarketingPageLayout';
import { BenefitList, MarketingHeroIntro } from './marketing-primitives';

export function ManagerHelpPageContent() {
  return (
    <>
      <MarketingHeroIntro
        icon={ClipboardList}
        chips={[
          { icon: ClipboardList, label: '4 kroki' },
          { icon: Shield, label: 'Transparentność' },
          { icon: ShieldCheck, label: 'Weryfikacja firm' },
        ]}
      >
        {managerHelpIntro}
      </MarketingHeroIntro>

      <ContentSection title="Przewodnik: Jak sprawnie przeprowadzić konkurs ofert w 4 krokach">
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
          <HelpTimeline steps={managerHelpSteps} />
        </div>
      </ContentSection>

      <ContentSection title="Standardy bezpieczeństwa i transparentności" variant="accent-border">
        <BenefitList items={managerSecurityStandards} />
      </ContentSection>
    </>
  );
}
