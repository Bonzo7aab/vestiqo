import { StaticInfoPage, staticInfoMetadata } from '../../components/StaticInfoPage';
import { ContactForm } from '../../components/content/ContactForm';
import { companyLegal } from '../../lib/content/company-legal';
import {
  contactDirectEmails,
  contactIntro,
} from '../../lib/content/kontakt';

export const metadata = staticInfoMetadata(
  'Kontakt',
  'Skontaktuj się z zespołem Vestiqo — formularz, e-mail i dane firmy.',
);

export default function ContactPage() {
  return (
    <StaticInfoPage title="Kontakt" description={contactIntro}>
      <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <h2 className="mb-4 text-xl font-semibold text-[hsl(var(--brand-navy))]">
            Formularz kontaktowy
          </h2>
          <ContactForm />
        </div>

        <aside className="space-y-6 rounded-lg border border-border bg-muted/40 p-6">
          <div>
            <h2 className="text-lg font-semibold text-[hsl(var(--brand-navy))]">
              Bezpośredni kontakt mailowy
            </h2>
            <ul className="mt-4 space-y-4">
              {contactDirectEmails.map((entry) => (
                <li key={entry.email}>
                  <p className="font-medium">{entry.label}</p>
                  <a
                    href={`mailto:${entry.email}`}
                    className="text-primary hover:underline"
                  >
                    {entry.email}
                  </a>
                  <p className="text-sm text-muted-foreground">{entry.description}</p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[hsl(var(--brand-navy))]">
              Dane rejestrowe spółki
            </h2>
            <div className="mt-3 space-y-1 text-sm">
              <p className="font-medium">{companyLegal.name}</p>
              <p>{companyLegal.address}</p>
              <p>NIP: {companyLegal.nip}</p>
              <p>REGON: {companyLegal.regon}</p>
              <p>KRS: {companyLegal.krs}</p>
            </div>
          </div>
        </aside>
      </div>
    </StaticInfoPage>
  );
}
