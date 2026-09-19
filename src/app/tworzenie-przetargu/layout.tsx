import type { ReactNode } from 'react';
import { ManagerPendingGateLayout } from '../../components/auth/ManagerPendingGateLayout';

export default function TworzeniePrzetarguLayout({ children }: { children: ReactNode }) {
  return <ManagerPendingGateLayout>{children}</ManagerPendingGateLayout>;
}
