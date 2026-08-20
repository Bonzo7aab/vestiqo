/**
 * Known app routes used by middleware (run: npx tsx tests/unit/known-app-routes.test.ts)
 */
import assert from 'node:assert/strict';
import { isKnownAppRoute } from '../../src/lib/known-app-routes';

assert.equal(isKnownAppRoute('/'), true);
assert.equal(isKnownAppRoute('/co-nowego'), true);
assert.equal(isKnownAppRoute('/uzytkownik/abc-123'), true);
assert.equal(isKnownAppRoute('/konkurs/abc-123'), true);
assert.equal(isKnownAppRoute('/panel-zarzadcy/kalendarz'), true);
assert.equal(isKnownAppRoute('/foo-bar'), false);
assert.equal(isKnownAppRoute('/not-a-real-route'), false);

console.log('known-app-routes.test.ts: ok');
