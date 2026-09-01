import { PilotProgramPageContent } from '../../components/content/PilotProgramPageContent';
import { MarketingPageLayout } from '../../components/content/MarketingPageLayout';
import { staticInfoMetadata } from '../../components/StaticInfoPage';
import { pilotProgramContent } from '../../lib/content/program-pilotazowy';
import { getAbsoluteUrl } from '../../lib/seo';
import { pilotKeywords } from '../../lib/seo-keywords';
import { routes } from '../../lib/routes';

export const metadata = staticInfoMetadata(
  pilotProgramContent.title,
  'Dołącz do programu pilotażowego Vestiqo — bezpłatny dostęp dla zarządców i wykonawców, którzy współtworzą standard cyfrowych konkursów ofert.',
  routes.programPilotazowy,
  { keywords: [...pilotKeywords] },
);

export default function PilotProgramPage() {
  const content = pilotProgramContent;
  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: content.faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
    url: getAbsoluteUrl(routes.programPilotazowy),
    inLanguage: 'pl-PL',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <MarketingPageLayout
        title={content.title}
        description={content.description}
        animate
      >
        <PilotProgramPageContent />
      </MarketingPageLayout>
    </>
  );
}
