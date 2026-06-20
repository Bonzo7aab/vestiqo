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
      <div className="flex flex-col gap-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[hsl(var(--brand-navy))]">
              Bezpośredni kontakt mailowy
            </h2>
            <ul className="mt-4 space-y-4">
              {contactDirectEmails.map((entry) => (
                <li key={entry.email}>
                  <p className="font-medium text-foreground">{entry.label}</p>
                  <a
                    href={`mailto:${entry.email}`}
                    className="mt-1 inline-block text-primary hover:underline"
                  >
                    {entry.email}
                  </a>
                  <p className="mt-1 text-sm text-muted-foreground">{entry.description}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/30 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[hsl(var(--brand-navy))]">
              Dane rejestrowe spółki
            </h2>
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              <p className="font-medium">{companyLegal.name}</p>
              <p>{companyLegal.address}</p>
              <p>NIP: {companyLegal.nip}</p>
              <p>REGON: {companyLegal.regon}</p>
              <p>KRS: {companyLegal.krs}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
          <div className="mb-5 space-y-2">
            <h2 className="text-xl font-semibold text-[hsl(var(--brand-navy))]">
              Formularz kontaktowy
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Napisz, z czym możemy pomóc. Odpowiadamy na pytania o platformę,
              konta, konkursy i kwestie techniczne.
            </p>
          </div>
          <ContactForm />
        </div>
      </div>
    </StaticInfoPage>
  );
}
