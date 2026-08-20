import { Button } from '../ui/button';
import { formatScheduleOffsetLabel } from '../../lib/contest/contest-schedule-dates';
import { cn } from '../ui/utils';

interface ScheduleDateOffsetChipsProps {
  offsets: readonly number[];
  disabled?: boolean;
  /** Currently selected offset in days (visual pressed/selected state). */
  selectedOffsetDays?: number | null;
  onSelect: (offsetDays: number) => void;
}

export function ScheduleDateOffsetChips({
  offsets,
  disabled = false,
  selectedOffsetDays = null,
  onSelect,
}: ScheduleDateOffsetChipsProps): React.ReactElement {
  return (
    <div className="mt-2 flex flex-wrap gap-2" role="group">
      {offsets.map((days) => {
        const isSelected = selectedOffsetDays === days;
        return (
          <Button
            key={days}
            type="button"
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            disabled={disabled}
            aria-pressed={isSelected}
            className={cn(
              'h-8 px-2.5 text-xs font-normal',
              isSelected && 'ring-2 ring-primary/30 ring-offset-1',
            )}
            onClick={() => onSelect(days)}
          >
            {formatScheduleOffsetLabel(days)}
          </Button>
        );
      })}
    </div>
  );
}
