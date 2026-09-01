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
  PILOT_JOIN_ANCHOR,
  pilotProgramContent,
} from '../../lib/content/program-pilotazowy';
import { ContentSection } from './ContentSection';
import { FaqAccordion } from './FaqAccordion';
import { HelpTimeline } from './MarketingPageLayout';
import {
  MarketingReveal,
  MarketingStagger,
  MarketingStaggerItem,
} from './MarketingReveal';
import { PilotJoinCta } from './PilotJoinCta';
import { PilotUsefulLinks } from './PilotUsefulLinks';
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
      <MarketingReveal>
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
      </MarketingReveal>
      <MarketingReveal delay={0.08}>
        <PilotJoinCta />
      </MarketingReveal>

      <MarketingReveal>
        <ContentSection title={content.goalsTitle} variant="muted">
          <MarketingStagger className="grid gap-4 sm:grid-cols-2">
            {content.goals.map((goal, index) => {
              const Icon = GOAL_ICONS[index] ?? Sparkles;
              return (
                <MarketingStaggerItem key={goal.title} className="h-full" hoverLift>
                  <FeatureCard icon={Icon} title={goal.title}>
                    {goal.text}
                  </FeatureCard>
                </MarketingStaggerItem>
              );
            })}
          </MarketingStagger>
        </ContentSection>
      </MarketingReveal>

      <MarketingReveal>
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
      </MarketingReveal>

      <MarketingStagger className="grid gap-4 md:grid-cols-2">
        <MarketingStaggerItem hoverLift>
          <div className="space-y-4">
            <AudienceCard icon={Building2} title={content.managersAudience.title}>
              {content.managersAudience.forWhom}
            </AudienceCard>
            <BenefitList items={[...content.managersAudience.benefits]} />
          </div>
        </MarketingStaggerItem>
        <MarketingStaggerItem hoverLift>
          <div className="space-y-4">
            <AudienceCard icon={Wrench} title={content.contractorsAudience.title}>
              {content.contractorsAudience.forWhom}
            </AudienceCard>
            <BenefitList items={[...content.contractorsAudience.benefits]} />
          </div>
        </MarketingStaggerItem>
      </MarketingStagger>

      <MarketingReveal>
        <ContentSection title={content.stepsTitle}>
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
            <HelpTimeline steps={[...content.steps]} />
          </div>
        </ContentSection>
      </MarketingReveal>

      <MarketingReveal>
        <ContentSection title={content.faqTitle}>
          <FaqAccordion items={[...content.faqItems]} />
        </ContentSection>
      </MarketingReveal>

      <MarketingReveal>
        <ContentSection
          id={PILOT_JOIN_ANCHOR}
          title={content.joinTitle}
          variant="accent-border"
          className="scroll-mt-24"
        >
          <p className="text-sm text-muted-foreground sm:text-base">{content.joinIntro}</p>
          <PilotJoinCta />
        </ContentSection>
      </MarketingReveal>

      <MarketingReveal>
        <ContentSection title="Przydatne strony">
          <PilotUsefulLinks />
        </ContentSection>
      </MarketingReveal>
    </>
  );
}
