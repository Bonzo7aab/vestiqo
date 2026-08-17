'use client';

import { type ReactElement } from 'react';
import {
  PROFESSIONAL_QUALIFICATION_GROUPS,
  type ProfessionalQualificationOption,
} from '../lib/contractor/constants';
import {
  selectionPillBase,
  selectionPillSelected,
  selectionPillUnselected,
} from '../lib/ui/selection-pill-styles';
import { cn } from './ui/utils';

interface ProfessionalQualificationTypePickerProps {
  selected: string[];
  onToggle: (id: string) => void;
  className?: string;
}

export function ProfessionalQualificationTypePicker({
  selected,
  onToggle,
  className,
}: ProfessionalQualificationTypePickerProps): ReactElement {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
      {PROFESSIONAL_QUALIFICATION_GROUPS.map((group) => (
        <QualificationGroup
          key={group.title}
          title={group.title}
          options={group.options}
          selected={selected}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

function QualificationGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: ProfessionalQualificationOption[];
  selected: string[];
  onToggle: (id: string) => void;
}): ReactElement {
  const selectedInGroup = options.filter((option) => selected.includes(option.id)).length;

  return (
    <section className="rounded-xl border border-border/70 bg-muted/20 p-3 sm:p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        {selectedInGroup > 0 ? (
          <span className="shrink-0 text-[10px] font-medium tabular-nums text-primary">
            {selectedInGroup}/{options.length}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(option.id)}
              className={cn(
                selectionPillBase,
                'text-left text-xs sm:text-sm',
                isSelected ? selectionPillSelected : selectionPillUnselected,
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
