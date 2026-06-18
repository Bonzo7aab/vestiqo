const NIP_WEIGHTS = [6, 5, 7, 2, 3, 4, 5, 6, 7] as const;

/** Strip spaces/dashes and keep digits only. */
export function normalizeNip(value: string): string {
  return value.replace(/\D/g, '');
}

/** Validate Polish NIP: 10 digits with correct checksum. */
export function isValidNip(value: string): boolean {
  const nip = normalizeNip(value);
  if (nip.length !== 10 || !/^\d{10}$/.test(nip)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(nip[i]) * NIP_WEIGHTS[i];
  }

  const checksum = sum % 11;
  if (checksum === 10) {
    return false;
  }

  return checksum === Number(nip[9]);
}
