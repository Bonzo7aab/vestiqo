import type { AdminUserStatus } from '../../lib/verification/types';
import {
  adminUserStatusBadgeClass,
  adminUserStatusLabel,
} from '../../lib/verification/status';
import { Badge } from '../ui/badge';

interface VerificationStatusBadgeProps {
  state: AdminUserStatus;
  className?: string;
}

export function VerificationStatusBadge({ state, className }: VerificationStatusBadgeProps) {
  return (
    <Badge className={`${adminUserStatusBadgeClass(state)} ${className ?? ''}`}>
      {adminUserStatusLabel(state)}
    </Badge>
  );
}
