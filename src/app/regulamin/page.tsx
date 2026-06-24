import { LegalDocumentLayout } from '../../components/content/LegalDocumentLayout';
import { ppdoSections, regulaminSections } from '../../lib/content/legal-content';

export const metadata = {
  title: 'Regulamin - Vestiqo',
  description: 'Regulamin świadczenia usług drogą elektroniczną w serwisie Vestiqo.',
};

export default function TermsPage() {
  return (
    <LegalDocumentLayout
      title="Regulamin świadczenia usług drogą elektroniczną w serwisie Vestiqo"
      description="Zasady korzystania z platformy Vestiqo w modelu B2B."
      sections={[...regulaminSections, ...ppdoSections]}
    />
  );
}
