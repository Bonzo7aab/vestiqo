import type { ReactNode } from 'react';
import { ManagerPendingGateLayout } from '../../components/auth/ManagerPendingGateLayout';

export default function DodajPrzetargLayout({ children }: { children: ReactNode }) {
  return <ManagerPendingGateLayout>{children}</ManagerPendingGateLayout>;
}
