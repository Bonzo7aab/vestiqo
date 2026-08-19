/**
 * GUS BIR session lock (run: npx tsx tests/unit/gus-session-lock.test.ts)
 */
import assert from 'node:assert/strict';
import { withGusSession } from '../../src/lib/gus/session-lock';

async function main(): Promise<void> {
  const events: string[] = [];

  const first = withGusSession(async () => {
    events.push('first-start');
    await new Promise((resolve) => setTimeout(resolve, 20));
    events.push('first-end');
    return 1;
  });

  const second = withGusSession(async () => {
    events.push('second-start');
    events.push('second-end');
    return 2;
  });

  const [firstResult, secondResult] = await Promise.all([first, second]);

  assert.equal(firstResult, 1);
  assert.equal(secondResult, 2);
  assert.deepEqual(events, ['first-start', 'first-end', 'second-start', 'second-end']);

  console.log('gus-session-lock.test.ts: ok');
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
