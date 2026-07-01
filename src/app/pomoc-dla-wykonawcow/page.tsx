import { ContractorHelpPageContent } from '../../components/content/ContractorHelpPageContent';
import { MarketingPageLayout } from '../../components/content/MarketingPageLayout';
import { contractorHelpIntro } from '../../lib/content/support-pages';
import { staticInfoMetadata } from '../../components/StaticInfoPage';

export const metadata = staticInfoMetadata(
  'Pomoc dla Wykonawców',
  'Przewodnik dla firm wykonawczych korzystających z Vestiqo.',
);

export default function ContractorHelpPage() {
  return (
    <MarketingPageLayout title="Pomoc dla Wykonawców i Firm" description={contractorHelpIntro}>
      <ContractorHelpPageContent />
    </MarketingPageLayout>
  );
}
