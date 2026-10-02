/**
 * Konto tab slugs (run: npx tsx tests/unit/konto-tabs.test.ts)
 */
import assert from 'node:assert/strict';
import { ACCOUNT_ROLES } from '../../src/lib/profile/account-role-labels';
import {
  KONTO_TABS,
  housingKontoHref,
  housingKontoTabForRole,
  resolveKontoTabFromUrl,
} from '../../src/lib/konto-tabs';

assert.equal(housingKontoTabForRole(ACCOUNT_ROLES.PROPERTY_MANAGER), KONTO_TABS.wspolnota);
assert.equal(housingKontoTabForRole(ACCOUNT_ROLES.CONDO_BOARD), KONTO_TABS.nieruchomosci);
assert.equal(housingKontoTabForRole(ACCOUNT_ROLES.COOPERATIVE_ADMIN), KONTO_TABS.nieruchomosci);
assert.equal(housingKontoTabForRole(null), KONTO_TABS.nieruchomosci);

assert.equal(
  resolveKontoTabFromUrl('nieruchomosci', 'manager', ACCOUNT_ROLES.PROPERTY_MANAGER),
  KONTO_TABS.wspolnota,
);
assert.equal(
  resolveKontoTabFromUrl('wspólnota', 'manager', ACCOUNT_ROLES.PROPERTY_MANAGER),
  KONTO_TABS.wspolnota,
);
assert.equal(
  resolveKontoTabFromUrl('wspolnota', 'manager', ACCOUNT_ROLES.PROPERTY_MANAGER),
  KONTO_TABS.wspolnota,
);
assert.equal(
  resolveKontoTabFromUrl('wspólnota', 'manager', ACCOUNT_ROLES.CONDO_BOARD),
  KONTO_TABS.nieruchomosci,
);
assert.equal(
  resolveKontoTabFromUrl('wspolnota', 'manager', ACCOUNT_ROLES.CONDO_BOARD),
  KONTO_TABS.nieruchomosci,
);
assert.equal(
  resolveKontoTabFromUrl('nieruchomosci', 'manager', ACCOUNT_ROLES.CONDO_BOARD),
  KONTO_TABS.nieruchomosci,
);
assert.equal(
  resolveKontoTabFromUrl('nieruchomosci', 'manager'),
  KONTO_TABS.nieruchomosci,
);

assert.equal(resolveKontoTabFromUrl('nieruchomosci', 'contractor'), KONTO_TABS.profil);
assert.equal(resolveKontoTabFromUrl('wspólnota', 'contractor'), KONTO_TABS.profil);
assert.equal(resolveKontoTabFromUrl('wspolnota', undefined), KONTO_TABS.profil);
assert.equal(
  resolveKontoTabFromUrl('wspólnota', 'contractor', ACCOUNT_ROLES.PROPERTY_MANAGER),
  KONTO_TABS.profil,
);

assert.equal(
  housingKontoHref(ACCOUNT_ROLES.PROPERTY_MANAGER),
  '/konto?tab=wsp%C3%B3lnota',
);
assert.equal(
  housingKontoHref(ACCOUNT_ROLES.CONDO_BOARD),
  '/konto?tab=nieruchomosci',
);

console.log('konto tab slug tests passed');
