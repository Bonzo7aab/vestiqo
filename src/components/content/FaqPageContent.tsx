import Link from 'next/link';
import { Building2, HelpCircle, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  faqContractorItems,
  faqIntro,
  faqManagerItems,
} from '../../lib/content/support-pages';
import { routes } from '../../lib/routes';
import { FaqAccordion } from './FaqAccordion';
import { MarketingHeroIntro } from './marketing-primitives';

function FaqAudienceSection({
  id,
  icon: Icon,
  title,
  subtitle,
  items,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  items: typeof faqManagerItems;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
    >
      <div className="flex items-start gap-3 border-b border-border/70 bg-muted/30 px-5 py-4 sm:items-center sm:px-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-brand-navy sm:text-xl">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="p-4 sm:p-5">
        <FaqAccordion items={items} />
      </div>
    </section>
  );
}

export function FaqPageContent() {
  return (
    <div className="space-y-8">
      <MarketingHeroIntro icon={HelpCircle}>{faqIntro}</MarketingHeroIntro>

      <FaqAudienceSection
        id="faq-managers"
        icon={Building2}
        title="Dla Wspólnot, Spółdzielni i Zarządców"
        subtitle="Odpowiedzi dla zarządców i organów wspólnot"
        items={faqManagerItems}
      />

      <FaqAudienceSection
        id="faq-contractors"
        icon={Wrench}
        title="Dla Wykonawców i Firm Budowlanych"
        subtitle="Odpowiedzi dla firm wykonawczych"
        items={faqContractorItems}
      />

      <p className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-center text-sm text-brand-navy sm:text-base">
        Nie znalazłeś odpowiedzi?{' '}
        <Link href={routes.kontakt} className="font-medium text-primary hover:underline">
          Skontaktuj się z nami
        </Link>
        .
      </p>
    </div>
  );
}
