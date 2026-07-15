'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Footer } from './Footer';

interface LayoutContextType {
  isMapExpanded: boolean;
  setIsMapExpanded: (expanded: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function useLayoutContext() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayoutContext must be used within a LayoutProvider');
  }
  return context;
}

interface LayoutProviderProps {
  children: ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const pathname = usePathname();
  const isOnHomepage = pathname === '/';
  const effectiveMapExpanded = isOnHomepage && isMapExpanded;
  const hideFooter =
    pathname.startsWith('/dodaj-konkurs') || pathname.startsWith('/dodaj-zlecenie');

  return (
    <LayoutContext.Provider value={{ isMapExpanded: effectiveMapExpanded, setIsMapExpanded }}>
      {children}
      {!effectiveMapExpanded && !hideFooter && (
        <div className="pb-20 lg:pb-0">
          <Footer />
        </div>
      )}
    </LayoutContext.Provider>
  );
}
