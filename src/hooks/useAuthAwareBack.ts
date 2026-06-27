'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '../contexts/AuthContext';

export function useAuthAwareBack(fallbackPath = '/logowanie') {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useUserProfile();

  return useCallback(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(fallbackPath);
      return;
    }
    router.back();
  }, [fallbackPath, isAuthenticated, isLoading, router]);
}
