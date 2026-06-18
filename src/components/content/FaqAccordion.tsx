'use client';

import Link from 'next/link';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import type { FaqItem } from '../../lib/content/support-pages';

interface FaqAccordionProps {
  items: FaqItem[];
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  return (
    <Accordion type="single" collapsible className="w-full">
      {items.map((item) => (
        <AccordionItem key={item.id} value={item.id}>
          <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed">
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

interface FaqSectionProps {
  id: string;
  title: string;
  items: FaqItem[];
}

export function FaqSection({ id, title, items }: FaqSectionProps) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <h2 className="text-2xl font-semibold text-[hsl(var(--brand-navy))]">{title}</h2>
      <FaqAccordion items={items} />
    </section>
  );
}

interface HelpPageCtaProps {
  text: string;
  buttonLabel: string;
  href: string;
}

export function HelpPageCta({ text, buttonLabel, href }: HelpPageCtaProps) {
  return (
    <div className="rounded-lg border border-[hsl(var(--brand-navy))]/20 bg-muted/50 p-6 text-center">
      <p className="mb-4 text-muted-foreground">{text}</p>
      <Link
        href={href}
        className="inline-flex items-center justify-center rounded-md bg-[hsl(var(--brand-navy))] px-6 py-3 text-sm font-medium text-white hover:opacity-90"
      >
        {buttonLabel}
      </Link>
    </div>
  );
}
