import Link from 'next/link';
import { Cookie, Shield } from 'lucide-react';
import { CookieSettingsPageActions } from '../../components/content/CookieSettingsPageActions';
import { ContentSection } from '../../components/content/ContentSection';
import { MarketingHeroIntro } from '../../components/content/marketing-primitives';
import { MarketingPageLayout } from '../../components/content/MarketingPageLayout';
import { cookiesPageContent } from '../../lib/content/cookies';
import { staticInfoMetadata } from '../../components/StaticInfoPage';

export const metadata = staticInfoMetadata(
  cookiesPageContent.title,
  cookiesPageContent.description,
  '/ustawienia-plikow-cookie',
);

export default function CookieSettingsPage() {
  const content = cookiesPageContent;

  return (
    <MarketingPageLayout title={content.title} description={content.description}>
      <MarketingHeroIntro
        icon={Cookie}
        chips={[{ icon: Shield, label: 'Zarządzanie zgodami' }]}
      >
        {content.intro}
      </MarketingHeroIntro>

      <ContentSection title="Kategorie plików cookie">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {content.categories.map((category) => (
            <article
              key={category.id}
              className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-brand-navy">
                  {category.name}
                </h2>
                {category.required ? (
                  <span className="rounded-full border border-primary/20 bg-primary/8 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-primary">
                    Zawsze aktywne
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {category.description}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Przykłady:</span> {category.examples}
              </p>
            </article>
          ))}
        </div>
      </ContentSection>

      <p className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-brand-navy sm:text-base">
        {content.manageHint} Szczegółowe informacje o przetwarzaniu danych znajdziesz w{' '}
        <Link href={content.privacyLink} className="font-medium text-primary hover:underline">
          Polityce prywatności i RODO
        </Link>
        .
      </p>

      <CookieSettingsPageActions />
    </MarketingPageLayout>
  );
}
