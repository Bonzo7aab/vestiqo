import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../ui/utils';

interface AdminPanelCardProps {
  title?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
  className?: string;
}

export function AdminPanelCard({
  title,
  children,
  contentClassName = 'p-4',
  className,
}: AdminPanelCardProps) {
  return (
    <Card className={cn('gap-0 shadow-sm', className)}>
      {title ? (
        <CardHeader className="border-b px-4 py-3.5">
          <CardTitle className="text-sm font-medium text-brand-navy">{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}
