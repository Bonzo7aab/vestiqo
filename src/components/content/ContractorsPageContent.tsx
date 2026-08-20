import Link from 'next/link';
import { Bell, FileText, HandCoins, Scale, Wrench } from 'lucide-react';
import { contractorsPageContent } from '../../lib/content/dla-uzytkownikow';
import { routes } from '../../lib/routes';
import { ContentSection } from './ContentSection';
import { HelpTimeline } from './MarketingPageLayout';
import { FeatureCard, MarketingHeroIntro } from './marketing-primitives';

const REASON_ICONS = [HandCoins, FileText, Scale] as const;

export function ContractorsPageContent() {
  const content = contractorsPageContent;

  return (
    <>
      <MarketingHeroIntro
        icon={Wrench}
        chips={[
          { icon: HandCoins, label: 'Stabilne zlecenia B2B' },
          { icon: FileText, label: 'Pełna dokumentacja' },
          { icon: Bell, label: 'Alerty e-mail' },
        ]}
      >
        {content.intro}
      </MarketingHeroIntro>

      <ContentSection title={content.reasonsTitle} variant="muted">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {content.reasons.map((reason, index) => {
            const Icon = REASON_ICONS[index] ?? HandCoins;
            return (
              <FeatureCard key={reason.title} icon={Icon} title={reason.title}>
                {reason.text}
              </FeatureCard>
            );
          })}
        </div>
      </ContentSection>

      <ContentSection title={content.stepsTitle}>
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
          <HelpTimeline steps={content.steps} />
        </div>
      </ContentSection>

      <ContentSection title="Przydatne strony dla wykonawców">
        <ul className="grid gap-3 sm:grid-cols-2">
          <li>
            <Link href={routes.pomocDlaWykonawcow} className="text-primary hover:underline">
              Pomoc dla wykonawców — jak składać oferty
            </Link>
          </li>
          <li>
            <Link href={routes.kategorieUslug} className="text-primary hover:underline">
              Kategorie usług — znajdź zlecenia dla swojej specjalizacji
            </Link>
          </li>
          <li>
            <Link href={routes.faq} className="text-primary hover:underline">
              FAQ dla firm budowlanych i usługowych
            </Link>
          </li>
          <li>
            <Link href={routes.programPilotazowy} className="text-primary hover:underline">
              Program pilotażowy — dołącz jako wykonawca
            </Link>
          </li>
          <li>
            <Link href={routes.rejestracja} className="text-primary hover:underline">
              Rejestracja firmy w Vestiqo
            </Link>
          </li>
        </ul>
      </ContentSection>
    </>
  );
}
