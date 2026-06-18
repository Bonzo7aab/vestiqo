'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { lookupCompanyByNipAction } from './actions';
import { isValidNip, normalizeNip } from './nip';
import type { CompanyLookupResult } from './types';

export type GusLookupStatus = 'idle' | 'loading' | 'success' | 'error';

interface UseGusNipLookupOptions {
  enabled: boolean;
  nip: string;
  onApply: (data: CompanyLookupResult) => void;
  onClearDerived?: () => void;
  /** When `blur`, lookup runs only on NIP field blur. Default `debounce` for live typing. */
  trigger?: 'blur' | 'debounce';
  /** Prevents lookup on edit open when NIP is unchanged (e.g. loaded company snapshot). */
  initialLookedUpNip?: string | null;
  debounceMs?: number;
}

export function useGusNipLookup({
  enabled,
  nip,
  onApply,
  onClearDerived,
  trigger = 'debounce',
  initialLookedUpNip = null,
  debounceMs = 500,
}: UseGusNipLookupOptions) {
  const [status, setStatus] = useState<GusLookupStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const lastLookedUpNipRef = useRef<string | null>(null);
  const abortRef = useRef(0);
  const wasEnabledRef = useRef(false);

  const normalizedNip = normalizeNip(nip);
  const validationError =
    enabled && normalizedNip.length >= 10 && !isValidNip(normalizedNip)
      ? 'Nieprawidłowy numer NIP'
      : null;

  const resetLookupState = useCallback(() => {
    abortRef.current += 1;
    setStatus('idle');
    setMessage(null);
    lastLookedUpNipRef.current = null;
  }, []);

  const runLookup = useCallback(
    async (nipValue: string) => {
      const normalized = normalizeNip(nipValue);

      if (!isValidNip(normalized)) {
        setStatus('error');
        setMessage('Nieprawidłowy numer NIP');
        return;
      }

      if (lastLookedUpNipRef.current === normalized) {
        return;
      }

      const requestId = ++abortRef.current;
      setStatus('loading');
      setMessage(null);

      const result = await lookupCompanyByNipAction(normalized);

      if (requestId !== abortRef.current) {
        return;
      }

      if ('error' in result) {
        setStatus('error');
        setMessage(result.error);
        onClearDerived?.();
        return;
      }

      lastLookedUpNipRef.current = normalized;
      onApply(result.data);
      setStatus('success');
      setMessage('Dane firmy pobrane z GUS');
    },
    [onApply, onClearDerived],
  );

  useEffect(() => {
    if (enabled && !wasEnabledRef.current && initialLookedUpNip) {
      const seeded = normalizeNip(initialLookedUpNip);
      if (isValidNip(seeded)) {
        lastLookedUpNipRef.current = seeded;
      }
    }
    wasEnabledRef.current = enabled;
  }, [enabled, initialLookedUpNip]);

  useEffect(() => {
    if (trigger !== 'debounce') {
      return;
    }
    if (!enabled || !isValidNip(normalizedNip) || lastLookedUpNipRef.current === normalizedNip) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void runLookup(normalizedNip);
    }, debounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [trigger, enabled, normalizedNip, runLookup, debounceMs]);

  const handleNipBlur = useCallback(() => {
    if (!enabled) {
      return;
    }

    if (isValidNip(normalizedNip) && lastLookedUpNipRef.current !== normalizedNip) {
      void runLookup(normalizedNip);
    }
  }, [enabled, normalizedNip, runLookup]);

  const handleNipChange = useCallback(
    (value: string, onNipChange: (next: string) => void) => {
      onNipChange(value);
      const normalized = normalizeNip(value);
      if (lastLookedUpNipRef.current && lastLookedUpNipRef.current !== normalized) {
        lastLookedUpNipRef.current = null;
        setStatus('idle');
        setMessage(null);
        onClearDerived?.();
      }
    },
    [onClearDerived],
  );

  return {
    status,
    message,
    validationError,
    handleNipBlur,
    handleNipChange,
    resetLookupState,
    isLoading: status === 'loading',
  };
}
