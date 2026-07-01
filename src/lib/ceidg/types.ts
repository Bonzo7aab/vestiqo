export type CeidgRawStatus =
  | 'AKTYWNY'
  | 'ZAWIESZONY'
  | 'WYKRESLONY'
  | 'OCZEKUJE_NA_ROZPOCZECIE_DZIALANOSCI'
  | 'WYLACZNIE_W_FORMIE_SPOLKI';

export interface CeidgLookupResult {
  legalForm: string;
  status: CeidgRawStatus;
  name: string | null;
}
