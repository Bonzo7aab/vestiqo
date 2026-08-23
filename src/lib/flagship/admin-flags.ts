import 'server-only';

import { getFlagshipConfig, isFlagshipConfigured } from './config';
import { buildEvaluationContext } from './context';
import {
  FLAGSHIP_ENVIRONMENT_LABELS,
  getFlagshipDeploymentEnvironment,
  type FlagshipDeploymentEnvironment,
} from './environment';
import { inspectBooleanFlag, isFeatureEnabled } from './evaluate';
import { TESTING_FEATURE_FLAG_KEYS, type FlagshipFlagKey } from './keys';
import { formatFlagshipHttpError, listKnownFlags } from './management';

export interface AdminFeatureFlagView {
  key: FlagshipFlagKey;
  enabled: boolean;
  missing: boolean;
  evaluated: boolean;
  evaluationMismatch: boolean;
}

export interface AdminFeatureFlagsSnapshot {
  configured: boolean;
  canWrite: boolean;
  environment: FlagshipDeploymentEnvironment;
  environmentLabel: string;
  appId: string | null;
  flags: AdminFeatureFlagView[];
  error?: string;
  evaluatedAt: string;
}

function emptyFlags(): AdminFeatureFlagView[] {
  return TESTING_FEATURE_FLAG_KEYS.map((key) => ({
    key,
    enabled: false,
    missing: true,
    evaluated: false,
    evaluationMismatch: false,
  }));
}

export async function loadAdminFeatureFlags(user: {
  id: string;
  email?: string;
}): Promise<AdminFeatureFlagsSnapshot> {
  const environment = getFlagshipDeploymentEnvironment();
  const evaluatedAt = new Date().toISOString();

  if (!isFlagshipConfigured()) {
    return {
      configured: false,
      canWrite: false,
      environment,
      environmentLabel: FLAGSHIP_ENVIRONMENT_LABELS[environment],
      appId: null,
      flags: emptyFlags(),
      error:
        'Flagship nie jest skonfigurowany. Ustaw FLAGSHIP_APP_ID, CLOUDFLARE_ACCOUNT_ID i CLOUDFLARE_FLAGSHIP_API_TOKEN.',
      evaluatedAt,
    };
  }

  const evaluationContext = buildEvaluationContext({
    id: user.id,
    email: user.email,
    platformRole: 'platform_admin',
  });

  const config = getFlagshipConfig();
  const listed = await listKnownFlags(config);

  if (listed.ok === false) {
    const flags = await Promise.all(
      TESTING_FEATURE_FLAG_KEYS.map(async (key) => {
        const inspection = await inspectBooleanFlag(key, evaluationContext);
        return {
          key,
          enabled: inspection.value,
          missing: inspection.missing,
          evaluated: inspection.value,
          evaluationMismatch: false,
        };
      }),
    );

    return {
      configured: true,
      canWrite: false,
      environment,
      environmentLabel: FLAGSHIP_ENVIRONMENT_LABELS[environment],
      appId: config.appId,
      flags,
      error:
        listed.status === 401 || listed.status === 403
          ? formatFlagshipHttpError(listed.status, listed.error, { authToken: config.authToken })
          : listed.error,
      evaluatedAt,
    };
  }

  const flags = await Promise.all(
    listed.data.map(async (item) => {
      const evaluated = item.missing ? false : await isFeatureEnabled(item.key, evaluationContext);
      return {
        key: item.key,
        enabled: item.enabled,
        missing: item.missing,
        evaluated,
        evaluationMismatch: item.enabled && !item.missing && !evaluated,
      };
    }),
  );

  return {
    configured: true,
    canWrite: true,
    environment,
    environmentLabel: FLAGSHIP_ENVIRONMENT_LABELS[environment],
    appId: config.appId,
    flags,
    evaluatedAt,
  };
}
