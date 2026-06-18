import { LegalDocumentLayout } from '../../components/content/LegalDocumentLayout';
import { politykaSections } from '../../lib/content/legal-content';

export const metadata = {
  title: 'Polityka prywatności i RODO - Vestiqo',
  description: 'Polityka prywatności i ochrona danych osobowych zgodnie z RODO.',
};

export default function PrivacyPage() {
  return (
    <LegalDocumentLayout
      title="Polityka Prywatności i RODO"
      description="Zasady przetwarzania i ochrony danych osobowych użytkowników platformy Vestiqo."
      sections={politykaSections}
    />
  );
}
