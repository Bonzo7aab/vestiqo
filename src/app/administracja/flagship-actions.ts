'use server';

import { instrumentServerAction } from '../../lib/sentry/instrument-server-action';
import { requirePlatformAdmin } from '../../lib/admin/require-platform-admin';
import { getFlagshipConfig, isFlagshipConfigured } from '../../lib/flagship/config';
import { loadAdminFeatureFlags, type AdminFeatureFlagsSnapshot } from '../../lib/flagship/admin-flags';
import { getFlagshipDeploymentEnvironment } from '../../lib/flagship/environment';
import { isFlagshipFlagKey } from '../../lib/flagship/keys';
import { setFlagEnabled, UNKNOWN_FLAG_KEY_ERROR } from '../../lib/flagship/management';

async function logFlagshipAdminAction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  actorId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await sb.from('admin_action_logs').insert({
    actor_id: actorId,
    action_type: 'flagship_flag_update',
    entity_table: null,
    entity_id: null,
    payload,
  });
}

async function getAdminFeatureFlagsActionImpl(): Promise<AdminFeatureFlagsSnapshot> {
  const { userId, email } = await requirePlatformAdmin('/administracja/flagi');
  return loadAdminFeatureFlags({ id: userId, email });
}

async function setAdminFeatureFlagActionImpl(
  key: string,
  enabled: boolean,
): Promise<{ ok: boolean; error?: string; snapshot?: AdminFeatureFlagsSnapshot }> {
  const { supabase, userId, email } = await requirePlatformAdmin('/administracja/flagi');

  if (!isFlagshipFlagKey(key)) {
    return { ok: false, error: 'Nieznany klucz flagi' };
  }

  if (!isFlagshipConfigured()) {
    return {
      ok: false,
      error:
        'Flagship nie jest skonfigurowany. Ustaw FLAGSHIP_APP_ID, CLOUDFLARE_ACCOUNT_ID i CLOUDFLARE_FLAGSHIP_API_TOKEN.',
    };
  }

  const config = getFlagshipConfig();
  const result = await setFlagEnabled(config, key, enabled);

  if (result.ok === false) {
    const writeDenied = result.status === 403;
    return {
      ok: false,
      error: writeDenied
        ? 'Token nie ma uprawnienia Flagship Write. Dodaj Flagship Write w Cloudflare API token.'
        : result.error === UNKNOWN_FLAG_KEY_ERROR
          ? 'Nieznany klucz flagi'
          : result.error,
    };
  }

  const environment = getFlagshipDeploymentEnvironment();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await logFlagshipAdminAction(supabase as any, userId, {
    key,
    enabled,
    environment,
    appId: config.appId,
  });

  const snapshot = await loadAdminFeatureFlags({ id: userId, email });
  return { ok: true, snapshot };
}

export const getAdminFeatureFlagsAction = instrumentServerAction(
  'getAdminFeatureFlagsAction',
  getAdminFeatureFlagsActionImpl,
);

export const setAdminFeatureFlagAction = instrumentServerAction(
  'setAdminFeatureFlagAction',
  setAdminFeatureFlagActionImpl,
);
