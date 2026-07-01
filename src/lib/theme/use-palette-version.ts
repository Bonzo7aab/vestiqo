'use client';

import { useEffect, useState } from 'react';
import { PALETTE_CHANGED_EVENT } from './palette';

/** Bump when dev palette changes — use as effect dependency to refresh themed UI. */
export function usePaletteVersion(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const handler = () => setVersion((v) => v + 1);
    window.addEventListener(PALETTE_CHANGED_EVENT, handler);
    return () => window.removeEventListener(PALETTE_CHANGED_EVENT, handler);
  }, []);

  return version;
}
