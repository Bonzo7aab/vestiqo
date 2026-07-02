'use client';

import { useLayoutEffect } from 'react';
import { applyStoredPalette } from '../../lib/theme/apply-palette';
import { useUserProfile } from '../../contexts/AuthContext';
import { ColorPalettePicker } from './ColorPalettePicker';

export function DevThemeTools() {
  const { user, isLoading } = useUserProfile();
  const isAdmin = user?.platformRole === 'platform_admin';

  useLayoutEffect(() => {
    if (isAdmin) {
      applyStoredPalette();
    }
  }, [isAdmin]);

  if (isLoading || !isAdmin) {
    return null;
  }

  return <ColorPalettePicker />;
}
