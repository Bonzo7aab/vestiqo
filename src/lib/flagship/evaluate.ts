import 'server-only';

import type { EvaluationContext } from '@openfeature/server-sdk';
import { ErrorCode } from '@openfeature/server-sdk';
import { isFlagshipConfigured } from './config';
import type { FlagshipFlagKey, TestingFeatureFlags } from './keys';
import { TESTING_FEATURE_FLAG_KEYS } from './keys';
import { getOpenFeatureClient } from './provider';

function isBenignFlagEvaluationError(errorCode?: ErrorCode): boolean {
  return errorCode === ErrorCode.FLAG_NOT_FOUND;
}

export async function getBooleanFlag(
  flagKey: FlagshipFlagKey,
  defaultValue: boolean,
  context?: EvaluationContext,
): Promise<boolean> {
  if (!isFlagshipConfigured()) {
    return defaultValue;
  }

  try {
    const client = await getOpenFeatureClient();
    const details = await client.getBooleanDetails(flagKey, defaultValue, context);

    if (details.reason === 'DISABLED' || isBenignFlagEvaluationError(details.errorCode)) {
      return defaultValue;
    }

    if (details.errorCode) {
      console.error(
        `[flagship] Failed to evaluate "${flagKey}":`,
        details.errorCode,
        details.errorMessage ?? '',
      );
      return defaultValue;
    }

    return details.value;
  } catch (error) {
    console.error(`[flagship] Failed to evaluate "${flagKey}":`, error);
    return defaultValue;
  }
}

export async function isFeatureEnabled(
  flagKey: FlagshipFlagKey,
  context?: EvaluationContext,
): Promise<boolean> {
  return getBooleanFlag(flagKey, false, context);
}

export interface BooleanFlagInspection {
  value: boolean;
  missing: boolean;
}

export async function inspectBooleanFlag(
  flagKey: FlagshipFlagKey,
  context?: EvaluationContext,
): Promise<BooleanFlagInspection> {
  if (!isFlagshipConfigured()) {
    return { value: false, missing: true };
  }

  try {
    const client = await getOpenFeatureClient();
    const details = await client.getBooleanDetails(flagKey, false, context);
    if (isBenignFlagEvaluationError(details.errorCode)) {
      return { value: false, missing: true };
    }
    if (details.reason === 'DISABLED') {
      return { value: false, missing: false };
    }
    if (details.errorCode) {
      return { value: false, missing: false };
    }
    return { value: details.value, missing: false };
  } catch {
    return { value: false, missing: true };
  }
}

export async function getTestingFeatureFlags(
  context?: EvaluationContext,
): Promise<TestingFeatureFlags> {
  const entries = await Promise.all(
    TESTING_FEATURE_FLAG_KEYS.map(async (key) => {
      const value = await getBooleanFlag(key, false, context);
      return [key, value] as const;
    }),
  );

  return Object.fromEntries(entries) as TestingFeatureFlags;
}
