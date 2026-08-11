'use client';

import { ArrowRight, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
  /** When false, steps render without entrance animation (avoids hydration mismatch). */
  animateSteps?: boolean;
  /** Base delay (s) before the step items start staggering in. */
  stepAnimationDelay?: number;
  /** Delay (ms) before the highlight loop begins. */
  loopStartDelayMs?: number;
}

const STEP_HIGHLIGHT_MS = 5000;
const DEFAULT_LOOP_START_DELAY_MS = 900;
const SMOOTH_EASE = [0.4, 0, 0.2, 1] as const;
const DOT_ENTER_EASE = [0.34, 1.1, 0.64, 1] as const;
const DOT_ENTER_DURATION_S = 1.25;
const DOT_EXIT_DURATION_S = 0.85;

export function ContestFlowStepper({
  title,
  titleIcon: TitleIcon,
  steps,
  className,
  animateSteps = false,
  stepAnimationDelay = 0,
  loopStartDelayMs = DEFAULT_LOOP_START_DELAY_MS,
}: ContestFlowStepperProps): ReactElement {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lineProgress, setLineProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const hasLoopStartedRef = useRef(false);
  const stepStartedAtRef = useRef(0);
  const accumulatedPauseMsRef = useRef(0);
  const pauseStartedAtRef = useRef<number | null>(null);
  const activeIndexRef = useRef(0);
  const isHoveredRef = useRef(false);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  const resetStepTimer = (): void => {
    stepStartedAtRef.current = Date.now();
    accumulatedPauseMsRef.current = 0;
    pauseStartedAtRef.current = null;
    setLineProgress(0);
  };

  useEffect(() => {
    if (!animateSteps || steps.length <= 1) return;

    let rafId = 0;

    const tick = (): void => {
      if (isHoveredRef.current) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const elapsed =
        Date.now() - stepStartedAtRef.current - accumulatedPauseMsRef.current;
      const progress = Math.min(elapsed / STEP_HIGHLIGHT_MS, 1);
      setLineProgress(progress);

      if (progress >= 1) {
        const nextIndex = (activeIndexRef.current + 1) % steps.length;
        activeIndexRef.current = nextIndex;
        setActiveIndex(nextIndex);
        stepStartedAtRef.current = Date.now();
        accumulatedPauseMsRef.current = 0;
        pauseStartedAtRef.current = null;
        setLineProgress(0);
      }

      rafId = requestAnimationFrame(tick);
    };

    const startDelay = hasLoopStartedRef.current ? 0 : loopStartDelayMs;

    const startTimeout = setTimeout(() => {
      hasLoopStartedRef.current = true;
      resetStepTimer();
      rafId = requestAnimationFrame(tick);
    }, startDelay);

    return () => {
      clearTimeout(startTimeout);
      cancelAnimationFrame(rafId);
    };
  }, [animateSteps, loopStartDelayMs, steps.length]);

  const handleMouseEnter = (): void => {
    pauseStartedAtRef.current = Date.now();
    isHoveredRef.current = true;
    setIsHovered(true);
  };

  const handleMouseLeave = (): void => {
    if (pauseStartedAtRef.current !== null) {
      accumulatedPauseMsRef.current += Date.now() - pauseStartedAtRef.current;
      pauseStartedAtRef.current = null;
    }
    isHoveredRef.current = false;
    setIsHovered(false);
  };

  const activeStep = steps[activeIndex];
  const loopPaused = isHovered || !animateSteps;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'group rounded-2xl border border-border/60 bg-card/70 p-4 shadow-xl shadow-brand-navy/5 backdrop-blur-md',
        'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-brand-navy/10',
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-info/15 text-primary ring-1 ring-primary/20">
          <TitleIcon className="h-4 w-4" aria-hidden />
        </span>
        <h3 className="text-sm font-semibold text-brand-navy sm:text-base">
          {title}
        </h3>
      </div>

      <div
        className="relative mb-3 h-[5rem] sm:h-[4.5rem]"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="absolute inset-0 overflow-hidden rounded-lg border border-primary/15 bg-primary/5 shadow-sm">
          <AnimatePresence initial={false}>
            {activeStep ? (
              <motion.div
                key={`${title}-${activeIndex}`}
                initial={animateSteps && !loopPaused ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                exit={animateSteps && !loopPaused ? { opacity: 0 } : undefined}
                transition={{ duration: 0.55, ease: SMOOTH_EASE }}
                className="absolute inset-0 flex flex-col justify-center px-3 py-2"
              >
                <p className="text-[11px] font-medium text-brand-navy sm:text-xs">
                  {activeStep.title}
                </p>
                <p className="mt-1 line-clamp-3 text-[10px] leading-snug text-muted-foreground sm:text-xs">
                  {activeStep.description}
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <ol className="flex snap-x snap-mandatory items-start gap-1 overflow-x-auto pb-1 sm:gap-2 sm:overflow-visible">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = index === activeIndex;
          const isCompleted = index < activeIndex;

          return (
            <motion.li
              key={step.title}
              initial={animateSteps ? { opacity: 0, y: 10, scale: 0.96 } : false}
              animate={animateSteps ? { opacity: 1, y: 0, scale: 1 } : false}
              transition={{
                duration: 0.5,
                delay: animateSteps ? stepAnimationDelay + index * 0.1 : 0,
                ease: SMOOTH_EASE,
              }}
              className={cn(
                'flex min-w-[7.5rem] flex-1 snap-start flex-col items-center gap-1.5 text-center sm:min-w-0',
                index < steps.length - 1 && 'relative',
              )}
            >
              {index < steps.length - 1 ? (
                <>
                  <span
                    className="absolute left-[calc(50%+18px)] right-[calc(-50%+18px)] top-5 hidden h-0.5 overflow-hidden rounded-full bg-border/70 sm:block"
                    aria-hidden
                  >
                    <motion.span
                      className="block h-full w-full origin-left rounded-full bg-gradient-to-r from-primary via-primary to-primary/80"
                      initial={false}
                      animate={{
                        scaleX: isActive ? lineProgress : isCompleted ? 1 : 0,
                      }}
                      transition={
                        isActive
                          ? { duration: 0.08, ease: 'linear' }
                          : { duration: 0.5, ease: SMOOTH_EASE }
                      }
                    />
                  </span>
                  <ArrowRight
                    className={cn(
                      'absolute -right-1 top-4 h-3.5 w-3.5 transition-colors duration-500 sm:hidden',
                      isActive || isCompleted ? 'text-primary' : 'text-muted-foreground/50',
                    )}
                    aria-hidden
                  />
                </>
              ) : null}

              <motion.span
                animate={
                  animateSteps && isActive && !loopPaused
                    ? {
                        scale: [0.94, 1.04, 1],
                        opacity: [0, 1, 1],
                        boxShadow: [
                          '0 0 0 0 hsl(var(--primary) / 0)',
                          '0 4px 18px hsl(var(--primary) / 0.2)',
                          '0 2px 10px hsl(var(--primary) / 0.12)',
                        ],
                      }
                    : {
                        scale: 1,
                        opacity: isActive ? 1 : isCompleted ? 0.68 : 0.38,
                        boxShadow: isActive
                          ? '0 2px 10px hsl(var(--primary) / 0.12)'
                          : '0 0 0 0 hsl(var(--primary) / 0)',
                      }
                }
                transition={
                  animateSteps && isActive && !loopPaused
                    ? {
                        duration: DOT_ENTER_DURATION_S,
                        ease: DOT_ENTER_EASE,
                        times: [0, 0.5, 1],
                      }
                    : { duration: DOT_EXIT_DURATION_S, ease: SMOOTH_EASE }
                }
                className={cn(
                  'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-card text-primary',
                  isActive
                    ? 'border-primary bg-primary/10'
                    : isCompleted
                      ? 'border-primary/35 text-primary/70'
                      : 'border-primary/15 text-primary/35',
                )}
              >
                {animateSteps && isActive && !loopPaused ? (
                  <motion.span
                    key={`dot-ring-${activeIndex}`}
                    className="absolute inset-0 rounded-full border border-primary/20"
                    initial={{ scale: 0.88, opacity: 0 }}
                    animate={{ scale: 1.4, opacity: 0 }}
                    transition={{ duration: 1.6, ease: 'easeOut' }}
                    aria-hidden
                  />
                ) : null}
                <motion.span
                  animate={
                    animateSteps && isActive && !loopPaused
                      ? { scale: [0.88, 1.06, 1], opacity: [0, 1, 1] }
                      : { scale: 1, opacity: isActive ? 1 : isCompleted ? 0.65 : 0.35 }
                  }
                  transition={
                    animateSteps && isActive && !loopPaused
                      ? {
                          duration: DOT_ENTER_DURATION_S,
                          ease: DOT_ENTER_EASE,
                          times: [0, 0.45, 1],
                        }
                      : { duration: DOT_EXIT_DURATION_S, ease: SMOOTH_EASE }
                  }
                  className="relative flex items-center justify-center"
                >
                  <StepIcon className="h-4 w-4" aria-hidden />
                </motion.span>
              </motion.span>

              <div className="min-w-0 px-0.5">
                <motion.p
                  animate={{
                    opacity: isActive ? 1 : isCompleted ? 0.65 : 0.4,
                  }}
                  transition={{
                    duration: isActive ? DOT_ENTER_DURATION_S : DOT_EXIT_DURATION_S,
                    ease: SMOOTH_EASE,
                  }}
                  className={cn(
                    'text-[11px] leading-tight transition-colors sm:text-xs',
                    isActive
                      ? 'font-semibold text-brand-navy'
                      : 'font-medium text-muted-foreground/70',
                  )}
                >
                  {step.title}
                </motion.p>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
