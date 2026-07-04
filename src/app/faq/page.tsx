import { FaqPageContent } from '../../components/content/FaqPageContent';
import { MarketingPageLayout } from '../../components/content/MarketingPageLayout';
import {
  faqContractorItems,
  faqIntro,
  faqManagerItems,
} from '../../lib/content/support-pages';
import { staticInfoMetadata } from '../../components/StaticInfoPage';
import { faqKeywords } from '../../lib/seo-keywords';
import { getAbsoluteUrl } from '../../lib/seo';

export const metadata = staticInfoMetadata(
  'Najczęściej zadawane pytania',
  'Odpowiedzi na najważniejsze pytania dotyczące platformy Vestiqo.',
  '/faq',
  { keywords: [...faqKeywords] },
);

export default function FaqPage() {
  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [...faqManagerItems, ...faqContractorItems].map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
    url: getAbsoluteUrl('/faq'),
    inLanguage: 'pl-PL',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <MarketingPageLayout title="Najczęściej zadawane pytania" description={faqIntro}>
        <FaqPageContent />
      </MarketingPageLayout>
    </>
  );
}
