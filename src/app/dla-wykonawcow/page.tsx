import { ContractorsPageContent } from '../../components/content/ContractorsPageContent';
import { MarketingPageLayout } from '../../components/content/MarketingPageLayout';
import { contractorsPageContent } from '../../lib/content/dla-uzytkownikow';
import { staticInfoMetadata } from '../../components/StaticInfoPage';

export const metadata = staticInfoMetadata(
  'Dla Wykonawców i Firm',
  'Stabilne zlecenia B2B od wspólnot, spółdzielni i zarządców nieruchomości.',
  '/dla-wykonawcow',
);

export default function ContractorsLandingPage() {
  const content = contractorsPageContent;

  return (
    <MarketingPageLayout title={content.title} description={content.description}>
      <ContractorsPageContent />
    </MarketingPageLayout>
  );
}
