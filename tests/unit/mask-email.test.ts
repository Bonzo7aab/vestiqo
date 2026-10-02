/**
 * Email masking for NIP account recovery.
 * Run: npx tsx tests/unit/mask-email.test.ts
 */
import assert from 'node:assert/strict';
import { maskEmail } from '../../src/lib/auth/mask-email';

assert.equal(maskEmail('anna@example.com'), 'a***@example.com');
assert.equal(maskEmail('  Michal@Domena.PL '), 'm***@domena.pl');
assert.equal(maskEmail('a@b.co'), 'a***@b.co');
assert.equal(maskEmail('not-an-email'), '***');
assert.equal(maskEmail('@nodomain'), '***');

console.log('mask-email.test.ts: ok');
