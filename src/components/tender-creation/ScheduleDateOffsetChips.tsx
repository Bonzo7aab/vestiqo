import { Button } from '../ui/button';
import { formatScheduleOffsetLabel } from '../../lib/contest/contest-schedule-dates';

interface ScheduleDateOffsetChipsProps {
  offsets: readonly number[];
  disabled?: boolean;
  onSelect: (offsetDays: number) => void;
}

export function ScheduleDateOffsetChips({
  offsets,
  disabled = false,
  onSelect,
}: ScheduleDateOffsetChipsProps): React.ReactElement {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {offsets.map((days) => (
        <Button
          key={days}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-8 px-2.5 text-xs font-normal"
          onClick={() => onSelect(days)}
        >
          {formatScheduleOffsetLabel(days)}
        </Button>
      ))}
    </div>
  );
}
