import Link from 'next/link';
import {
  Building2,
  Clock,
  FlaskConical,
  Handshake,
  MessageCircleOff,
  Sparkles,
  Wrench,
} from 'lucide-react';
import {
  PILOT_APPLICATION_ANCHOR,
  pilotProgramContent,
} from '../../lib/content/program-pilotazowy';
import { routes } from '../../lib/routes';
import { ContentSection } from './ContentSection';
import { FaqAccordion } from './FaqAccordion';
import { HelpTimeline } from './MarketingPageLayout';
import { PilotApplicationForm, PilotJoinCta } from './PilotApplicationForm';
import {
  AudienceCard,
  BenefitList,
  FeatureCard,
  HighlightCallout,
  MarketingHeroIntro,
} from './marketing-primitives';

const GOAL_ICONS = [FlaskConical, MessageCircleOff, Clock, Sparkles] as const;

function PartnerList({
  title,
  partners,
}: {
  title: string;
  partners: ReadonlyArray<{ name: string; detail: string }>;
}) {
  if (partners.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-brand-navy">{title}</h3>
      <ul className="space-y-2">
        {partners.map((partner) => (
          <li
            key={partner.name}
            className="rounded-xl border border-border/70 bg-card px-4 py-3 text-sm shadow-sm"
          >
            <p className="font-medium text-foreground">{partner.name}</p>
            <p className="mt-1 text-muted-foreground">{partner.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PilotProgramPageContent() {
  const content = pilotProgramContent;
  const hasNamedPartners =
    content.managers.length > 0 || content.contractors.length > 0;

  return (
    <>
      <MarketingHeroIntro
        icon={Handshake}
        chips={[
          { icon: Building2, label: 'Dla zarządców' },
          { icon: Wrench, label: 'Dla wykonawców' },
          { icon: Sparkles, label: 'Bezpłatny dostęp' },
        ]}
      >
        {content.intro}
      </MarketingHeroIntro>
      <PilotJoinCta />

      <ContentSection title={content.goalsTitle} variant="muted">
        <div className="grid gap-4 sm:grid-cols-2">
          {content.goals.map((goal, index) => {
            const Icon = GOAL_ICONS[index] ?? Sparkles;
            return (
              <FeatureCard key={goal.title} icon={Icon} title={goal.title}>
                {goal.text}
              </FeatureCard>
            );
          })}
        </div>
      </ContentSection>

      <ContentSection title={content.participantsTitle}>
        {hasNamedPartners ? (
          <div className="grid gap-6 sm:grid-cols-2">
            <PartnerList title={content.managersTitle} partners={content.managers} />
            <PartnerList
              title={content.contractorsTitle}
              partners={content.contractors}
            />
          </div>
        ) : null}
        <HighlightCallout>{content.recruitmentTitle}</HighlightCallout>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          {content.recruitmentText}
        </p>
      </ContentSection>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <AudienceCard icon={Building2} title={content.managersAudience.title}>
            {content.managersAudience.forWhom}
          </AudienceCard>
          <BenefitList items={[...content.managersAudience.benefits]} />
        </div>
        <div className="space-y-4">
          <AudienceCard icon={Wrench} title={content.contractorsAudience.title}>
            {content.contractorsAudience.forWhom}
          </AudienceCard>
          <BenefitList items={[...content.contractorsAudience.benefits]} />
        </div>
      </div>

      <ContentSection title={content.stepsTitle}>
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
          <HelpTimeline steps={[...content.steps]} />
        </div>
      </ContentSection>

      <ContentSection title={content.faqTitle}>
        <FaqAccordion items={[...content.faqItems]} />
      </ContentSection>

      <ContentSection
        id={PILOT_APPLICATION_ANCHOR}
        title={content.formTitle}
        variant="accent-border"
        className="scroll-mt-24"
      >
        <p className="text-sm text-muted-foreground sm:text-base">{content.formIntro}</p>
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
          <PilotApplicationForm />
        </div>
      </ContentSection>

      <ContentSection title="Przydatne strony">
        <ul className="grid gap-3 sm:grid-cols-2">
          <li>
            <Link href={routes.dlaWspolnot} className="text-primary hover:underline">
              Dla Wspólnot i Spółdzielni — jak wygląda konkurs ofert
            </Link>
          </li>
          <li>
            <Link href={routes.dlaWykonawcow} className="text-primary hover:underline">
              Dla Wykonawców — zlecenia B2B bez zgadywania
            </Link>
          </li>
          <li>
            <Link href={routes.faq} className="text-primary hover:underline">
              FAQ platformy Vestiqo
            </Link>
          </li>
          <li>
            <Link href={routes.kontakt} className="text-primary hover:underline">
              Kontakt z zespołem
            </Link>
          </li>
        </ul>
      </ContentSection>
    </>
  );
}
