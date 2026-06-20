import Link from 'next/link';
import { StaticInfoPage, staticInfoMetadata } from '../../components/StaticInfoPage';
import { FaqSection } from '../../components/content/FaqAccordion';
import {
  faqContractorItems,
  faqIntro,
  faqManagerItems,
} from '../../lib/content/support-pages';
import { routes } from '../../lib/routes';

export const metadata = staticInfoMetadata(
  'Najczęściej zadawane pytania',
  'Odpowiedzi na najważniejsze pytania dotyczące platformy Vestiqo.',
);

export default function FaqPage() {
  return (
    <StaticInfoPage
      title="Najczęściej zadawane pytania"
      description={faqIntro}
    >
      <FaqSection
        id="faq-managers"
        title="Dla Wspólnot, Spółdzielni i Zarządców"
        items={faqManagerItems}
      />

      <FaqSection
        id="faq-contractors"
        title="Dla Wykonawców i Firm Budowlanych"
        items={faqContractorItems}
      />

      <p>
        Nie znalazłeś odpowiedzi?{' '}
        <Link href={routes.kontakt} className="font-medium text-primary hover:underline">
          Skontaktuj się z nami
        </Link>
        .
      </p>
    </StaticInfoPage>
  );
}
