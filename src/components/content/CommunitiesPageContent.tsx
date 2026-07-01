import { Building2, FileBarChart, Lock, Shield, Users } from 'lucide-react';
import { communitiesPageContent } from '../../lib/content/dla-uzytkownikow';
import { ContentSection } from './ContentSection';
import { HelpTimeline } from './MarketingPageLayout';
import {
  FeatureCard,
  HighlightCallout,
  MarketingHeroIntro,
} from './marketing-primitives';

const PILLAR_ICONS = [Shield, Users, FileBarChart] as const;

export function CommunitiesPageContent() {
  const content = communitiesPageContent;

  return (
    <>
      <MarketingHeroIntro
        icon={Building2}
        chips={[
          { icon: Shield, label: 'Transparentność' },
          { icon: Lock, label: 'Bezpieczeństwo' },
          { icon: Users, label: 'Dla zarządców i rad' },
        ]}
      >
        {content.intro}
      </MarketingHeroIntro>

      <ContentSection title={content.pillarsTitle} variant="muted">
        <p className="text-base">{content.pillarsIntro}</p>
        <div className="grid gap-4 pt-2 md:grid-cols-3">
          {content.pillars.map((pillar, index) => {
            const Icon = PILLAR_ICONS[index] ?? Shield;
            return (
              <FeatureCard key={pillar.title} icon={Icon} title={pillar.title} accent="navy">
                <span className="block">{pillar.intro}</span>
                <span className="mt-2 block">{pillar.text}</span>
              </FeatureCard>
            );
          })}
        </div>
      </ContentSection>

      <ContentSection title={content.report.title} variant="accent-border">
        <HighlightCallout>{content.report.text}</HighlightCallout>
      </ContentSection>

      <ContentSection title={content.stepsTitle}>
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
          <HelpTimeline steps={content.steps} />
        </div>
      </ContentSection>
    </>
  );
}
