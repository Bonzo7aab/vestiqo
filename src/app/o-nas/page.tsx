import { ContentSection } from '../../components/content/ContentSection';
import { MarketingPageLayout } from '../../components/content/MarketingPageLayout';
import { aboutPageContent } from '../../lib/content/o-nas';
import { staticInfoMetadata } from '../../components/StaticInfoPage';

export const metadata = staticInfoMetadata(
  'O nas',
  'Poznaj Vestiqo — nowy standard konkursów ofert w nieruchomościach.',
);

export default function AboutPage() {
  const content = aboutPageContent;

  return (
    <MarketingPageLayout title={content.title} description={content.description}>
      <p>{content.intro}</p>

      <ContentSection title={content.whyWeExist.title} variant="muted">
        <p>{content.whyWeExist.intro}</p>
        <ul className="list-disc space-y-3 pl-6">
          {content.whyWeExist.painPoints.map((point) => (
            <li key={point.title}>
              <strong>{point.title}:</strong> {point.text}
            </li>
          ))}
        </ul>
        <p>{content.whyWeExist.closing}</p>
      </ContentSection>

      <ContentSection title={content.mission.title}>
        <p>{content.mission.intro}</p>
        <ul className="list-disc space-y-3 pl-6">
          {content.mission.highlights.map((item) => (
            <li key={item.title}>
              <strong>{item.title}:</strong> {item.text}
            </li>
          ))}
        </ul>
      </ContentSection>

      <ContentSection title={content.twoWorlds.title} variant="accent-border">
        <p>{content.twoWorlds.intro}</p>
        <ul className="list-disc space-y-3 pl-6">
          {content.twoWorlds.audiences.map((item) => (
            <li key={item.title}>
              <strong>{item.title}:</strong> {item.text}
            </li>
          ))}
        </ul>
      </ContentSection>

    </MarketingPageLayout>
  );
}
