import type { ReactNode } from 'react';
import { ManagerPendingGateLayout } from '../../components/auth/ManagerPendingGateLayout';

export default function DodajZlecenieLayout({ children }: { children: ReactNode }) {
  return <ManagerPendingGateLayout>{children}</ManagerPendingGateLayout>;
}
