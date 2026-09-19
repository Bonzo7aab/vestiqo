import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import {
  computeInspectionStatus,
  inspectionStatusLabel,
  worstInspectionStatus,
  type BuildingInspectionStatus,
  type ManagedBuildingInspection,
} from '../../types/managed-building';

export function inspectionBadgeClass(status: BuildingInspectionStatus): string {
  switch (status) {
    case 'current':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'upcoming':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'overdue':
      return 'border-red-200 bg-red-50 text-red-800';
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
}

interface InspectionStatusBadgeProps {
  inspections?: ManagedBuildingInspection[];
  className?: string;
}

export function InspectionStatusBadge({ inspections, className }: InspectionStatusBadgeProps) {
  const status = worstInspectionStatus(
    (inspections ?? []).map((item) => computeInspectionStatus(item.next_inspected_at)),
  );

  return (
    <Badge variant="outline" className={cn('font-normal', inspectionBadgeClass(status), className)}>
      {inspectionStatusLabel(status)}
    </Badge>
  );
}
