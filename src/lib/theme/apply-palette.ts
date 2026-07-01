import {
  DEFAULT_PALETTE_HEX,
  PALETTE_CHANGED_EVENT,
  PALETTE_SLOTS,
  PALETTE_STORAGE_KEY,
  hexToHslComponents,
  normalizeHex,
  paletteVarName,
  slotToIndex,
  type PaletteSlot,
} from './palette';

export type PaletteHexMap = Record<PaletteSlot, string>;

function deriveSemanticTokens(slots: PaletteHexMap): Record<string, string> {
  const background = hexToHslComponents(slots.background);
  const headings = hexToHslComponents(slots.headings);
  const cta = hexToHslComponents(slots.cta);
  const surface = hexToHslComponents(slots.surface);
  const accent = hexToHslComponents(slots.accent);

  return {
    '--background': background,
    '--foreground': '215 19% 35%',
    '--card': surface,
    '--card-foreground': '215 19% 35%',
    '--popover': surface,
    '--popover-foreground': '215 19% 35%',
    '--primary': cta,
    '--primary-foreground': '0 0% 100%',
    '--brand-navy': headings,
    '--secondary': surface,
    '--secondary-foreground': headings,
    '--muted': background,
    '--muted-foreground': '215 16% 47%',
    '--accent': accent,
    '--accent-foreground': headings,
    '--border': '214 32% 91%',
    '--input-background': background,
    '--switch-background': '214 32% 82%',
    '--ring': cta,
    '--chart-1': cta,
    '--sidebar': surface,
    '--sidebar-foreground': '215 19% 35%',
    '--sidebar-primary': cta,
    '--sidebar-primary-foreground': '0 0% 100%',
    '--sidebar-accent': background,
    '--sidebar-accent-foreground': headings,
    '--sidebar-border': '214 32% 91%',
    '--sidebar-ring': cta,
  };
}

function deriveHexVars(slots: PaletteHexMap): Record<string, string> {
  return {
    '--palette-1-hex': slots.background,
    '--palette-2-hex': slots.headings,
    '--palette-3-hex': slots.cta,
    '--palette-4-hex': slots.surface,
    '--palette-5-hex': slots.accent,
    '--primary-hex': slots.cta,
    '--background-hex': slots.background,
    '--card-hex': slots.surface,
    '--brand-navy-hex': slots.headings,
    '--accent-hex': slots.accent,
    '--destructive-hex': '#DC2626',
    '--success-hex': '#10B981',
    '--border-hex': '#E2E8F0',
    '--foreground-hex': '#334155',
    '--white-hex': '#FFFFFF',
  };
}

export function validatePaletteHex(slots: Partial<PaletteHexMap>): PaletteHexMap {
  const result = { ...DEFAULT_PALETTE_HEX };
  for (const slot of PALETTE_SLOTS) {
    const value = slots[slot];
    if (value) {
      const normalized = normalizeHex(value);
      if (normalized) {
        result[slot] = normalized;
      }
    }
  }
  return result;
}

export function applyPalette(slots: PaletteHexMap, root: HTMLElement = document.documentElement): void {
  for (const slot of PALETTE_SLOTS) {
    const index = slotToIndex(slot);
    root.style.setProperty(paletteVarName(index), hexToHslComponents(slots[slot]));
  }

  const semantic = deriveSemanticTokens(slots);
  for (const [name, value] of Object.entries(semantic)) {
    root.style.setProperty(name, value);
  }

  const hexVars = deriveHexVars(slots);
  for (const [name, value] of Object.entries(hexVars)) {
    root.style.setProperty(name, value);
  }

  window.dispatchEvent(new CustomEvent(PALETTE_CHANGED_EVENT, { detail: slots }));
}

export function resetPalette(root: HTMLElement = document.documentElement): void {
  for (const slot of PALETTE_SLOTS) {
    root.style.removeProperty(paletteVarName(slotToIndex(slot)));
  }

  const varsToClear = [
    ...Object.keys(deriveSemanticTokens(DEFAULT_PALETTE_HEX)),
    ...Object.keys(deriveHexVars(DEFAULT_PALETTE_HEX)),
  ];
  for (const name of varsToClear) {
    root.style.removeProperty(name);
  }

  window.dispatchEvent(new CustomEvent(PALETTE_CHANGED_EVENT, { detail: DEFAULT_PALETTE_HEX }));
}

export function savePaletteToStorage(slots: PaletteHexMap): void {
  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(slots));
  } catch {
    // ignore quota / private mode
  }
}

export function loadPaletteFromStorage(): PaletteHexMap | null {
  try {
    const raw = localStorage.getItem(PALETTE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PaletteHexMap>;
    return validatePaletteHex(parsed);
  } catch {
    return null;
  }
}

export function clearPaletteStorage(): void {
  try {
    localStorage.removeItem(PALETTE_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function applyStoredPalette(): PaletteHexMap | null {
  if (typeof window === 'undefined') return null;
  const stored = loadPaletteFromStorage();
  if (stored) {
    applyPalette(stored);
    return stored;
  }
  return null;
}
