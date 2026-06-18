import Link from 'next/link';
import { StaticInfoPage, staticInfoMetadata } from '../../components/StaticInfoPage';
import { CookieSettingsPageActions } from '../../components/content/CookieSettingsPageActions';
import { cookiesPageContent } from '../../lib/content/cookies';

export const metadata = staticInfoMetadata(
  cookiesPageContent.title,
  cookiesPageContent.description,
);

export default function CookieSettingsPage() {
  return (
    <StaticInfoPage title={cookiesPageContent.title} description={cookiesPageContent.description}>
      <p>{cookiesPageContent.intro}</p>

      <div className="space-y-4">
        {cookiesPageContent.categories.map((category) => (
          <section
            key={category.id}
            className="rounded-lg border border-border p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-[hsl(var(--brand-navy))]">
                {category.name}
              </h2>
              {category.required ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  Zawsze aktywne
                </span>
              ) : null}
            </div>
            <p className="mt-2">{category.description}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium">Przykłady:</span> {category.examples}
            </p>
          </section>
        ))}
      </div>

      <p>
        Szczegółowe informacje o przetwarzaniu danych znajdziesz w{' '}
        <Link
          href={cookiesPageContent.privacyLink}
          className="font-medium text-primary hover:underline"
        >
          Polityce prywatności i RODO
        </Link>
        .
      </p>

      <CookieSettingsPageActions />
    </StaticInfoPage>
  );
}
