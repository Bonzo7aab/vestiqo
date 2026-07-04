import { AboutPageContent } from '../../components/content/AboutPageContent';
import { MarketingPageLayout } from '../../components/content/MarketingPageLayout';
import { aboutPageContent } from '../../lib/content/o-nas';
import { staticInfoMetadata } from '../../components/StaticInfoPage';
import { aboutKeywords } from '../../lib/seo-keywords';

export const metadata = staticInfoMetadata(
  'O nas',
  'Poznaj Vestiqo — nowy standard konkursów ofert w nieruchomościach.',
  '/o-nas',
  { keywords: [...aboutKeywords] },
);

export default function AboutPage() {
  const content = aboutPageContent;

  return (
    <MarketingPageLayout title={content.title} description={content.description}>
      <AboutPageContent />
    </MarketingPageLayout>
  );
}
