'use client';

import React from 'react';
import type { ImpersonationClientState } from '../lib/auth/effective-user';
import AuthProvider from '../contexts/AuthContext';
import { ImpersonationProvider } from '../contexts/ImpersonationContext';
import { ImpersonationBanner } from './admin/ImpersonationBanner';

interface AppProvidersProps {
  impersonationState: ImpersonationClientState;
  impersonationSubjectId: string | null;
  children: React.ReactNode;
}

export function AppProviders({
  impersonationState,
  impersonationSubjectId,
  children,
}: AppProvidersProps): React.ReactElement {
  return (
    <ImpersonationProvider initialState={impersonationState}>
      <AuthProvider impersonationSubjectId={impersonationSubjectId}>
        <ImpersonationBanner />
        {children}
      </AuthProvider>
    </ImpersonationProvider>
  );
}
