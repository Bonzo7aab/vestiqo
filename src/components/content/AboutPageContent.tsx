import Link from 'next/link';
import {
  Building2,
  Eye,
  FileSearch,
  Handshake,
  Lock,
  Mail,
  Scale,
  Shield,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { aboutPageContent } from '../../lib/content/o-nas';
import { routes } from '../../lib/routes';
import { ContentSection } from './ContentSection';
import {
  AudienceCard,
  FeatureCard,
  HighlightCallout,
  MarketingHeroIntro,
} from './marketing-primitives';

const PAIN_POINT_ICONS: LucideIcon[] = [Mail, Eye, FileSearch];
const MISSION_ICONS: LucideIcon[] = [Scale, Sparkles, Lock];
const AUDIENCE_ICONS: LucideIcon[] = [Building2, Wrench];

export function AboutPageContent() {
  const content = aboutPageContent;

  return (
    <>
      <MarketingHeroIntro
        icon={Handshake}
        chips={[
          { icon: Shield, label: 'Przejrzystość' },
          { icon: Users, label: 'Dwie strony rynku' },
          { icon: Sparkles, label: 'Proces cyfrowy' },
        ]}
      >
        {content.intro}
      </MarketingHeroIntro>

      <ContentSection title={content.whyWeExist.title} variant="muted">
        <p className="text-base">{content.whyWeExist.intro}</p>
        <div className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
          {content.whyWeExist.painPoints.map((point, index) => {
            const Icon = PAIN_POINT_ICONS[index] ?? Mail;
            return (
              <FeatureCard key={point.title} icon={Icon} title={point.title}>
                {point.text}
              </FeatureCard>
            );
          })}
        </div>
        <HighlightCallout>{content.whyWeExist.closing}</HighlightCallout>
      </ContentSection>

      <ContentSection title={content.mission.title}>
        <p className="text-base">{content.mission.intro}</p>
        <div className="grid gap-4 pt-2 md:grid-cols-3">
          {content.mission.highlights.map((item, index) => {
            const Icon = MISSION_ICONS[index] ?? Shield;
            return (
              <FeatureCard key={item.title} icon={Icon} title={item.title} accent="navy">
                {item.text}
              </FeatureCard>
            );
          })}
        </div>
      </ContentSection>

      <ContentSection title={content.twoWorlds.title} variant="accent-border">
        <p className="text-base">{content.twoWorlds.intro}</p>
        <div className="grid gap-4 pt-2 md:grid-cols-2">
          {content.twoWorlds.audiences.map((item, index) => {
            const Icon = AUDIENCE_ICONS[index] ?? Users;
            return (
              <AudienceCard key={item.title} icon={Icon} title={item.title}>
                {item.text}
              </AudienceCard>
            );
          })}
        </div>
      </ContentSection>

      <ContentSection title="Poznaj kolejne kroki">
        <ul className="grid gap-3 sm:grid-cols-2">
          <li>
            <Link href={routes.dlaWspolnot} className="text-primary hover:underline">
              Rozwiązania dla wspólnot i spółdzielni mieszkaniowych
            </Link>
          </li>
          <li>
            <Link href={routes.dlaWykonawcow} className="text-primary hover:underline">
              Strefa wykonawców i firm usługowych
            </Link>
          </li>
          <li>
            <Link href={routes.aktualnosci} className="text-primary hover:underline">
              Aktualności i poradniki Vestiqo
            </Link>
          </li>
          <li>
            <Link href={routes.kontakt} className="text-primary hover:underline">
              Skontaktuj się z zespołem
            </Link>
          </li>
        </ul>
      </ContentSection>
    </>
  );
}
