import type { ReactNode } from 'react';
import { cn } from '../ui/utils';

interface ContentSectionProps {
  title?: string;
  children: ReactNode;
  variant?: 'default' | 'muted' | 'accent-border';
  id?: string;
  className?: string;
}

export function ContentSection({
  title,
  children,
  variant = 'default',
  id,
  className,
}: ContentSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        'space-y-4 rounded-lg',
        variant === 'muted' && 'bg-muted/60 p-6',
        variant === 'accent-border' &&
          'border-l-4 border-brand-navy bg-muted/40 py-2 pl-6',
        className,
      )}
    >
      {title ? (
        <h2 className="text-xl font-semibold text-brand-navy md:text-2xl">
          {title}
        </h2>
      ) : null}
      <div className="space-y-3 text-foreground leading-relaxed">{children}</div>
    </section>
  );
}
