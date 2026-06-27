'use client';

import { useNavigation } from '../contexts/NavigationContext';
import { useAuthAwareBack } from './useAuthAwareBack';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

export function useNavigationWithLoading() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const authAwareBack = useAuthAwareBack();

  const push = useCallback((href: string) => {
    startNavigation();
    router.push(href);
  }, [router, startNavigation]);

  const replace = useCallback((href: string) => {
    startNavigation();
    router.replace(href);
  }, [router, startNavigation]);

  const back = useCallback(() => {
    startNavigation();
    authAwareBack();
  }, [authAwareBack, startNavigation]);

  const forward = useCallback(() => {
    startNavigation();
    router.forward();
  }, [router, startNavigation]);

  const refresh = useCallback(() => {
    startNavigation();
    router.refresh();
  }, [router, startNavigation]);

  return {
    ...router,
    push,
    replace,
    back,
    forward,
    refresh,
  };
}
