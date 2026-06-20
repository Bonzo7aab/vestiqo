'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
import { homeHeroContent } from '../lib/content/home-hero';
import { ContestFlowStepper } from './home/ContestFlowStepper';
import { Button } from './ui/button';
import { cn } from './ui/utils';

export function HomeHeroSection(): ReactElement {
  const { headline, description, ctas, managerFlow, contractorFlow } = homeHeroContent;

  return (
    <section
      aria-labelledby="home-hero-heading"
      className="border-b border-border bg-muted/30"
    >
      <div className="mx-auto flex min-h-[50vh] max-w-7xl flex-col justify-center px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)] lg:gap-10">
          <div className="space-y-4 lg:space-y-6">
            <h1
              id="home-hero-heading"
              className="text-2xl font-bold leading-tight text-[hsl(var(--brand-navy))] sm:text-3xl lg:text-4xl"
            >
              {headline}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {description}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {ctas.map((cta) => (
                <Button
                  key={cta.href}
                  asChild
                  variant={cta.variant}
                  size="lg"
                  className={cn(cta.variant === 'default' && 'sm:min-w-[10rem]')}
                >
                  <Link href={cta.href}>{cta.label}</Link>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <ContestFlowStepper
              title={managerFlow.title}
              titleIcon={managerFlow.icon}
              steps={managerFlow.steps}
            />
            <ContestFlowStepper
              title={contractorFlow.title}
              titleIcon={contractorFlow.icon}
              steps={contractorFlow.steps}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
