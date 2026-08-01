# Pending production SQL

Queue for SQL that is **not yet** in production Supabase migration history (`vestiqo`, `fabbgaqxsetnsppxegnx`).

**Status (2026-07-25):** Two files pending prod. Duplicates that already live under [`supabase/migrations/`](../../supabase/migrations/) were removed from this folder.

## Workflow

1. **Add** new migrations here first (not in `supabase/migrations/` until prod is caught up).
2. **Test** — apply via Supabase MCP/SQL on `vestiqo-test` (`hcnoqbnschbsxsjrbxao`).
3. **Prod** — when approved, apply to production, then move files to `supabase/migrations/` and update this README.

After a file is applied to prod, **move it** to [`supabase/migrations/`](../../supabase/migrations/) and remove it from this folder.

## Files (newest last)

| File | Purpose | Test | Prod |
|------|---------|------|------|
| `20260701120000_contest_offers_one_per_company.sql` | Unique non-cancelled offer per company per contest | applied 2026-07-17 | pending |
| `20260725120000_contest_offers_contractor_delete_draft.sql` | RLS: contractors may DELETE own `draft` offers (Odrzuć szkic) | applied 2026-07-25 | pending |

## Recently applied to production (2026-07-01)

| File | Purpose |
|------|---------|
| `20260630120000_opd118_registry_verification.sql` | OPD-118 CEIDG/KRS registry columns on `companies` and finance registry status on `contractor_account_settings` |

## Recently applied to production (2026-06-29)

| File | Purpose |
|------|---------|
| `20260629120000_ensure_opd105_category_tree.sql` | OPD-105 category tree ensure |
| `20260629130000_fix_browse_rls_policies.sql` | Browse RLS fixes |
| `20260629140000_grant_is_admin_execute_to_anon.sql` | Grant `is_admin` execute to anon |
| `20260629150000_restore_contest_questions_contractor_public_read.sql` | Contest questions public read for contractors |

(These four are tracked in `supabase/migrations/` — do not re-queue them here.)

## Manual Auth dashboard follow-up (production + test)

These cannot be changed via SQL migration. Enable in Supabase Dashboard → **Authentication** for both `vestiqo` and `vestiqo-test`:

1. **Leaked password protection** — [Password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection): enable HaveIBeenPwned check.
2. **MFA options** — [Auth MFA](https://supabase.com/docs/guides/auth/auth-mfa): enable TOTP and any additional factors you want to offer.

## Safety

Do not apply this folder to production without explicit approval. See [`.cursor/rules/supabase-production-safety.mdc`](../../.cursor/rules/supabase-production-safety.mdc).

Environments overview: [`docs/environments.md`](../../docs/environments.md).
