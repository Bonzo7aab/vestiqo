import { StaticInfoPage, staticInfoMetadata } from '../../components/StaticInfoPage';
import { CategoryDirectory } from '../../components/content/CategoryDirectory';
import { serviceCategoriesIntro } from '../../lib/content/dla-uzytkownikow';

export const metadata = staticInfoMetadata(
  'Kategorie usług',
  'Przeglądaj konkursy według kategorii usług w Vestiqo.',
);

export default function ServiceCategoriesPage() {
  return (
    <StaticInfoPage title="Kategorie usług" description={serviceCategoriesIntro}>
      <CategoryDirectory />
    </StaticInfoPage>
  );
}
