import { CommunitiesPageContent } from '../../components/content/CommunitiesPageContent';
import { MarketingPageLayout } from '../../components/content/MarketingPageLayout';
import { communitiesPageContent } from '../../lib/content/dla-uzytkownikow';
import { staticInfoMetadata } from '../../components/StaticInfoPage';

export const metadata = staticInfoMetadata(
  'Dla Wspólnot i Spółdzielni Mieszkaniowych',
  'Transparentne konkursy ofert dla zarządców nieruchomości i wspólnot mieszkaniowych.',
  '/dla-wspolnot',
);

export default function CommunitiesPage() {
  const content = communitiesPageContent;

  return (
    <MarketingPageLayout title={content.title} description={content.description}>
      <CommunitiesPageContent />
    </MarketingPageLayout>
  );
}
