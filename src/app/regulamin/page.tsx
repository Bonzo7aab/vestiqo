import { LegalDocumentLayout } from '../../components/content/LegalDocumentLayout';
import { ppdoSections, regulaminSections } from '../../lib/content/legal-content';
import { buildPageMetadata } from '../../lib/seo';

export const metadata = buildPageMetadata({
  title: 'Regulamin',
  description: 'Regulamin świadczenia usług drogą elektroniczną w serwisie Vestiqo.',
  pathname: '/regulamin',
});

export default function TermsPage() {
  return (
    <LegalDocumentLayout
      title="Regulamin świadczenia usług drogą elektroniczną w serwisie Vestiqo"
      description="Zasady korzystania z platformy Vestiqo w modelu B2B."
      sections={[...regulaminSections, ...ppdoSections]}
    />
  );
}
