import { Unlock, CheckCircle2, XCircle, FilePenLine } from 'lucide-react';
import type { ReactElement } from 'react';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import { getContestWorkflowStatusLabel } from '../../lib/tender-workflow-status';

interface ContestStatusBadgeProps {
  status: string;
  prominent?: boolean;
}

const BADGE_NOWRAP = 'shrink-0 whitespace-nowrap';

export function ContestStatusBadge({ status, prominent = false }: ContestStatusBadgeProps): ReactElement {
  const label = getContestWorkflowStatusLabel(status);
  const prominentClass = prominent
    ? 'px-1.5 py-0.5 text-[10px] font-semibold leading-none'
    : 'font-normal';
  const prominentIconClass = prominent ? 'h-2.5 w-2.5' : 'h-3 w-3';

  if (status === 'draft') {
    return (
      <Badge
        variant="outline"
        className={cn(
          'gap-1 bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900/50 dark:text-slate-200',
          prominent && 'border-slate-400 bg-slate-200 dark:bg-slate-800',
          prominentClass,
          BADGE_NOWRAP,
        )}
      >
        <FilePenLine className={prominentIconClass} aria-hidden />
        {label}
      </Badge>
    );
  }

  if (status === 'active') {
    return (
      <Badge
        variant={prominent ? 'default' : 'secondary'}
        className={cn(
          prominent && 'bg-primary text-primary-foreground hover:bg-primary/90',
          prominentClass,
          BADGE_NOWRAP,
        )}
      >
        {label}
      </Badge>
    );
  }

  if (status === 'evaluation') {
    return (
      <Badge
        variant="default"
        className={cn(
          'gap-1',
          prominent && 'bg-info text-info-foreground hover:bg-info/90',
          prominentClass,
          BADGE_NOWRAP,
        )}
      >
        <Unlock className={prominentIconClass} aria-hidden />
        {label}
      </Badge>
    );
  }

  if (status === 'no_offers') {
    return (
      <Badge
        variant="outline"
        className={cn(
          'gap-1 text-muted-foreground border-muted-foreground/40',
          prominent && 'border-foreground/30 bg-muted text-foreground',
          prominentClass,
          BADGE_NOWRAP,
        )}
      >
        <XCircle className={prominentIconClass} aria-hidden />
        {label}
      </Badge>
    );
  }

  if (status === 'awarded') {
    return (
      <Badge
        variant="outline"
        className={cn(
          'gap-1 border-green-600 text-green-700',
          prominent && 'border-green-600 bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300',
          prominentClass,
          BADGE_NOWRAP,
        )}
      >
        <CheckCircle2 className={prominentIconClass} aria-hidden />
        {label}
      </Badge>
    );
  }

  if (status === 'cancelled') {
    return (
      <Badge
        variant="outline"
        className={cn(
          'gap-1 text-destructive border-destructive/40',
          prominent && 'border-destructive bg-destructive/10',
          prominentClass,
          BADGE_NOWRAP,
        )}
      >
        <XCircle className={prominentIconClass} aria-hidden />
        {label}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn(prominentClass, BADGE_NOWRAP)}>
      {label}
    </Badge>
  );
}
