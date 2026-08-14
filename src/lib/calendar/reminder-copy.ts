import { formatPolishDate } from './dates';

export function buildInspectionReminderTitle(): string {
  return 'Zbliża się termin przeglądu';
}

export function buildInspectionReminderMessage(
  inspectionLabel: string,
  entityName: string,
  dueOn: string,
): string {
  return `Uwaga, ${formatPolishDate(dueOn)} kończy się ważność: ${inspectionLabel} dla ${entityName}. Kliknij, aby uruchomić konkurs.`;
}

export function buildWarrantyReminderTitle(): string {
  return 'Zbliża się koniec gwarancji';
}

export function buildWarrantyReminderMessage(
  orderTitle: string,
  entityName: string,
  dueOn: string,
): string {
  return `Uwaga, ${formatPolishDate(dueOn)} kończy się gwarancja dla „${orderTitle}” (${entityName}). Kliknij, aby otworzyć zamówienie.`;
}
