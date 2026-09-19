'use client';

import type { ManagedHousingUiCopy } from '../../lib/profile/account-role-labels';
import { HousingCrmWorkspace } from './HousingCrmWorkspace';
import type { ManagedHousingWorkspace } from './useManagedHousingWorkspace';

interface BoardPropertiesWorkspaceProps {
  copy: ManagedHousingUiCopy;
  workspace: ManagedHousingWorkspace;
}

export function BoardPropertiesWorkspace({ copy, workspace }: BoardPropertiesWorkspaceProps) {
  return <HousingCrmWorkspace copy={copy} workspace={workspace} />;
}
