import { StaticInfoPage, staticInfoMetadata } from '../../components/StaticInfoPage';
import { NewsArticleGrid } from '../../components/content/NewsArticleGrid';
import { newsIntro } from '../../lib/content/aktualnosci';
import { newsKeywords } from '../../lib/seo-keywords';

export const metadata = staticInfoMetadata(
  'Aktualności',
  'Nowości i informacje z platformy Vestiqo.',
  '/aktualnosci',
  { keywords: [...newsKeywords] },
);

export default function NewsPage() {
  return (
    <StaticInfoPage title="Aktualności" description={newsIntro}>
      <NewsArticleGrid />
    </StaticInfoPage>
  );
}
