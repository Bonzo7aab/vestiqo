import 'server-only';

import Bir from 'bir1';
import { modern } from 'bir1/normalize';
import { formatKrsNumber } from '../krs/format-krs-number';

interface GusLegalEntityReport {
  numerWRejestrzeEwidencji?: string;
  numerWRejestrzeLubEwidencji?: string;
  formaPrawna?: string;
}

/**
 * Resolve KRS number for a legal entity using GUS BIR full report.
 */
export async function resolveKrsNumberFromRegon(
  regon: string,
  apiKey: string,
): Promise<{ krsNumber: string | null; legalForm: string | null }> {
  const bir = new Bir({ key: apiKey, normalizeFn: modern });

  try {
    const raw = (await bir.report({ regon, report: 'BIR11OsPrawna' })) as GusLegalEntityReport;
    const krsRaw = raw.numerWRejestrzeEwidencji ?? raw.numerWRejestrzeLubEwidencji;
    const krsNumber = krsRaw ? formatKrsNumber(krsRaw) : null;

    return {
      krsNumber: krsNumber || null,
      legalForm: raw.formaPrawna?.trim() ?? null,
    };
  } catch (error) {
    console.error('GUS KRS resolution failed:', error);
    return { krsNumber: null, legalForm: null };
  } finally {
    try {
      await bir.logout();
    } catch {
      // best-effort
    }
  }
}

interface GusSearchTyp {
  typ?: string;
  Typ?: string;
}

/**
 * Returns true when GUS search indicates a legal entity (KRS) rather than sole trader (CEIDG).
 */
export function isGusLegalEntity(searchResult: GusSearchTyp): boolean {
  const typ = (searchResult.typ ?? searchResult.Typ ?? '').toUpperCase();
  return typ === 'P' || typ.includes('PRAWN');
}
