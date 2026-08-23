import { isFlagshipFlagKey, TESTING_FEATURE_FLAG_KEYS, type FlagshipFlagKey } from './keys';

export const UNKNOWN_FLAG_KEY_ERROR = 'Unknown flag key';
export const MISSING_FLAGSHIP_TOKEN_ERROR = 'Flagship is not configured';

export function isCloudflareAccountOwnedToken(token: string): boolean {
  return token.startsWith('cfat_');
}

export function formatFlagshipHttpError(
  status: number | undefined,
  apiError: string,
  options?: { authToken?: string },
): string {
  const detail = apiError.trim();
  if (status === 401 || status === 403) {
    if (options?.authToken && isCloudflareAccountOwnedToken(options.authToken)) {
      return (
        `Cloudflare odrzucił token konta (HTTP ${status}${detail ? `: ${detail}` : ''}). ` +
        'CLOUDFLARE_FLAGSHIP_API_TOKEN zaczyna się od cfat_ — to Account API Token. ' +
        'Evaluate działa, ale GET/PUT /flags nie przyjmuje tokenów konta. ' +
        'Utwórz User API Token: dash.cloudflare.com → ikona profilu (nie konto) → My Profile → API Tokens → Create Token → Custom. ' +
        'Permissions: Account → Flagship → Read oraz Edit. Wartość zaczyna się od cfut_. ' +
        'Wklej ją do .env.local i do Vercel (Edit istniejących zmiennych Production/Preview), potem restart / redeploy.'
      );
    }
    return (
      `Cloudflare odrzucił token (HTTP ${status}${detail ? `: ${detail}` : ''}). ` +
      'Wklej nowo wygenerowany User API Token (prefix cfut_, nie cfat_) do CLOUDFLARE_FLAGSHIP_API_TOKEN (.env.local i Vercel) i zrestartuj serwer albo zrób redeploy. ' +
      'Ewaluacja flag może działać przy samym Flagship Read, ale lista i przełączanie w panelu wymagają też Flagship Edit. ' +
      'Account resources musi obejmować konto z CLOUDFLARE_ACCOUNT_ID. ' +
      'Na Vercel edytuj istniejące zmienne Production/Preview — nowy wiersz tylko dla Development nie nadpisze produkcji.'
    );
  }
  return detail || `Flagship request failed (${status ?? 'unknown'})`;
}

export interface FlagshipManagementConfig {
  appId: string;
  accountId: string;
  authToken: string;
}

export interface FlagshipFlagRecord {
  key: string;
  enabled: boolean;
  default_variation: string;
  variations: Record<string, unknown>;
  rules: unknown[];
  description?: string;
  type?: string;
}

export interface FlagshipFlagPutBody {
  key: string;
  enabled: boolean;
  default_variation: string;
  variations: Record<string, unknown>;
  rules: unknown[];
  description: string;
  type: string;
}

export interface KnownFlagState {
  key: FlagshipFlagKey;
  enabled: boolean;
  missing: boolean;
  defaultVariation: string | null;
}

export type FlagshipManagementResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

interface CloudflareV4Response<T> {
  success?: boolean;
  errors?: Array<{ code?: number; message?: string }>;
  result?: T;
}

export function findBooleanVariationKey(
  variations: Record<string, unknown>,
  value: boolean,
): string | undefined {
  return Object.keys(variations).find((key) => variations[key] === value);
}

export function variationBooleanValue(
  variations: Record<string, unknown>,
  variationKey: string,
): boolean | undefined {
  const value = variations[variationKey];
  return typeof value === 'boolean' ? value : undefined;
}

export function buildFlagPutBody(
  current: FlagshipFlagRecord,
  enabled: boolean,
): FlagshipFlagPutBody {
  const rules = Array.isArray(current.rules) ? current.rules : [];
  let defaultVariation = current.default_variation;

  if (
    enabled &&
    rules.length === 0 &&
    variationBooleanValue(current.variations, defaultVariation) === false
  ) {
    const onKey = findBooleanVariationKey(current.variations, true);
    if (onKey) {
      defaultVariation = onKey;
    }
  }

  const body: FlagshipFlagPutBody = {
    key: current.key,
    enabled,
    default_variation: defaultVariation,
    variations: current.variations,
    rules,
    description: current.description ?? '',
    type: current.type ?? 'boolean',
  };

  return body;
}

