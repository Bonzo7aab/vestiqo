import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface AdminPanelCardProps {
  title?: ReactNode;
  children: ReactNode;
}

export function AdminPanelCard({ title, children }: AdminPanelCardProps) {
  return (
    <Card>
      {title ? (
        <CardHeader className="border-b py-3">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}
