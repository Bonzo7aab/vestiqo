'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { BRAND } from '../lib/brand';
import { cn } from './ui/utils';

const FADE_MS = 320;
const LOADER_SIZE = 80;
const LOADER_BORDER = 5;
const LOADER_RADIUS = (LOADER_SIZE - LOADER_BORDER) / 2;
const LOADER_CENTER = LOADER_SIZE / 2;

export function RouteChangeLoader() {
  const { isNavigating } = useNavigation();
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let frameId = 0;
    let timeoutId: number | undefined;

    if (isNavigating) {
      frameId = requestAnimationFrame(() => {
        setIsRendered(true);
        frameId = requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      frameId = requestAnimationFrame(() => {
        setIsVisible(false);
        timeoutId = window.setTimeout(() => {
          setIsRendered(false);
        }, FADE_MS);
      });
    }

    return () => {
      cancelAnimationFrame(frameId);
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isNavigating]);

  if (!isRendered) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          'pointer-events-none fixed inset-x-0 top-0 z-[10000] h-[3px] overflow-hidden transition-opacity duration-300 ease-out',
          isVisible ? 'opacity-100' : 'opacity-0',
        )}
        aria-hidden
      >
        <div className="h-full bg-primary/10">
          <div className="route-loader-sweep h-full w-1/3 bg-gradient-to-r from-primary/0 via-primary to-primary/0" />
        </div>
      </div>

      <div
        className={cn(
          'fixed inset-0 z-[9999] flex items-center justify-center bg-background/45 backdrop-blur-[2px] transition-opacity duration-300 ease-out',
          isVisible ? 'opacity-100' : 'opacity-0',
        )}
        role="status"
        aria-live="polite"
        aria-busy={isVisible}
        aria-label="Ładowanie strony"
      >
        <div
          className={cn(
            'flex flex-col items-center gap-5 transition-all duration-300 ease-out',
            isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-[0.98] opacity-0',
          )}
        >
          <div
            className="relative flex items-center justify-center"
            style={{ width: LOADER_SIZE, height: LOADER_SIZE }}
          >
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox={`0 0 ${LOADER_SIZE} ${LOADER_SIZE}`}
              fill="none"
              aria-hidden
            >
              <circle
                cx={LOADER_CENTER}
                cy={LOADER_CENTER}
                r={LOADER_RADIUS}
                stroke="hsl(var(--primary) / 0.22)"
                strokeWidth={LOADER_BORDER}
              />
              <g
                className="route-loader-ring-spin"
                style={{ transformOrigin: `${LOADER_CENTER}px ${LOADER_CENTER}px` }}
              >
                <circle
                  cx={LOADER_CENTER}
                  cy={LOADER_CENTER}
                  r={LOADER_RADIUS}
                  stroke="hsl(var(--primary))"
                  strokeWidth={LOADER_BORDER}
                  strokeLinecap="round"
                  strokeDasharray={`${LOADER_RADIUS * 1.15} ${LOADER_RADIUS * 4.85}`}
                />
              </g>
            </svg>

            <Image
              src={BRAND.markPath}
              alt=""
              width={36}
              height={36}
              className="relative h-9 w-9"
              aria-hidden
              unoptimized
            />
          </div>

          <div className="space-y-1.5 text-center">
            <p className="text-sm font-semibold tracking-tight text-[hsl(var(--brand-navy))]">
              Vestiqo
            </p>
            <p className="text-xs text-muted-foreground">Przechodzenie do strony...</p>
          </div>
        </div>
      </div>
    </>
  );
}
