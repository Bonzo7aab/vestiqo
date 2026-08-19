import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

/**
 * Creates a Supabase admin client with an elevated API key (bypasses RLS).
 * Use only on the server — never in the browser or under `NEXT_PUBLIC_*`.
 *
 * Resolution order (see Supabase → Settings → API Keys):
 * 1. `SUPABASE_SECRET_KEY` — new secret key (`sb_secret_...`, recommended)
 * 2. `SUPABASE_SERVICE_ROLE_KEY` — legacy JWT `service_role` key (still supported)
 */
function isPublishableSupabaseKey(key: string): boolean {
  return key.startsWith('sb_publishable_')
}

function isJwtSupabaseKey(key: string): boolean {
  return key.startsWith('eyJ') && key.split('.').length === 3
}

function isNewSecretSupabaseKey(key: string): boolean {
  return key.startsWith('sb_secret_')
}

/**
 * Prefer a legacy service_role JWT when present. A mis-set SUPABASE_SECRET_KEY
 * (publishable key, or sb_secret_ that PostgREST rejects as Bearer) caused
 * OPD-171 "Invalid API key" on Vercel Preview while Auth signup still worked.
 */
function resolveElevatedSupabaseKey(): string | undefined {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim()
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const candidates = [secret, serviceRole].filter(
    (key): key is string => Boolean(key) && !isPublishableSupabaseKey(key),
  )

  return (
    candidates.find(isJwtSupabaseKey) ??
    candidates.find(isNewSecretSupabaseKey) ??
    candidates[0]
  )
}

/** True when server env has a key that can bypass RLS (auth admin, etc.). */
export function hasElevatedSupabaseKey(): boolean {
  return Boolean(resolveElevatedSupabaseKey() && process.env.NEXT_PUBLIC_SUPABASE_URL)
}

/** Exposes elevated key resolution for auth admin lookups (server-only). */
export function resolveElevatedSupabaseKeyForLookup(): string | undefined {
  return resolveElevatedSupabaseKey()
}

/**
 * Returns an elevated client when configured; otherwise `null` (no throw).
 * Use for optional admin features (e.g. auth.users email) in local dev without service role.
 */
export function createAdminClientOrNull(): ReturnType<typeof createClient<Database>> | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const elevatedKey = resolveElevatedSupabaseKey()
  if (!supabaseUrl || !elevatedKey) {
    return null
  }
  return createClient<Database>(supabaseUrl, elevatedKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const elevatedKey = resolveElevatedSupabaseKey()

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  }

  if (!elevatedKey) {
    throw new Error(
      'Missing Supabase elevated API key: set SUPABASE_SECRET_KEY (secret key, sb_secret_...) or SUPABASE_SERVICE_ROLE_KEY (legacy JWT) in server env — Supabase Dashboard → Settings → API Keys'
    )
  }

  return createClient<Database>(supabaseUrl, elevatedKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

