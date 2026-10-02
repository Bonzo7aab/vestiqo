import assert from 'node:assert/strict';
import {
  formatBuildingAddressLine,
  formatBuildingDisplayName,
} from '../../src/lib/database/condo-board-housing';
import {
  EMPTY_MANAGED_BUILDING_FORM,
  buildingToForm,
  type ManagedBuilding,
} from '../../src/types/managed-building';

assert.equal(
  formatBuildingDisplayName({
    address: 'ul. Królewska 12',
    city: 'Warszawa',
    postal_code: '00-001',
  }),
  'ul. Królewska 12',
);

assert.equal(
  formatBuildingDisplayName({
    address: '  ',
    city: 'Kraków',
    postal_code: '30-001',
    fallbackName: 'Wspólnota Test',
  }),
  'Wspólnota Test',
);

assert.equal(
  formatBuildingDisplayName({
    address: '',
    city: 'Gdańsk',
    postal_code: '80-001',
  }),
  '80-001 Gdańsk',
);

assert.equal(
  formatBuildingAddressLine({
    address: 'ul. Testowa 1',
    city: 'Warszawa',
    postal_code: '00-100',
  }),
  'ul. Testowa 1, 00-100 Warszawa',
);

assert.equal(
  formatBuildingAddressLine({
    address: null,
    city: null,
    postal_code: null,
  }),
  '—',
);

const sampleBuilding: ManagedBuilding = {
  id: 'b1',
  managed_entity_id: 'e1',
  name: 'Budynek A',
  address: 'ul. Kwiatowa 3',
  city: 'Poznań',
  postal_code: '60-001',
  above_ground_floors: 4,
  below_ground_floors: null,
  roof_area_m2: null,
  roof_type: null,
  facade_area_m2: null,
  gas_connected_units: null,
  gas_risers_count: null,
  has_own_gas_boilerroom: false,
  chimney_openings_in_units: null,
  chimney_shafts_above_roof: null,
  chimney_duct_types: [],
  total_residential_units: 12,
  staircases_count: null,
  lightning_control_joints: null,
  heat_nodes_or_boilerrooms: null,
  has_internal_hydrant_system: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const form = buildingToForm(sampleBuilding);
assert.equal(form.address, 'ul. Kwiatowa 3');
assert.equal(form.city, 'Poznań');
assert.equal(form.postal_code, '60-001');
assert.equal(form.name, 'Budynek A');
assert.equal(EMPTY_MANAGED_BUILDING_FORM.address, '');
assert.equal(EMPTY_MANAGED_BUILDING_FORM.city, '');
assert.equal(EMPTY_MANAGED_BUILDING_FORM.postal_code, '');

console.log('condo board housing helpers tests passed');
