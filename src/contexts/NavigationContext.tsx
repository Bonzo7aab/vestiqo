'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';

interface NavigationContextType {
  isNavigating: boolean;
  startNavigation: () => void;
  completeNavigation: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

const LOADER_DELAY_MS = 120;
const LOADER_MAX_MS = 12_000;

function isModifiedClick(event: MouseEvent): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function shouldStartNavigationForAnchor(anchor: HTMLAnchorElement): boolean {
  if (anchor.target === '_blank' || anchor.hasAttribute('download')) {
    return false;
  }

  const href = anchor.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return false;
  }

  if (url.origin !== window.location.origin) {
    return false;
  }

  const current = new URL(window.location.href);
  if (url.pathname === current.pathname && url.search === current.search && url.hash === current.hash) {
    return false;
  }

  return true;
}

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [showLoader, setShowLoader] = useState(false);
  const delayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDelayTimeout = useCallback(() => {
    if (delayTimeoutRef.current) {
      clearTimeout(delayTimeoutRef.current);
      delayTimeoutRef.current = null;
    }
  }, []);

  const clearMaxTimeout = useCallback(() => {
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }
  }, []);

  const completeNavigation = useCallback(() => {
    clearDelayTimeout();
    clearMaxTimeout();
    setShowLoader(false);
  }, [clearDelayTimeout, clearMaxTimeout]);

  const startNavigation = useCallback(() => {
    clearDelayTimeout();
    clearMaxTimeout();

    delayTimeoutRef.current = setTimeout(() => {
      setShowLoader(true);

      maxTimeoutRef.current = setTimeout(() => {
        completeNavigation();
      }, LOADER_MAX_MS);
    }, LOADER_DELAY_MS);
  }, [clearDelayTimeout, clearMaxTimeout, completeNavigation]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || isModifiedClick(event)) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest('a');
      if (!anchor || !shouldStartNavigationForAnchor(anchor)) {
        return;
      }

      startNavigation();
    };

    const handlePopState = () => {
      startNavigation();
    };

    document.addEventListener('click', handleDocumentClick, true);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [startNavigation]);

  useEffect(() => {
    return () => {
      clearDelayTimeout();
      clearMaxTimeout();
    };
  }, [clearDelayTimeout, clearMaxTimeout]);

  const value: NavigationContextType = {
    isNavigating: showLoader,
    startNavigation,
    completeNavigation,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
