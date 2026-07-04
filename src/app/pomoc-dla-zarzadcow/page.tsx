import { ManagerHelpPageContent } from '../../components/content/ManagerHelpPageContent';
import { MarketingPageLayout } from '../../components/content/MarketingPageLayout';
import { managerHelpIntro } from '../../lib/content/support-pages';
import { staticInfoMetadata } from '../../components/StaticInfoPage';
import { managerHelpKeywords } from '../../lib/seo-keywords';

export const metadata = staticInfoMetadata(
  'Pomoc dla Zarządców',
  'Przewodnik krok po kroku dla zarządców, spółdzielni i wspólnot mieszkaniowych.',
  '/pomoc-dla-zarzadcow',
  { keywords: [...managerHelpKeywords] },
);

export default function ManagerHelpPage() {
  return (
    <MarketingPageLayout
      title="Pomoc dla Zarządcy, Spółdzielni i Wspólnot Mieszkaniowych"
      description={managerHelpIntro}
    >
      <ManagerHelpPageContent />
    </MarketingPageLayout>
  );
}
