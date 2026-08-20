/**
 * OPD-164 Przeglądy tech-params formatter
 * Run: npx tsx tests/unit/przeglady-tech-params.test.ts
 */
import assert from 'node:assert/strict';
import type { ManagedBuilding } from '../../src/types/managed-building';
import {
  TECH_PARAMS_END,
  TECH_PARAMS_START,
  applyTechParamsToDescription,
  buildPrzegladyTechParamsBlock,
  isPrzegladyCategory,
  resolvePrzegladySubcategorySlug,
  stripTechParamsFromDescription,
} from '../../src/lib/contest/przeglady-tech-params';

function building(overrides: Partial<ManagedBuilding> & { name: string }): ManagedBuilding {
  return {
    id: overrides.id ?? 'b1',
    managed_entity_id: 'e1',
    name: overrides.name,
    above_ground_floors:
      overrides.above_ground_floors !== undefined ? overrides.above_ground_floors : 5,
    below_ground_floors:
      overrides.below_ground_floors !== undefined ? overrides.below_ground_floors : 1,
    roof_area_m2: overrides.roof_area_m2 !== undefined ? overrides.roof_area_m2 : 400,
    roof_type: overrides.roof_type !== undefined ? overrides.roof_type : 'flat_membrane',
    facade_area_m2: overrides.facade_area_m2 !== undefined ? overrides.facade_area_m2 : 1200,
    gas_connected_units:
      overrides.gas_connected_units !== undefined ? overrides.gas_connected_units : 20,
    gas_risers_count: overrides.gas_risers_count !== undefined ? overrides.gas_risers_count : 4,
    has_own_gas_boilerroom: overrides.has_own_gas_boilerroom ?? false,
    chimney_openings_in_units:
      overrides.chimney_openings_in_units !== undefined
        ? overrides.chimney_openings_in_units
        : 30,
    chimney_shafts_above_roof:
      overrides.chimney_shafts_above_roof !== undefined
        ? overrides.chimney_shafts_above_roof
        : 6,
    chimney_duct_types: overrides.chimney_duct_types ?? ['gravity_ventilation', 'flue_gas'],
    total_residential_units:
      overrides.total_residential_units !== undefined
        ? overrides.total_residential_units
        : 40,
    staircases_count: overrides.staircases_count !== undefined ? overrides.staircases_count : 2,
    lightning_control_joints:
      overrides.lightning_control_joints !== undefined
        ? overrides.lightning_control_joints
        : 8,
    heat_nodes_or_boilerrooms:
      overrides.heat_nodes_or_boilerrooms !== undefined
        ? overrides.heat_nodes_or_boilerrooms
        : 1,
    has_internal_hydrant_system: overrides.has_internal_hydrant_system ?? true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

assert.equal(isPrzegladyCategory('Przeglądy'), true);
assert.equal(isPrzegladyCategory('Przeglądy i Serwis'), true);
assert.equal(isPrzegladyCategory('Remonty'), false);

assert.equal(
  resolvePrzegladySubcategorySlug('Przegląd gazowy (roczny)'),
  'przeglad-gazowy-roczny',
);
assert.equal(resolvePrzegladySubcategorySlug('przeglad-ppoz-hydrantow-roczny'), 'przeglad-ppoz-hydrantow-roczny');
assert.equal(resolvePrzegladySubcategorySlug('Inne'), null);

const gasOne = buildPrzegladyTechParamsBlock('Przegląd gazowy (roczny)', [
  building({ name: 'Budynek A', gas_connected_units: 12, gas_risers_count: 3 }),
]);
assert.ok(gasOne);
assert.ok(!gasOne!.includes(TECH_PARAMS_START));
assert.ok(!gasOne!.includes(TECH_PARAMS_END));
assert.ok(!gasOne!.includes('###'));
assert.ok(gasOne!.includes('Budynek A'));
assert.ok(gasOne!.includes('Liczba lokali z gazem: 12'));
assert.ok(gasOne!.includes('Liczba pionów gazowych: 3'));
assert.ok(gasOne!.includes('Kotłownia gazowa: Nie'));
assert.ok(!gasOne!.includes('Łącznie'));

const chimney = buildPrzegladyTechParamsBlock(
  'przeglad-kominiarski-wentylacyjny-roczny',
  [building({ name: 'B1', roof_type: 'sloped_tile' })],
);
assert.ok(chimney!.includes('Przegląd Kominiarski'));
assert.ok(chimney!.includes('Skośny - dachówka'));
assert.ok(chimney!.includes('Wentylacja grawitacyjna'));

const electrical = buildPrzegladyTechParamsBlock(
  'przeglad-elektryczny-odgromowy-5-letni',
  [building({ name: 'B1', lightning_control_joints: null })],
);
assert.ok(electrical!.includes('złączy kontrolnych odgromu: —'));

const annual = buildPrzegladyTechParamsBlock('przeglad-ogolnobudowlany-roczny', [
  building({ name: 'B1' }),
]);
assert.ok(annual!.includes('Kondygnacje: 5 nadziemnych / 1 podziemnych'));

const fiveY = buildPrzegladyTechParamsBlock('przeglad-ogolnobudowlany-5-letni', [
  building({ name: 'B1' }),
]);
assert.ok(fiveY!.includes('Przegląd Ogólnobudowlany 5-letni'));

const fire = buildPrzegladyTechParamsBlock('przeglad-ppoz-hydrantow-roczny', [
  building({ name: 'B1', has_internal_hydrant_system: false }),
]);
assert.ok(fire!.includes('Instalacja hydrantowa wewnętrzna: Nie'));
assert.ok(fire!.includes('6 kondygnacji'));

const multiGas = buildPrzegladyTechParamsBlock('przeglad-gazowy-roczny', [
  building({ id: '1', name: 'A', gas_connected_units: 10, gas_risers_count: 2 }),
  building({ id: '2', name: 'B', gas_connected_units: 5, gas_risers_count: 1 }),
]);
assert.ok(multiGas!.includes('A\nParametry techniczne (Przegląd Gazowy):'));
assert.ok(multiGas!.includes('B\nParametry techniczne (Przegląd Gazowy):'));
assert.ok(multiGas!.includes('Łącznie dla wszystkich wybranych budynków: 15 lokali z gazem, 3 pionów.'));
assert.ok(!multiGas!.includes('###'));
assert.ok(!multiGas!.includes('Łącznie wybrano budynków'));

const withUserText = applyTechParamsToDescription(
  'Zakres: przegląd gazowy w terminie letnim.',
  gasOne,
);
assert.ok(withUserText.startsWith('Zakres: przegląd gazowy'));
assert.ok(!withUserText.includes(TECH_PARAMS_START));
assert.ok(withUserText.includes('Budynek A'));

const replaced = applyTechParamsToDescription(withUserText, multiGas);
assert.ok(replaced.startsWith('Zakres: przegląd gazowy'));
assert.ok(replaced.includes('\nA\nParametry techniczne'));
assert.ok(replaced.includes('\nB\nParametry techniczne'));
assert.equal((replaced.match(/Parametry techniczne \(Przegląd Gazowy\)/g) ?? []).length, 2);

const stripped = stripTechParamsFromDescription(replaced);
assert.equal(stripped, 'Zakres: przegląd gazowy w terminie letnim.');
assert.equal(applyTechParamsToDescription(stripped, null), stripped);

const legacyWrapped = [
  'Zakres ręczny.',
  TECH_PARAMS_START,
  '### Stary blok',
  'Parametry techniczne (Przegląd Gazowy):',
  '• Liczba lokali z gazem: 1',
  TECH_PARAMS_END,
].join('\n');
assert.equal(stripTechParamsFromDescription(legacyWrapped), 'Zakres ręczny.');

const multiChimney = buildPrzegladyTechParamsBlock('przeglad-kominiarski-wentylacyjny-roczny', [
  building({
    id: '1',
    name: 'A',
    chimney_openings_in_units: 10,
    chimney_shafts_above_roof: 2,
    roof_area_m2: 100,
  }),
  building({
    id: '2',
    name: 'B',
    chimney_openings_in_units: 5,
    chimney_shafts_above_roof: 1,
    roof_area_m2: 50,
  }),
]);
assert.ok(
  multiChimney!.includes(
    'Łącznie dla wszystkich wybranych budynków: 15 otworów w lokalach, 3 trzonów kominowych, 150 m² dachu.',
  ),
);

const multiFire = buildPrzegladyTechParamsBlock('przeglad-ppoz-hydrantow-roczny', [
  building({
    id: '1',
    name: 'A',
    has_internal_hydrant_system: true,
    heat_nodes_or_boilerrooms: 1,
    staircases_count: 2,
    above_ground_floors: 4,
    below_ground_floors: 1,
  }),
  building({
    id: '2',
    name: 'B',
    has_internal_hydrant_system: false,
    heat_nodes_or_boilerrooms: 2,
    staircases_count: 1,
    above_ground_floors: 3,
    below_ground_floors: 0,
  }),
]);
assert.ok(
  multiFire!.includes(
    'Łącznie dla wszystkich wybranych budynków: hydrant wewnętrzny w 1 z 2 budynków, 3 kotłowni/węzłów, 3 klatek, 8 kondygnacji.',
  ),
);

assert.equal(buildPrzegladyTechParamsBlock('przeglad-gazowy-roczny', []), null);
assert.equal(buildPrzegladyTechParamsBlock('unknown', [building({ name: 'X' })]), null);

console.log('przeglady-tech-params tests passed');
