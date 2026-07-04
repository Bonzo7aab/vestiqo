import { Layers } from 'lucide-react';
import { CategoryDirectory } from '../../components/content/CategoryDirectory';
import { MarketingHeroIntro } from '../../components/content/marketing-primitives';
import { MarketingPageLayout } from '../../components/content/MarketingPageLayout';
import { serviceCategoriesIntro } from '../../lib/content/dla-uzytkownikow';
import { staticInfoMetadata } from '../../components/StaticInfoPage';
import { categoriesKeywords } from '../../lib/seo-keywords';

export const metadata = staticInfoMetadata(
  'Kategorie usług',
  'Przeglądaj konkursy według kategorii usług w Vestiqo.',
  '/kategorie-uslug',
  { keywords: [...categoriesKeywords] },
);

export default function ServiceCategoriesPage() {
  return (
    <MarketingPageLayout title="Kategorie usług" description={serviceCategoriesIntro}>
      <MarketingHeroIntro icon={Layers}>
        {serviceCategoriesIntro}
      </MarketingHeroIntro>
      <CategoryDirectory />
    </MarketingPageLayout>
  );
}
