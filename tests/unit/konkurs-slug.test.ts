/**
 * OPD-162 konkurs slug helpers (run: npx tsx tests/unit/konkurs-slug.test.ts)
 */
import assert from 'node:assert/strict';
import {
  buildKonkursPath,
  buildKonkursSlug,
  hexToUuid,
  parseKonkursPathParam,
  slugifyKonkursTitle,
  uuidToHex,
} from '../../src/lib/listing/konkurs-slug';

const SAMPLE_UUID = 'f42354c6-591c-402a-b7a1-36ba8ee7256f';
const SAMPLE_HEX = 'f42354c6591c402ab7a136ba8ee7256f';

assert.equal(slugifyKonkursTitle('Remont dachu — Wspólnota "Kwiatowa"'), 'remont-dachu-wspolnota-kwiatowa');
assert.equal(slugifyKonkursTitle('Łódź / Żoliborz'), 'lodz-zoliborz');
assert.equal(slugifyKonkursTitle('   '), 'konkurs');

assert.equal(uuidToHex(SAMPLE_UUID), SAMPLE_HEX);
assert.equal(hexToUuid(SAMPLE_HEX), SAMPLE_UUID);

assert.equal(
  buildKonkursSlug('Wymiana windy w bloku', SAMPLE_UUID),
  `wymiana-windy-w-bloku-${SAMPLE_HEX}`,
);

assert.equal(
  buildKonkursPath(SAMPLE_UUID, 'Wymiana windy w bloku'),
  `/konkurs/wymiana-windy-w-bloku-${SAMPLE_HEX}`,
);
assert.equal(buildKonkursPath(SAMPLE_UUID), `/konkurs/${SAMPLE_UUID}`);

assert.equal(parseKonkursPathParam(SAMPLE_UUID), SAMPLE_UUID);
assert.equal(parseKonkursPathParam(`wymiana-windy-w-bloku-${SAMPLE_HEX}`), SAMPLE_UUID);
assert.equal(parseKonkursPathParam(SAMPLE_HEX), SAMPLE_UUID);
assert.equal(parseKonkursPathParam('nieprawidlowy'), null);

console.log('konkurs-slug tests passed');
