import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { MarketingPageLayout } from './content/MarketingPageLayout';
import { buildPageMetadata } from '../lib/seo';

interface StaticInfoPageProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function staticInfoMetadata(
  title: string,
  description: string,
  pathname: string = '/',
  options?: {
    keywords?: string[]
    type?: 'website' | 'article'
  },
): Metadata {
  return buildPageMetadata({
    title,
    description,
    pathname,
    keywords: options?.keywords,
    type: options?.type,
  });
}

/** @deprecated Prefer MarketingPageLayout directly for new static pages. */
export function StaticInfoPage({
  title,
  description,
  children,
}: StaticInfoPageProps) {
  return (
    <MarketingPageLayout title={title} description={description}>
      {children}
    </MarketingPageLayout>
  );
}
