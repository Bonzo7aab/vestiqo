import { FaqPageContent } from '../../components/content/FaqPageContent';
import { MarketingPageLayout } from '../../components/content/MarketingPageLayout';
import { faqIntro } from '../../lib/content/support-pages';
import { staticInfoMetadata } from '../../components/StaticInfoPage';

export const metadata = staticInfoMetadata(
  'Najczęściej zadawane pytania',
  'Odpowiedzi na najważniejsze pytania dotyczące platformy Vestiqo.',
);

export default function FaqPage() {
  return (
    <MarketingPageLayout title="Najczęściej zadawane pytania" description={faqIntro}>
      <FaqPageContent />
    </MarketingPageLayout>
  );
}
