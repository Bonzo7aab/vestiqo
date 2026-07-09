'use client';

import Link from 'next/link';
import { useSyncExternalStore, type CSSProperties, type ReactElement } from 'react';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { homeHeroContent } from '../lib/content/home-hero';
import { ContestFlowStepper } from './home/ContestFlowStepper';
import { Button } from './ui/button';

/** Phrase inside the headline rendered with a gradient accent. */
const HEADLINE_HIGHLIGHT = 'Konkursy ofert';

const TRUST_ITEMS = [
  'Transparentne konkursy ofert',
  'Bezpieczny proces B2B',
  'Sprawna organizacja przetargów',
];

const GRID_PATTERN_STYLE: CSSProperties = {
  backgroundImage:
    'linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)',
  backgroundSize: '48px 48px',
  maskImage:
    'radial-gradient(ellipse 90% 70% at 50% 35%, black 25%, transparent 78%)',
  WebkitMaskImage:
    'radial-gradient(ellipse 90% 70% at 50% 35%, black 25%, transparent 78%)',
};

function renderHeadline(headline: string): ReactElement {
  const highlightIndex = headline.indexOf(HEADLINE_HIGHLIGHT);

  if (highlightIndex === -1) {
    return <>{headline}</>;
  }

  const before = headline.slice(0, highlightIndex);
  const after = headline.slice(highlightIndex + HEADLINE_HIGHLIGHT.length);

  return (
    <>
      {before}
      <span className="bg-gradient-to-r from-primary via-primary to-info bg-clip-text text-transparent">
        {HEADLINE_HIGHLIGHT}
      </span>
      {after}
    </>
  );
}

function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function HomeHeroSection(): ReactElement {
  const { headline, description, ctas, managerFlow, contractorFlow } = homeHeroContent;
  const shouldReduceMotion = useReducedMotion();
  const isClient = useIsClient();

  const canAnimate = isClient && !shouldReduceMotion;

  const staggerContainer: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: canAnimate ? 0.08 : 0,
        delayChildren: canAnimate ? 0.05 : 0,
      },
    },
  };

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: canAnimate ? 14 : 0 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const cardEnter = (delay: number): Variants => ({
    hidden: {
      opacity: 0,
      x: canAnimate ? 28 : 0,
      y: canAnimate ? 8 : 0,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: 0.6,
        delay: canAnimate ? delay : 0,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  });

  const ambientFloat = canAnimate
    ? {
        y: [0, -18, 0],
        scale: [1, 1.06, 1],
      }
    : undefined;

  return (
    <section
      aria-labelledby="home-hero-heading"
      className="relative overflow-hidden border-b border-border/50"
    >
      {/* Background layers */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/60 via-background to-background" />
        <div className="absolute inset-0 opacity-50" style={GRID_PATTERN_STYLE} />
        <motion.div
          className="absolute -left-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl"
          animate={ambientFloat}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -right-24 top-8 h-[24rem] w-[24rem] rounded-full bg-info/10 blur-3xl"
          animate={ambientFloat}
          transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        />
        <motion.div
          className="absolute bottom-[-10rem] left-1/3 h-[22rem] w-[22rem] rounded-full bg-primary/[0.07] blur-3xl"
          animate={ambientFloat}
          transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        />
      </div>

      <div className="relative mx-auto flex min-h-[50vh] max-w-7xl flex-col justify-center px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.48fr)_minmax(0,0.52fr)] lg:gap-12">
          <motion.div
            className="space-y-5 lg:space-y-6"
            variants={staggerContainer}
            initial={canAnimate ? 'hidden' : false}
            animate={canAnimate ? 'visible' : false}
          >
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary shadow-sm">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Niezależna platforma konkursów ofert B2B
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              id="home-hero-heading"
              className="text-3xl font-bold leading-[1.15] tracking-tight text-brand-navy sm:text-4xl lg:text-5xl"
            >
              {renderHeadline(headline)}
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              {description}
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col gap-3 pt-1">
              {ctas.map((cta) => (
                <motion.div
                  key={cta.href}
                  className="w-fit"
                  whileHover={canAnimate ? { y: -2, scale: 1.02 } : undefined}
                  whileTap={canAnimate ? { scale: 0.98 } : undefined}
                  animate={
                    canAnimate
                      ? {
                          boxShadow: [
                            '0 4px 14px hsl(var(--primary) / 0.18)',
                            '0 8px 22px hsl(var(--primary) / 0.28)',
                            '0 4px 14px hsl(var(--primary) / 0.18)',
                          ],
                        }
                      : undefined
                  }
                  transition={{
                    boxShadow: {
                      duration: 2.6,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    },
                    default: { type: 'spring', stiffness: 420, damping: 28 },
                  }}
                >
                  <Button
                    asChild
                    variant={cta.variant}
                    size="default"
                    className="group rounded-lg px-5 shadow-md shadow-primary/20"
                  >
                    <Link href={cta.href}>
                      {cta.label}
                      <motion.span
                        className="ml-1.5 inline-flex"
                        animate={
                          canAnimate
                            ? { x: [0, 4, 0] }
                            : undefined
                        }
                        transition={{
                          duration: 2.2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        whileHover={canAnimate ? { x: 6 } : undefined}
                      >
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </motion.span>
                    </Link>
                  </Button>
                </motion.div>
              ))}
            </motion.div>

            <motion.ul
              variants={fadeUp}
              className="flex flex-col gap-2 pt-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2"
            >
              {TRUST_ITEMS.map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />
                  {item}
                </li>
              ))}
            </motion.ul>
          </motion.div>

          <div className="space-y-4">
            <motion.div
              variants={cardEnter(0.25)}
              initial={canAnimate ? 'hidden' : false}
              animate={canAnimate ? 'visible' : false}
            >
              <ContestFlowStepper
                title={managerFlow.title}
                titleIcon={managerFlow.icon}
                steps={managerFlow.steps}
                animateSteps={canAnimate}
                stepAnimationDelay={0.45}
              />
            </motion.div>
            <motion.div
              variants={cardEnter(0.4)}
              initial={canAnimate ? 'hidden' : false}
              animate={canAnimate ? 'visible' : false}
              className="lg:ml-8"
            >
              <ContestFlowStepper
                title={contractorFlow.title}
                titleIcon={contractorFlow.icon}
                steps={contractorFlow.steps}
                animateSteps={canAnimate}
                stepAnimationDelay={0.6}
                loopStartDelayMs={3400}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
