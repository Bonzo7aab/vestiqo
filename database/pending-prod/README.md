# Pending production SQL

Queue for SQL that is **not yet** in production Supabase migration history (`vestiqo`, `fabbgaqxsetnsppxegnx`).

**Status (2026-07-01):** Queue empty — OPD-118 registry verification applied to prod and tracked in [`supabase/migrations/`](../../supabase/migrations/).

## Workflow

1. **Add** new migrations here first (not in `supabase/migrations/` until prod is caught up).
2. **Test** — apply via Supabase MCP/SQL on `vestiqo-test` (`hcnoqbnschbsxsjrbxao`).
3. **Prod** — when approved, apply to production, then move files to `supabase/migrations/` and update this README.

After a file is applied to prod, **move it** to [`supabase/migrations/`](../../supabase/migrations/) and remove it from this folder.

## Files (newest last)

| File | Purpose | Test | Prod |
|------|---------|------|------|
| `20260625120000_managed_housing_entities.sql` | WM/SM entities replace buildings table | pending | pending |

## Recently applied to production (2026-07-01)

| File | Purpose |
|------|---------|
| `20260630120000_opd118_registry_verification.sql` | OPD-118 CEIDG/KRS registry columns on `companies` and finance registry status on `contractor_account_settings` |

## Recently applied to production (2026-06-24)

| File | Purpose |
|------|---------|
| `20260624120000_prod_security_rls_hardening.sql` | Re-enable RLS on 6 tables, drop broad companies policy, harden notifications INSERT, tighten SELECT policies, lock down cron/contest RPCs, fix `budget_data_view` security invoker |

## Manual Auth dashboard follow-up (production + test)

These cannot be changed via SQL migration. Enable in Supabase Dashboard → **Authentication** for both `vestiqo` and `vestiqo-test`:

1. **Leaked password protection** — [Password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection): enable HaveIBeenPwned check.
2. **MFA options** — [Auth MFA](https://supabase.com/docs/guides/auth/auth-mfa): enable TOTP and any additional factors you want to offer.

## Recently applied to production (2026-06-21)

| File | Purpose |
|------|---------|
| `20260621120000_opd41_split_contractor_prefs.sql` | OPD-41 split win/lose contractor notification toggles |
| `20260621120001_opd41_contest_end_emoji.sql` | OPD-41 contest-end notification emoji in cron function |
| `20260621130000_contest_renewed_from.sql` | OPD-111 contest renewal chain (`renewed_from_contest_id`) |

## Safety

Do not apply this folder to production without explicit approval. See [`.cursor/rules/supabase-production-safety.mdc`](../../.cursor/rules/supabase-production-safety.mdc).
