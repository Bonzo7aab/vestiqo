import { StaticInfoPage, staticInfoMetadata } from '../../components/StaticInfoPage';
import { NewsArticleGrid } from '../../components/content/NewsArticleGrid';
import { newsIntro } from '../../lib/content/aktualnosci';

export const metadata = staticInfoMetadata(
  'Aktualności',
  'Nowości i informacje z platformy Vestiqo.',
);

export default function NewsPage() {
  return (
    <StaticInfoPage title="Aktualności" description={newsIntro}>
      <NewsArticleGrid />
    </StaticInfoPage>
  );
}
