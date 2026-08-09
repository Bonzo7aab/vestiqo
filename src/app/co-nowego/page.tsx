import { ChangelogTimeline } from '../../components/content/ChangelogTimeline';
import { MarketingPageLayout } from '../../components/content/MarketingPageLayout';
import { staticInfoMetadata } from '../../components/StaticInfoPage';
import { changelogIntro } from '../../lib/content/co-nowego';
import { changelogKeywords } from '../../lib/seo-keywords';

export const metadata = staticInfoMetadata(
  'Co nowego',
  'Przegląd nowości i ulepszeń platformy Vestiqo — prosto i czytelnie dla zarządców oraz wykonawców.',
  '/co-nowego',
  { keywords: [...changelogKeywords] },
);

export default function ChangelogPage() {
  return (
    <MarketingPageLayout title="Co nowego" description={changelogIntro}>
      <ChangelogTimeline />
    </MarketingPageLayout>
  );
}
