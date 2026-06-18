import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StaticInfoPage, staticInfoMetadata } from '../../../components/StaticInfoPage';
import { newsArticles, newsCategoryStyles } from '../../../lib/content/aktualnosci';
import { routes } from '../../../lib/routes';

interface NewsArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return newsArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: NewsArticlePageProps) {
  const { slug } = await params;
  const article = newsArticles.find((item) => item.slug === slug);
  if (!article) {
    return staticInfoMetadata('Aktualności', 'Artykuł nie został znaleziony.');
  }
  return staticInfoMetadata(article.title, article.excerpt);
}

export default async function NewsArticlePage({ params }: NewsArticlePageProps) {
  const { slug } = await params;
  const article = newsArticles.find((item) => item.slug === slug);

  if (!article) {
    notFound();
  }

  return (
    <StaticInfoPage title={article.title} description={article.excerpt}>
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${newsCategoryStyles[article.category]}`}
      >
        {article.category}
      </span>
      <div className="space-y-4">
        {article.body.map((paragraph) => (
          <p key={paragraph.slice(0, 48)}>{paragraph}</p>
        ))}
      </div>
      <p>
        <Link href={routes.aktualnosci} className="font-medium text-primary hover:underline">
          ← Wróć do aktualności
        </Link>
      </p>
    </StaticInfoPage>
  );
}
