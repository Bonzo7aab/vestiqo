import assert from 'node:assert/strict';
import {
  ACCOUNT_ROLES,
  getManagedHousingUiCopy,
} from '../../src/lib/profile/account-role-labels';
import {
  worstInspectionStatus,
  type BuildingInspectionStatus,
} from '../../src/types/managed-building';

const adminCopy = getManagedHousingUiCopy(ACCOUNT_ROLES.PROPERTY_MANAGER);
assert.equal(adminCopy.tab, 'Wspólnota');
assert.equal(adminCopy.sectionTitle, 'Wspólnoty');
assert.equal(adminCopy.overviewTab, 'Przegląd');
assert.equal(adminCopy.childTab, 'Nieruchomości');
assert.equal(adminCopy.childCountColumn, 'Nieruchomości');
assert.equal(adminCopy.addEntity, 'Dodaj wspólnotę');
assert.equal(adminCopy.saveBasicsLabel, 'Zapisz');

const boardCopy = getManagedHousingUiCopy(ACCOUNT_ROLES.CONDO_BOARD);
assert.equal(boardCopy.tab, 'Nieruchomości');
assert.equal(boardCopy.sectionTitle, 'Nieruchomości');
assert.equal(boardCopy.overviewTab, 'Przegląd');
assert.equal(boardCopy.childTab, 'Budynki');
assert.equal(boardCopy.childCountColumn, 'Budynki');
assert.equal(boardCopy.addEntity, 'Dodaj nieruchomość');

assert.equal(worstInspectionStatus([]), 'unknown');
assert.equal(
  worstInspectionStatus(['current', 'upcoming', 'unknown'] as BuildingInspectionStatus[]),
  'upcoming',
);
assert.equal(
  worstInspectionStatus(['current', 'overdue', 'upcoming'] as BuildingInspectionStatus[]),
  'overdue',
);

console.log('housing workspace copy and inspection status tests passed');
