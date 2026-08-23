/**
 * Flagship management client (run: npx tsx tests/unit/flagship-management.test.ts)
 */
import assert from 'node:assert/strict';
import {
  buildFlagPutBody,
  formatFlagshipHttpError,
  listKnownFlags,
  MISSING_FLAGSHIP_TOKEN_ERROR,
  setFlagEnabled,
  UNKNOWN_FLAG_KEY_ERROR,
  type FlagshipFlagPutBody,
  type FlagshipFlagRecord,
  type FlagshipManagementConfig,
} from '../../src/lib/flagship/management';
import { FLAGSHIP_FLAG_KEYS, TESTING_FEATURE_FLAG_KEYS } from '../../src/lib/flagship/keys';
import { getFlagshipDeploymentEnvironment } from '../../src/lib/flagship/environment';

const config: FlagshipManagementConfig = {
  appId: 'app-preview',
  accountId: 'account-1',
  authToken: 'token-1',
};

const ordersFlag: FlagshipFlagRecord = {
  key: FLAGSHIP_FLAG_KEYS.ORDERS,
  enabled: false,
  default_variation: 'off',
  variations: { on: true, off: false },
  rules: [{ priority: 1, serve_variation: 'on', conditions: [] }],
  description: 'Orders module',
  type: 'boolean',
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function main(): Promise<void> {
  assert.equal(getFlagshipDeploymentEnvironment('production'), 'production');
  assert.equal(getFlagshipDeploymentEnvironment('preview'), 'preview');
  assert.equal(getFlagshipDeploymentEnvironment('development'), 'development');
  assert.equal(getFlagshipDeploymentEnvironment(undefined), 'development');

  {
    const message = formatFlagshipHttpError(403, 'Authentication error');
    assert.match(message, /HTTP 403/);
    assert.match(message, /Authentication error/);
    assert.match(message, /CLOUDFLARE_FLAGSHIP_API_TOKEN/);
  }

  {
    const message = formatFlagshipHttpError(403, 'Forbidden', { authToken: 'cfat_exampletokenvalue' });
    assert.match(message, /token konta/);
    assert.match(message, /cfat_/);
    assert.match(message, /cfut_/);
    assert.match(message, /My Profile/);
  }

  {
    const body = buildFlagPutBody(ordersFlag, true);
    assert.equal(body.key, ordersFlag.key);
    assert.equal(body.enabled, true);
    assert.deepEqual(body.rules, ordersFlag.rules);
    assert.equal(body.default_variation, 'off');
    assert.deepEqual(body.variations, ordersFlag.variations);
    assert.equal(body.description, 'Orders module');
    assert.equal(body.type, 'boolean');
  }

  {
    const body = buildFlagPutBody(
      { ...ordersFlag, description: undefined, type: undefined },
      false,
    );
    assert.equal(body.key, ordersFlag.key);
    assert.equal(body.description, '');
    assert.equal(body.type, 'boolean');
  }

  {
    const body = buildFlagPutBody(
      { ...ordersFlag, rules: [], default_variation: 'off' },
      true,
    );
    assert.equal(body.enabled, true);
    assert.equal(body.default_variation, 'on');
    assert.deepEqual(body.rules, []);
  }

  {
    const body = buildFlagPutBody(
      { ...ordersFlag, rules: [], default_variation: 'off' },
      false,
    );
    assert.equal(body.enabled, false);
    assert.equal(body.default_variation, 'off');
  }

  {
    let called = false;
    const result = await setFlagEnabled(config, 'not-a-real-flag', true, async () => {
      called = true;
      throw new Error('fetch should not be called');
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error, UNKNOWN_FLAG_KEY_ERROR);
    }
    assert.equal(called, false);
  }

  {
    const result = await listKnownFlags({ appId: '', accountId: '', authToken: '' });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error, MISSING_FLAGSHIP_TOKEN_ERROR);
    }
  }

  {
    const result = await setFlagEnabled(
      { appId: 'a', accountId: 'b', authToken: '' },
      FLAGSHIP_FLAG_KEYS.ORDERS,
      true,
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error, MISSING_FLAGSHIP_TOKEN_ERROR);
    }
  }

  {
    const calls: Array<{ method: string; url: string; body?: unknown }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      const parsedBody = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
      calls.push({ method, url, body: parsedBody });

      if (method === 'GET') {
        return jsonResponse(200, { success: true, result: ordersFlag });
      }
      return jsonResponse(200, {
        success: true,
        result: { ...ordersFlag, enabled: true },
      });
    };

    const result = await setFlagEnabled(config, FLAGSHIP_FLAG_KEYS.ORDERS, true, fetchImpl);
    assert.equal(result.ok, true);
    assert.equal(calls.length, 2);
    assert.equal(calls[0]?.method, 'GET');
    assert.equal(calls[1]?.method, 'PUT');
    const putBody = calls[1]?.body as FlagshipFlagPutBody | undefined;
    assert.deepEqual(putBody?.rules, ordersFlag.rules);
    assert.equal(putBody?.enabled, true);
    assert.equal(putBody?.key, ordersFlag.key);
    assert.equal(putBody?.type, 'boolean');
    assert.equal(putBody?.description, 'Orders module');
  }

  {
    let putBody: { default_variation?: string; enabled?: boolean; rules?: unknown[] } | undefined;
    const fetchImpl: typeof fetch = async (_input, init) => {
      if ((init?.method ?? 'GET') === 'GET') {
        return jsonResponse(200, {
          success: true,
          result: { ...ordersFlag, rules: [], default_variation: 'off', enabled: false },
        });
      }
      putBody = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
      return jsonResponse(200, {
        success: true,
        result: { ...ordersFlag, rules: [], default_variation: 'on', enabled: true },
      });
    };

    const result = await setFlagEnabled(config, FLAGSHIP_FLAG_KEYS.ORDERS, true, fetchImpl);
    assert.equal(result.ok, true);
    assert.equal(putBody?.enabled, true);
    assert.equal(putBody?.default_variation, 'on');
    assert.deepEqual(putBody?.rules, []);
  }

  {
    const fetchImpl: typeof fetch = async (_input, init) => {
      if ((init?.method ?? 'GET') === 'GET') {
        return jsonResponse(200, { success: true, result: ordersFlag });
      }
      return jsonResponse(403, {
        success: false,
        errors: [{ message: 'Authentication error' }],
      });
    };

    const result = await setFlagEnabled(config, FLAGSHIP_FLAG_KEYS.ORDERS, true, fetchImpl);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 403);
      assert.equal(result.error, 'Authentication error');
    }
  }

  {
    const fetchImpl: typeof fetch = async () =>
      jsonResponse(200, {
        success: true,
        result: [
          ordersFlag,
          { ...ordersFlag, key: 'unknown-internal-flag', enabled: true },
          {
            key: FLAGSHIP_FLAG_KEYS.CONTRACTOR_SERVICES,
            enabled: true,
            default_variation: 'on',
            variations: { on: true, off: false },
            rules: [],
          },
        ],
      });

    const result = await listKnownFlags(config, fetchImpl);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.data.length, TESTING_FEATURE_FLAG_KEYS.length);
      const orders = result.data.find((item) => item.key === FLAGSHIP_FLAG_KEYS.ORDERS);
      const services = result.data.find((item) => item.key === FLAGSHIP_FLAG_KEYS.CONTRACTOR_SERVICES);
      const map = result.data.find((item) => item.key === FLAGSHIP_FLAG_KEYS.ENHANCED_MAP);
      const calendar = result.data.find((item) => item.key === FLAGSHIP_FLAG_KEYS.CALENDAR);
      assert.equal(orders?.enabled, false);
      assert.equal(orders?.missing, false);
      assert.equal(services?.enabled, true);
      assert.equal(map?.missing, true);
      assert.equal(map?.enabled, false);
      assert.equal(calendar?.missing, true);
      assert.equal(calendar?.enabled, false);
    }
  }

  console.log('flagship-management tests passed');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
