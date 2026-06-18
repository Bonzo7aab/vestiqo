import Link from 'next/link';
import {
  newsArticles,
  newsCategoryStyles,
  type NewsArticle,
} from '../../lib/content/aktualnosci';
import { routes } from '../../lib/routes';

interface NewsArticleCardProps {
  article: NewsArticle;
}

function NewsArticleCard({ article }: NewsArticleCardProps) {
  return (
    <article className="flex flex-col rounded-lg border border-border bg-card p-5 shadow-sm">
      <span
        className={`mb-3 inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${newsCategoryStyles[article.category]}`}
      >
        {article.category}
      </span>
      <h2 className="text-lg font-semibold text-[hsl(var(--brand-navy))]">{article.title}</h2>
      <p className="mt-2 flex-1 text-sm text-muted-foreground leading-relaxed">
        {article.excerpt}
      </p>
      <Link
        href={`${routes.aktualnosci}/${article.slug}`}
        className="mt-4 text-sm font-medium text-primary hover:underline"
      >
        Czytaj więcej
      </Link>
    </article>
  );
}

export function NewsArticleGrid() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {newsArticles.map((article) => (
        <NewsArticleCard key={article.slug} article={article} />
      ))}
    </div>
  );
}
