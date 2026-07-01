'use client';

import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@/components/ui/stepper';

interface HelpTimelineStep {
  title: string;
  description: string;
}

interface HelpTimelineProps {
  steps: HelpTimelineStep[];
}

export function HelpTimeline({ steps }: HelpTimelineProps) {
  const stepperSteps = steps.map((step, index) => ({
    id: `step-${index + 1}`,
    title: step.title,
    description: step.description,
  }));

  return (
    <Stepper
      steps={stepperSteps}
      orientation="vertical"
      defaultValue={stepperSteps[stepperSteps.length - 1]?.id}
      className="w-full"
    >
      <StepperNav className="w-full">
        {stepperSteps.map((step, index) => (
          <StepperItem
            key={step.id}
            stepId={step.id}
            completed
            className="w-full items-stretch not-last:flex-none"
          >
            <div className="flex w-full items-start gap-4">
              <div className="flex flex-col items-center">
                <StepperTrigger tabIndex={-1} className="pointer-events-none">
                  <StepperIndicator>{index + 1}</StepperIndicator>
                </StepperTrigger>
                {index < stepperSteps.length - 1 ? (
                  <StepperSeparator className="my-2 h-auto min-h-10 flex-1" />
                ) : null}
              </div>

              <div className="min-w-0 flex-1 pb-8 pt-0.5">
                <StepperTitle className="text-base font-semibold text-brand-navy">
                  {step.title}
                </StepperTitle>
                <StepperDescription className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </StepperDescription>
              </div>
            </div>
          </StepperItem>
        ))}
      </StepperNav>
    </Stepper>
  );
}
