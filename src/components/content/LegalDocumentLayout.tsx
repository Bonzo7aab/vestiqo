import type { ReactNode } from 'react';
import type { LegalSection } from '../../lib/content/legal-content';
import { MarketingPageLayout } from './MarketingPageLayout';
import { ContentSection } from './ContentSection';

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
      ? 'text-xl font-semibold text-[hsl(var(--brand-navy))] sm:text-2xl'
      : 'text-lg font-semibold text-[hsl(var(--brand-navy))]';

  return (
    <div key={section.title} className="space-y-3">
      <Heading className={headingClass}>{section.title}</Heading>
      {section.paragraphs?.map((paragraph) => (
        <p key={paragraph.slice(0, 40)} className="text-sm leading-relaxed text-foreground sm:text-base">
          {paragraph}
        </p>
      ))}
      {section.list ? (
        <ul className="list-disc space-y-2 pl-6 text-sm leading-relaxed text-foreground sm:text-base">
          {section.list.map((item) => (
            <li key={item.slice(0, 40)}>{item}</li>
          ))}
        </ul>
      ) : null}
      {section.subsections?.map((subsection) => renderSection(subsection, depth + 1))}
    </div>
  );
}

export function LegalDocumentLayout({
  title,
  description,
  sections,
  footerNote,
}: LegalDocumentLayoutProps) {
  return (
    <MarketingPageLayout title={title} description={description}>
      {footerNote ? <div className="text-sm text-muted-foreground">{footerNote}</div> : null}
      <div className="space-y-8">
        {sections.map((section) => (
          <ContentSection key={section.title} variant="muted">
            {renderSection(section)}
          </ContentSection>
        ))}
      </div>
    </MarketingPageLayout>
  );
}
