'use client';

import React, { createContext, useContext, useMemo } from 'react';
import type { ImpersonationClientState } from '../lib/auth/effective-user';

const ImpersonationContext = createContext<ImpersonationClientState | undefined>(undefined);

interface ImpersonationProviderProps {
  initialState: ImpersonationClientState;
  children: React.ReactNode;
}

export function ImpersonationProvider({
  initialState,
  children,
}: ImpersonationProviderProps): React.ReactElement {
  const value = useMemo(() => initialState, [initialState]);

  return (
    <ImpersonationContext.Provider value={value}>{children}</ImpersonationContext.Provider>
  );
}

export function useImpersonation(): ImpersonationClientState {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within ImpersonationProvider');
  }
  return context;
}
