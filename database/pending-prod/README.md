# Pending production SQL

Queue for SQL that is **not yet** in production Supabase migration history (`vestiqo`, `fabbgaqxsetnsppxegnx`).

**Status (2026-06-20):** Queue empty — all former files were applied to prod and moved to [`supabase/migrations/`](../../supabase/migrations/).

## Workflow

1. **Add** new migrations here first (not in `supabase/migrations/` until prod is caught up).
2. **Test** — apply via Supabase MCP/SQL on `vestiqo-test` (`hcnoqbnschbsxsjrbxao`).
3. **Prod** — when approved, apply to production, then move files to `supabase/migrations/` and update this README.

After a file is applied to prod, **move it** to [`supabase/migrations/`](../../supabase/migrations/) and remove it from this folder.

## Files (newest last)

| File | Purpose | Test | Prod |
|------|---------|------|------|
| `20260621120000_opd41_split_contractor_prefs.sql` | OPD-41 split win/lose contractor toggles | Applied | No |
| `20260621120001_opd41_contest_end_emoji.sql` | OPD-41 contest-end notification emoji | Applied | No |

## Already on production

All migrations through OPD-105, OPD-41, OPD-106, and `no_offers` contest status are recorded in prod history. See [`supabase/migrations/`](../../supabase/migrations/) and [`../SCHEMA_INVENTORY.md`](../SCHEMA_INVENTORY.md).

## Safety

Do not apply this folder to production without explicit approval. See [`.cursor/rules/supabase-production-safety.mdc`](../../.cursor/rules/supabase-production-safety.mdc).
