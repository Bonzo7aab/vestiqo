'use client';

import { useEffect, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { cn } from './ui/utils';

const FADE_MS = 120;

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
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[10000] h-[3px] overflow-hidden transition-opacity duration-150 ease-out',
        isVisible ? 'opacity-100' : 'opacity-0',
      )}
      role="status"
      aria-live="polite"
      aria-busy={isVisible}
      aria-label="Ładowanie strony"
    >
      <div className="h-full bg-primary/10">
        <div className="route-loader-sweep h-full w-1/3 bg-gradient-to-r from-primary/0 via-primary to-primary/0" />
      </div>
    </div>
  );
}
