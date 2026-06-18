import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

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

export function StaticInfoPage({
  title,
  description,
  children,
}: StaticInfoPageProps) {
  return (
    <div className="min-h-screen bg-muted/40 py-12 md:py-16">
      <div className="container mx-auto max-w-4xl px-4">
        <Card className="border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-[hsl(var(--brand-navy))]">
              {title}
            </CardTitle>
            <p className="text-muted-foreground">{description}</p>
          </CardHeader>
          <CardContent className="space-y-4 text-foreground leading-relaxed">
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
