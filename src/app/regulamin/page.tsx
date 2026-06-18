import Link from 'next/link';
import { LegalDocumentLayout } from '../../components/content/LegalDocumentLayout';
import { companyLegal } from '../../lib/content/company-legal';
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
      footerNote={
        <p className="text-sm text-muted-foreground">
          Punkt kontaktowy DSA:{' '}
          <Link href={`mailto:${companyLegal.emails.dsa}`} className="text-primary hover:underline">
            {companyLegal.emails.dsa}
          </Link>
        </p>
      }
    />
  );
}
