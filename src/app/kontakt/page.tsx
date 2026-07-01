import { Mail, MapPin } from 'lucide-react';
import { ContactForm } from '../../components/content/ContactForm';
import { ContentSection } from '../../components/content/ContentSection';
import { MarketingHeroIntro } from '../../components/content/marketing-primitives';
import { MarketingPageLayout } from '../../components/content/MarketingPageLayout';
import { companyLegal } from '../../lib/content/company-legal';
import { contactDirectEmails, contactIntro } from '../../lib/content/kontakt';
import { staticInfoMetadata } from '../../components/StaticInfoPage';

export const metadata = staticInfoMetadata(
  'Kontakt',
  'Skontaktuj się z zespołem Vestiqo — formularz, e-mail i dane firmy.',
);

export default function ContactPage() {
  return (
    <MarketingPageLayout title="Kontakt" description={contactIntro}>
      <MarketingHeroIntro icon={Mail}>
        Napisz do nas — odpowiadamy na pytania o platformę, konta, konkursy i kwestie techniczne.
      </MarketingHeroIntro>

      <div className="grid gap-4 md:grid-cols-2">
        <ContentSection title="Bezpośredni kontakt mailowy" variant="muted">
          <ul className="space-y-4">
            {contactDirectEmails.map((entry) => (
              <li
                key={entry.email}
                className="rounded-xl border border-border/70 bg-card p-4 shadow-sm"
              >
                <p className="font-medium text-foreground">{entry.label}</p>
                <a
                  href={`mailto:${entry.email}`}
                  className="mt-1 inline-block text-primary hover:underline"
                >
                  {entry.email}
                </a>
                <p className="mt-2 text-sm text-muted-foreground">{entry.description}</p>
              </li>
            ))}
          </ul>
        </ContentSection>

        <ContentSection title="Dane rejestrowe spółki">
          <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-card to-muted/30 p-5 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{companyLegal.name}</p>
              <p>{companyLegal.address}</p>
              <p>NIP: {companyLegal.nip}</p>
              <p>REGON: {companyLegal.regon}</p>
              <p>KRS: {companyLegal.krs}</p>
            </div>
          </div>
        </ContentSection>
      </div>

      <ContentSection title="Formularz kontaktowy" variant="accent-border">
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
          <ContactForm />
        </div>
      </ContentSection>
    </MarketingPageLayout>
  );
}
