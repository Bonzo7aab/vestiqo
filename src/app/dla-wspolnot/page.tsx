import { ContentSection } from '../../components/content/ContentSection';
import {
  HelpTimeline,
  MarketingPageLayout,
} from '../../components/content/MarketingPageLayout';
import { communitiesPageContent } from '../../lib/content/dla-uzytkownikow';
import { staticInfoMetadata } from '../../components/StaticInfoPage';

export const metadata = staticInfoMetadata(
  'Dla Wspólnot i Spółdzielni Mieszkaniowych',
  'Transparentne konkursy ofert dla zarządców nieruchomości i wspólnot mieszkaniowych.',
);

export default function CommunitiesPage() {
  const content = communitiesPageContent;

  return (
    <MarketingPageLayout
      title={content.title}
      description={content.description}
      cta={content.cta}
    >
      <p>{content.intro}</p>

      <ContentSection title={content.pillarsTitle}>
        <p>{content.pillarsIntro}</p>
        <div className="space-y-6">
          {content.pillars.map((pillar) => (
            <div key={pillar.title} className="space-y-2">
              <h3 className="text-lg font-semibold text-[hsl(var(--brand-navy))]">
                {pillar.title}
              </h3>
              <p>{pillar.intro}</p>
              <p className="text-muted-foreground">{pillar.text}</p>
            </div>
          ))}
        </div>
      </ContentSection>

      <ContentSection title={content.report.title} variant="accent-border">
        <p>{content.report.text}</p>
      </ContentSection>

      <ContentSection title={content.stepsTitle}>
        <HelpTimeline steps={content.steps} />
      </ContentSection>
    </MarketingPageLayout>
  );
}
