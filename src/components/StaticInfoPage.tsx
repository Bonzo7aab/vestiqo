import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { MarketingPageLayout } from './content/MarketingPageLayout';

interface StaticInfoPageProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function staticInfoMetadata(
  title: string,
  description: string,
): Metadata {
  return {
    title: `${title} - Vestiqo`,
    description,
  };
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
