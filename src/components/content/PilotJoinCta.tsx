'use client';

import Link from 'next/link';
import posthog from 'posthog-js';
import { pilotProgramContent } from '../../lib/content/program-pilotazowy';
import { routes } from '../../lib/routes';
import { Button } from '../ui/button';

export function PilotJoinCta({ className }: { className?: string }) {
  return (
    <Button asChild size="lg" className={className}>
      <Link
        href={routes.rejestracja}
        onClick={() => {
          posthog.capture('landing_klik_pilotaz');
        }}
      >
        {pilotProgramContent.ctaLabel}
      </Link>
    </Button>
  );
}
