import { LegalDocumentLayout } from '../../components/content/LegalDocumentLayout';
import { politykaSections } from '../../lib/content/legal-content';
import { buildPageMetadata } from '../../lib/seo';

export const metadata = buildPageMetadata({
  title: 'Polityka prywatności i RODO',
  description: 'Polityka prywatności i ochrona danych osobowych zgodnie z RODO.',
  pathname: '/polityka-prywatnosci',
});

export default function PrivacyPage() {
  return (
    <LegalDocumentLayout
      title="Polityka Prywatności i RODO"
      description="Zasady przetwarzania i ochrony danych osobowych użytkowników platformy Vestiqo."
      sections={politykaSections}
    />
  );
}
