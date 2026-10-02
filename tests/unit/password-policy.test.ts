/**
 * Password policy helpers (run: npx tsx tests/unit/password-policy.test.ts)
 */
import assert from 'node:assert/strict';
import {
  CONFIRM_PASSWORD_DEBOUNCE_MS,
  getPasswordConstraints,
  MIN_PASSWORD_LENGTH,
  PASSWORD_MISMATCH_MESSAGE,
  validatePasswordStrength,
} from '../../src/lib/auth/password-policy';

assert.equal(MIN_PASSWORD_LENGTH, 8);
assert.equal(CONFIRM_PASSWORD_DEBOUNCE_MS, 400);
assert.equal(PASSWORD_MISMATCH_MESSAGE, 'Hasła nie są identyczne');

const empty = getPasswordConstraints('');
assert.deepEqual(
  empty.map(item => item.id),
  ['length', 'letter', 'digit'],
);
assert.equal(empty.every(item => item.met === false), true);
assert.equal(validatePasswordStrength('').valid, false);

const shortLetters = getPasswordConstraints('abc');
assert.equal(shortLetters.find(item => item.id === 'length')?.met, false);
assert.equal(shortLetters.find(item => item.id === 'letter')?.met, true);
assert.equal(shortLetters.find(item => item.id === 'digit')?.met, false);

const digitsOnly = getPasswordConstraints('12345678');
assert.equal(digitsOnly.find(item => item.id === 'length')?.met, true);
assert.equal(digitsOnly.find(item => item.id === 'letter')?.met, false);
assert.equal(digitsOnly.find(item => item.id === 'digit')?.met, true);
assert.equal(validatePasswordStrength('12345678').valid, false);

const strong = getPasswordConstraints('haslo123');
assert.equal(strong.every(item => item.met), true);
assert.equal(validatePasswordStrength('haslo123').valid, true);

const polishLetter = validatePasswordStrength('żółć5678');
assert.equal(polishLetter.valid, true);

console.log('password-policy tests passed');
