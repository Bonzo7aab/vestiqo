'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useNavigation } from '../contexts/NavigationContext';

export function NavigationRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { completeNavigation } = useNavigation();
  const previousRouteKeyRef = useRef<string | null>(null);

  const routeKey = `${pathname}?${searchParams.toString()}`;

  useEffect(() => {
    if (previousRouteKeyRef.current !== null && previousRouteKeyRef.current !== routeKey) {
      completeNavigation();
    }
    previousRouteKeyRef.current = routeKey;
  }, [routeKey, completeNavigation]);

  return null;
}
