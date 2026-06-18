import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import type { LegalSection } from '../../lib/content/legal-content';

interface LegalDocumentLayoutProps {
  title: string;
  description: string;
  sections: LegalSection[];
  footerNote?: ReactNode;
}

function renderSection(section: LegalSection, depth = 0): ReactNode {
  const Heading = depth === 0 ? 'h2' : 'h3';
  const headingClass =
    depth === 0
      ? 'text-2xl font-semibold text-[hsl(var(--brand-navy))] mb-4'
      : 'text-xl font-semibold text-[hsl(var(--brand-navy))] mb-3';

  return (
    <section key={section.title} className="space-y-3">
      <Heading className={headingClass}>{section.title}</Heading>
      {section.paragraphs?.map((paragraph) => (
        <p key={paragraph.slice(0, 40)} className="text-foreground leading-relaxed">
          {paragraph}
        </p>
      ))}
      {section.list ? (
        <ul className="list-disc space-y-2 pl-6 text-foreground leading-relaxed">
          {section.list.map((item) => (
            <li key={item.slice(0, 40)}>{item}</li>
          ))}
        </ul>
      ) : null}
      {section.subsections?.map((subsection) => renderSection(subsection, depth + 1))}
    </section>
  );
}

export function LegalDocumentLayout({
  title,
  description,
  sections,
  footerNote,
}: LegalDocumentLayoutProps) {
  return (
    <div className="min-h-screen bg-muted/40 py-12 md:py-16">
      <div className="container mx-auto max-w-4xl px-4">
        <Card className="border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-[hsl(var(--brand-navy))]">
              {title}
            </CardTitle>
            <p className="text-muted-foreground">{description}</p>
            {footerNote}
          </CardHeader>
          <CardContent className="space-y-8">{sections.map((section) => renderSection(section))}</CardContent>
        </Card>
      </div>
    </div>
  );
}
