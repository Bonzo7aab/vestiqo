'use client';

import { ArrowRight, type LucideIcon } from 'lucide-react';
import type { ReactElement } from 'react';
import { cn } from '../ui/utils';

export interface ContestFlowStep {
  title: string;
  description: string;
  icon: LucideIcon;
}

interface ContestFlowStepperProps {
  title: string;
  titleIcon: LucideIcon;
  steps: ContestFlowStep[];
  className?: string;
}

export function ContestFlowStepper({
  title,
  titleIcon: TitleIcon,
  steps,
  className,
}: ContestFlowStepperProps): ReactElement {
  return (
    <div className={cn('rounded-lg border border-border bg-card p-4 shadow-sm', className)}>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <TitleIcon className="h-4 w-4" aria-hidden />
        </span>
        <h3 className="text-sm font-semibold text-brand-navy sm:text-base">
          {title}
        </h3>
      </div>

      <ol className="flex snap-x snap-mandatory items-start gap-1 overflow-x-auto pb-1 sm:gap-2 sm:overflow-visible">
        {steps.map((step, index) => {
          const StepIcon = step.icon;

          return (
            <li
              key={step.title}
              className={cn(
                'flex min-w-[7.5rem] flex-1 snap-start flex-col items-center gap-1.5 text-center sm:min-w-0',
                index < steps.length - 1 && 'relative',
              )}
            >
              {index < steps.length - 1 ? (
                <>
                  <span
                    className="absolute left-[calc(50%+18px)] right-[calc(-50%+18px)] top-5 hidden h-0.5 bg-border sm:block"
                    aria-hidden
                  />
                  <ArrowRight
                    className="absolute -right-1 top-4 h-3.5 w-3.5 text-muted-foreground/60 sm:hidden"
                    aria-hidden
                  />
                </>
              ) : null}

              <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary/30 bg-card text-primary">
                <StepIcon className="h-4 w-4" aria-hidden />
              </span>

              <div className="min-w-0 px-0.5">
                <p className="text-[11px] font-medium leading-tight text-foreground sm:text-xs">
                  {step.title}
                </p>
                <p className="mt-0.5 hidden text-[10px] leading-snug text-muted-foreground sm:block sm:text-xs">
                  {step.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
