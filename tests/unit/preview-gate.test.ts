/**
 * Preview gate cookie HMAC (run: npx tsx tests/unit/preview-gate.test.ts)
 */
import assert from 'node:assert/strict';
import {
  signPreviewGateCookie,
  verifyPreviewGateCookie,
} from '../../src/lib/preview-gate';

async function main(): Promise<void> {
  const password = 'correct-horse-battery';
  const otherPassword = 'different-password';

  const signed = await signPreviewGateCookie(password);
  assert.equal(typeof signed, 'string');
  assert.ok(signed.length > 0);

  assert.equal(await verifyPreviewGateCookie(signed, password), true);
  assert.equal(await verifyPreviewGateCookie(signed, otherPassword), false);
  assert.equal(await verifyPreviewGateCookie('not-a-valid-cookie', password), false);
  assert.equal(await verifyPreviewGateCookie('', password), false);

  const rotated = await signPreviewGateCookie(otherPassword);
  assert.equal(await verifyPreviewGateCookie(rotated, otherPassword), true);
  assert.equal(await verifyPreviewGateCookie(signed, otherPassword), false);
  assert.notEqual(signed, rotated);

  console.log('preview-gate tests passed');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
