/**
 * Public housing-entity profile columns (run: npx tsx tests/unit/public-managed-housing-entity.test.ts)
 */
import assert from 'node:assert/strict';
import {
  PUBLIC_MANAGED_HOUSING_ENTITY_COLUMNS,
  PUBLIC_MANAGED_HOUSING_ENTITY_SELECT,
  toPublicManagedHousingEntity,
} from '../../src/lib/database/public-managed-housing-entity';

{
  const selected = new Set(PUBLIC_MANAGED_HOUSING_ENTITY_COLUMNS);
  for (const sensitive of ['nip', 'regon', 'bank_account_iban', 'vat_status', 'manager_company_id']) {
    assert.equal(selected.has(sensitive), false, `${sensitive} must not be public`);
  }
  assert.match(PUBLIC_MANAGED_HOUSING_ENTITY_SELECT, /^id,/);
}

{
  const publicEntity = toPublicManagedHousingEntity({
    id: 'e1',
    entity_type: 'wspólnota',
    name: 'WM Test',
    address: 'Ul. Testowa 1',
    city: 'Warszawa',
    postal_code: '00-001',
    nip: '1234567890',
    regon: '123',
    bank_account_iban: 'PL61109010140000071219812874',
    vat_status: 'active',
    manager_company_id: 'c1',
  });
  assert.ok(publicEntity);
  assert.equal(publicEntity.id, 'e1');
  assert.equal(publicEntity.name, 'WM Test');
  assert.equal(publicEntity.city, 'Warszawa');
  assert.equal('nip' in publicEntity, false);
  assert.equal('bank_account_iban' in publicEntity, false);
  assert.equal(toPublicManagedHousingEntity(null), null);
  assert.equal(toPublicManagedHousingEntity({ id: 'e1' }), null);
}

console.log('public-managed-housing-entity.test.ts: ok');
