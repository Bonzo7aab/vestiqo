/** Today's date in Europe/Warsaw as YYYY-MM-DD (required by MF whitelist API). */
export function getVatWhitelistCheckDate(reference = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw' }).format(reference);
}
