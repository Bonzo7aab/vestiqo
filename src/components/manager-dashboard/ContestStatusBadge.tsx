import { Unlock, CheckCircle2, XCircle, FilePenLine } from 'lucide-react';
import type { ReactElement } from 'react';
import { Badge } from '../ui/badge';
import { getContestWorkflowStatusLabel } from '../../lib/tender-workflow-status';

interface ContestStatusBadgeProps {
  status: string;
}

const BADGE_NOWRAP = 'shrink-0 whitespace-nowrap';

export function ContestStatusBadge({ status }: ContestStatusBadgeProps): ReactElement {
  const label = getContestWorkflowStatusLabel(status);

  if (status === 'draft') {
    return (
      <Badge variant="outline" className={`gap-1 font-normal bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900/50 dark:text-slate-200 ${BADGE_NOWRAP}`}>
        <FilePenLine className="h-3 w-3" aria-hidden />
        {label}
      </Badge>
    );
  }

  if (status === 'active') {
    return (
      <Badge variant="secondary" className={`font-normal ${BADGE_NOWRAP}`}>
        {label}
      </Badge>
    );
  }

  if (status === 'evaluation') {
    return (
      <Badge variant="default" className={`gap-1 font-normal ${BADGE_NOWRAP}`}>
        <Unlock className="h-3 w-3" aria-hidden />
        {label}
      </Badge>
    );
  }

  if (status === 'awarded') {
    return (
      <Badge variant="outline" className={`gap-1 font-normal border-green-600 text-green-700 ${BADGE_NOWRAP}`}>
        <CheckCircle2 className="h-3 w-3" aria-hidden />
        {label}
      </Badge>
    );
  }

  if (status === 'cancelled') {
    return (
      <Badge variant="outline" className={`gap-1 font-normal text-destructive border-destructive/40 ${BADGE_NOWRAP}`}>
        <XCircle className="h-3 w-3" aria-hidden />
        {label}
      </Badge>
    );
  }

  return <Badge variant="outline" className={BADGE_NOWRAP}>{label}</Badge>;
}
