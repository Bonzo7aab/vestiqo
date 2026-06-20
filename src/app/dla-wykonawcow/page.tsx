import { ContentSection } from '../../components/content/ContentSection';
import {
  HelpTimeline,
  MarketingPageLayout,
} from '../../components/content/MarketingPageLayout';
import { contractorsPageContent } from '../../lib/content/dla-uzytkownikow';
import { staticInfoMetadata } from '../../components/StaticInfoPage';

export const metadata = staticInfoMetadata(
  'Dla Wykonawców i Firm',
  'Stabilne zlecenia B2B od wspólnot, spółdzielni i zarządców nieruchomości.',
);

export default function ContractorsLandingPage() {
  const content = contractorsPageContent;

  return (
    <MarketingPageLayout
      title={content.title}
      description={content.description}
    >
      <p>{content.intro}</p>

      <ContentSection title={content.reasonsTitle}>
        <ul className="space-y-4">
          {content.reasons.map((reason) => (
            <li key={reason.title}>
              <h3 className="font-semibold text-[hsl(var(--brand-navy))]">{reason.title}</h3>
              <p className="mt-1 text-muted-foreground">{reason.text}</p>
            </li>
          ))}
        </ul>
      </ContentSection>

      <ContentSection title={content.stepsTitle}>
        <HelpTimeline steps={content.steps} />
      </ContentSection>
    </MarketingPageLayout>
  );
}
