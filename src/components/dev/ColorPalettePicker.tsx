'use client';

import { useCallback, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  applyPalette,
  clearPaletteStorage,
  resetPalette,
  savePaletteToStorage,
  validatePaletteHex,
} from '../../lib/theme/apply-palette';
import {
  DEFAULT_PALETTE_HEX,
  PALETTE_SLOT_LABELS,
  PALETTE_SLOTS,
  parseCoolorsPaste,
  type PaletteSlot,
} from '../../lib/theme/palette';

export function ColorPalettePicker() {
  const [open, setOpen] = useState(true);
  const [values, setValues] = useState<Record<PaletteSlot, string>>({ ...DEFAULT_PALETTE_HEX });
  const [pasteValue, setPasteValue] = useState('');

  const handleSlotChange = useCallback((slot: PaletteSlot, value: string) => {
    setValues((prev) => ({ ...prev, [slot]: value }));
  }, []);

  const handleApply = useCallback(() => {
    const validated = validatePaletteHex(values);
    setValues(validated);
    applyPalette(validated);
    savePaletteToStorage(validated);
  }, [values]);

  const handleReset = useCallback(() => {
    setValues({ ...DEFAULT_PALETTE_HEX });
    setPasteValue('');
    clearPaletteStorage();
    resetPalette();
  }, []);

  const handlePasteApply = useCallback(() => {
    const parsed = parseCoolorsPaste(pasteValue);
    if (parsed.length === 0) return;

    const next = { ...values };
    PALETTE_SLOTS.forEach((slot, index) => {
      if (parsed[index]) {
        next[slot] = parsed[index];
      }
    });
    setValues(next);
    const validated = validatePaletteHex(next);
    applyPalette(validated);
    savePaletteToStorage(validated);
  }, [pasteValue, values]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[99998] rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-lg hover:bg-muted"
        aria-label="Open color palette picker"
      >
        Palette
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[99998] w-72 rounded-xl border border-border bg-card p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-brand-navy">Coolors palette</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
          aria-label="Collapse palette picker"
        >
          Hide
        </button>
      </div>

      <div className="space-y-2">
        {PALETTE_SLOTS.map((slot) => (
          <label key={slot} className="flex items-center gap-2">
            <span
              className="h-8 w-8 shrink-0 rounded-md border border-border"
              style={{ backgroundColor: values[slot] }}
              aria-hidden
            />
            <span className="w-24 shrink-0 text-xs text-muted-foreground">{PALETTE_SLOT_LABELS[slot]}</span>
            <Input
              value={values[slot]}
              onChange={(e) => handleSlotChange(slot, e.target.value)}
              className="h-8 font-mono text-xs"
              spellCheck={false}
            />
          </label>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        <Input
          value={pasteValue}
          onChange={(e) => setPasteValue(e.target.value)}
          placeholder="111827-0284c7-f59e0b-f9fafb-6b7280"
          className="h-8 text-xs"
        />
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={handlePasteApply}>
          Fill from paste
        </Button>
      </div>

      <div className="mt-3 flex gap-2">
        <Button type="button" size="sm" className="flex-1" onClick={handleApply}>
          Apply
        </Button>
        <Button type="button" variant="outline" size="sm" className="flex-1" onClick={handleReset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
