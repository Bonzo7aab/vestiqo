import { cn } from '../ui/utils';

interface HousingSummaryItem {
  label: string;
  value: number;
}

interface HousingSummaryStripProps {
  items: HousingSummaryItem[];
}

export function HousingSummaryStrip({ items }: HousingSummaryStripProps) {
  if (items.length === 0) return null;

  return (
    <dl className={cn('grid grid-cols-2 gap-3', items.length > 2 && 'sm:grid-cols-3')}>
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border bg-card px-4 py-3">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="mt-1 text-lg font-semibold tracking-tight text-brand-navy">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
