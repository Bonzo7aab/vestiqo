import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface AdminPageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  aside?: ReactNode;
}

export function AdminPageHeader({ icon: Icon, title, description, aside }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}