export function parseFlagRecord(value: unknown): FlagshipFlagRecord | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.key !== 'string' || typeof record.enabled !== 'boolean') {
    return null;
  }
  if (typeof record.default_variation !== 'string') {
    return null;
  }
  if (!record.variations || typeof record.variations !== 'object' || Array.isArray(record.variations)) {
    return null;
  }

  return {
    key: record.key,
    enabled: record.enabled,
    default_variation: record.default_variation,
    variations: record.variations as Record<string, unknown>,
    rules: Array.isArray(record.rules) ? record.rules : [],
    description: typeof record.description === 'string' ? record.description : undefined,
    type: typeof record.type === 'string' ? record.type : undefined,
  };
}

function flagshipFlagsUrl(config: FlagshipManagementConfig, flagKey?: string): string {
  const base = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.accountId)}/flagship/apps/${encodeURIComponent(config.appId)}/flags`;
  return flagKey ? `${base}/${encodeURIComponent(flagKey)}` : base;
}

function cloudflareErrorMessage(
  payload: CloudflareV4Response<unknown> | null,
  fallback: string,
): string {
  const first = payload?.errors?.find((item) => item.message)?.message;
  return first?.trim() || fallback;
}

async function parseCloudflareJson(response: Response): Promise<CloudflareV4Response<unknown> | null> {
  try {
    return (await response.json()) as CloudflareV4Response<unknown>;
  } catch {
    return null;
  }
}

function isConfigured(config: FlagshipManagementConfig): boolean {
  return Boolean(config.appId && config.accountId && config.authToken);
}

function extractFlagList(result: unknown): unknown[] {
  if (Array.isArray(result)) {
    return result;
  }
  if (result && typeof result === 'object' && Array.isArray((result as { flags?: unknown }).flags)) {
    return (result as { flags: unknown[] }).flags;
  }
  return [];
}

export async function listKnownFlags(
  config: FlagshipManagementConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<FlagshipManagementResult<KnownFlagState[]>> {
  if (!isConfigured(config)) {
    return { ok: false, error: MISSING_FLAGSHIP_TOKEN_ERROR };
  }

  try {
    const response = await fetchImpl(flagshipFlagsUrl(config), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.authToken}`,
      },
      cache: 'no-store',
    });
    const payload = await parseCloudflareJson(response);

    if (!response.ok || payload?.success === false) {
      return {
        ok: false,
        error: cloudflareErrorMessage(payload, `Flagship list failed (${response.status})`),
        status: response.status,
      };
    }

    const byKey = new Map<string, FlagshipFlagRecord>();
    for (const item of extractFlagList(payload?.result)) {
      const parsed = parseFlagRecord(item);
      if (parsed && isFlagshipFlagKey(parsed.key)) {
        byKey.set(parsed.key, parsed);
      }
    }

    return {
      ok: true,
      data: TESTING_FEATURE_FLAG_KEYS.map((key) => {
        const match = byKey.get(key);
        return {
          key,
          enabled: match?.enabled ?? false,
          missing: !match,
          defaultVariation: match?.default_variation ?? null,
        };
      }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Flagship list failed';
    return { ok: false, error: message };
  }
}

export async function setFlagEnabled(
  config: FlagshipManagementConfig,
  key: string,
  enabled: boolean,
  fetchImpl: typeof fetch = fetch,
): Promise<FlagshipManagementResult<FlagshipFlagRecord>> {
  if (!isConfigured(config)) {
    return { ok: false, error: MISSING_FLAGSHIP_TOKEN_ERROR };
  }

  if (!isFlagshipFlagKey(key)) {
    return { ok: false, error: UNKNOWN_FLAG_KEY_ERROR };
  }

  const headers = {
    Authorization: `Bearer ${config.authToken}`,
    'Content-Type': 'application/json',
  };

  try {
    const getResponse = await fetchImpl(flagshipFlagsUrl(config, key), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.authToken}`,
      },
      cache: 'no-store',
    });
    const getPayload = await parseCloudflareJson(getResponse);

    if (!getResponse.ok || getPayload?.success === false) {
      return {
        ok: false,
        error: cloudflareErrorMessage(getPayload, `Flagship get failed (${getResponse.status})`),
        status: getResponse.status,
      };
    }

    const current = parseFlagRecord(getPayload?.result);
    if (!current) {
      return { ok: false, error: 'Flagship returned an invalid flag definition' };
    }

    const body = buildFlagPutBody(current, enabled);
    const putResponse = await fetchImpl(flagshipFlagsUrl(config, key), {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const putPayload = await parseCloudflareJson(putResponse);

    if (!putResponse.ok || putPayload?.success === false) {
      return {
        ok: false,
        error: cloudflareErrorMessage(putPayload, `Flagship update failed (${putResponse.status})`),
        status: putResponse.status,
      };
    }

    const updated = parseFlagRecord(putPayload?.result) ?? {
      ...current,
      ...body,
      key,
    };

    return { ok: true, data: updated };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Flagship update failed';
    return { ok: false, error: message };
  }
}
