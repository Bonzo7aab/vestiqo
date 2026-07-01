/**
 * OPD-118 registry parser unit checks (run: npx tsx tests/unit/registry-verification.test.ts)
 */
import assert from 'node:assert/strict';
import { mapCeidgStatusToBusinessStatus } from '../../src/lib/ceidg/parse-status';
import { formatKrsNumber } from '../../src/lib/krs/format-krs-number';
import {
  isKrsInsolvent,
  mapKrsLifecycleToBusinessStatus,
  parseKrsLifecycleStatus,
} from '../../src/lib/krs/parse-status';
import { isRegistryVerified } from '../../src/lib/registry/resolve-registry-verification-status';
import type { CompanyRegistrySnapshot } from '../../src/lib/registry/types';

assert.equal(mapCeidgStatusToBusinessStatus('AKTYWNY'), 'active');
assert.equal(mapCeidgStatusToBusinessStatus('ZAWIESZONY'), 'suspended');
assert.equal(mapCeidgStatusToBusinessStatus('WYKRESLONY'), 'closed');

assert.equal(formatKrsNumber('28860'), '0000028860');

assert.equal(
  parseKrsLifecycleStatus({ postepowanieUpadlosciowe: [{}] }, 'ACME SP. Z O.O.'),
  'bankruptcy',
);

assert.equal(
  parseKrsLifecycleStatus(
    {
      postepowanieRestrukturyzacyjneNaprawczePrzymusowaRestrukturyzacjaUporzadkowanaLikwidacja: [
        { rodzajPostepowania: 'UPORZĄDKOWANA LIKWIDACJA' },
      ],
    },
    'ACME SP. Z O.O.',
  ),
  'liquidating',
);

assert.equal(parseKrsLifecycleStatus(undefined, 'ACME SP. Z O.O. W UPADŁOŚCI'), 'bankruptcy');
assert.equal(mapKrsLifecycleToBusinessStatus('dissolved'), 'closed');
assert.equal(isKrsInsolvent('liquidating'), true);
assert.equal(isKrsInsolvent('active'), false);

const snapshot: CompanyRegistrySnapshot = {
  registrySource: 'ceidg',
  registryStatus: 'active',
  legalForm: 'JDG',
  krs: null,
  registryCheckedAt: '2026-06-30T00:00:00.000Z',
  financeRegistryStatus: 'solvent',
  financeRegistryCheckedAt: '2026-06-30T00:00:00.000Z',
  vatStatus: 'active_vat',
  vatWhitelistAccountAssigned: true,
};

assert.equal(isRegistryVerified(snapshot), true);
assert.equal(isRegistryVerified({ ...snapshot, registryStatus: 'suspended' }), false);

console.log('registry-verification tests passed');
