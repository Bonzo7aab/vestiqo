import type { RegistryBusinessStatus } from '../registry/types';
import type { CeidgRawStatus } from './types';

export function mapCeidgStatusToBusinessStatus(status: CeidgRawStatus | string): RegistryBusinessStatus {
  switch (status) {
    case 'AKTYWNY':
      return 'active';
    case 'ZAWIESZONY':
    case 'OCZEKUJE_NA_ROZPOCZECIE_DZIALANOSCI':
      return 'suspended';
    case 'WYKRESLONY':
    case 'WYLACZNIE_W_FORMIE_SPOLKI':
      return 'closed';
    default:
      return 'unknown';
  }
}
