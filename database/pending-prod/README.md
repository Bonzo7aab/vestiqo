# Pending production SQL

SQL in this folder is **not recorded** in the production Supabase migration history (`vestiqo`, `fabbgaqxsetnsppxegnx`).

Use it as a queue: review here, apply to **test** first, then ask to apply to **prod** when ready.

## Workflow

1. **Add** new migrations here first (not in `supabase/migrations/` until prod is caught up).
2. **Test** — apply via Supabase MCP/SQL on `vestiqo-test` (`hcnoqbnschbsxsjrbxao`).
3. **Prod** — when approved, say e.g. *“apply pending-prod to production”* or move files back to `supabase/migrations/` and run `supabase db push`.

After a file is applied to prod, **move it** to [`supabase/migrations/`](../supabase/migrations/) and remove it from this folder (update this README).

## Files (newest last)

| File | Purpose | Test | Prod migration history |
|------|---------|------|------------------------|
| `20260514120000_job_applications_vat_rate.sql` | VAT rate on job applications | Unknown | No |
| `20260522120000_opd55_update_categories_4_5.sql` | Category taxonomy update | Unknown | No |
| `20260523120000_opd46_review_images.sql` | Review images | Unknown | No |
| `20260525120000_opd53_tender_contest_fields.sql` | Contest fields on `tenders` | Unknown | No* |
| `20260526120000_opd66_contest_offer_drafts.sql` | Contest offer drafts on `tender_bids` | Unknown | No |
| `20260526140000_opd60_contest_deadline_cron.sql` | Contest deadline pg_cron | Unknown | No |
| `20260527120000_opd70_contest_questions.sql` | Base contest Q&A tables/RPCs | Unknown | No** |
| `20260527180000_opd70_remove_legacy_tenders.sql` | Remove legacy Przetarg rows | Unknown | No |
| `20260528120000_opd63_orders.sql` | `orders` table | Unknown | No* |
| `20260528130000_opd63_orders_grants.sql` | Grants for `orders` | Unknown | No |
| `20260605120000_backfill_tender_bids_count.sql` | Backfill `tender_bids` counts | Unknown | No |
| `20260611130000_push_subscriptions.sql` | Track `push_subscriptions` DDL + RLS | Applied | No*** |
| `20260611140000_drop_unused_schema.sql` | Drop 14 unused tables + browse RPCs | Applied | No |
| `20260612120000_rename_tenders_to_contests.sql` | Rename `tenders`→`contests`, `tender_bids`→`contest_offers`, columns, RLS, RPCs | Applied | No |
| `20260620120000_opd41_in_app_notifications.sql` | OPD-41 in-app notification prefs (3 columns) | Applied | No |
| `20260620120001_opd41_contest_end_cron.sql` | OPD-41 contest-end cron + manager critical notify | Applied | No |

\*Prod may already have the resulting schema from manual/`database/*.sql` runs — migration history is still missing.  
\*\*Prod has later OPD-70 migrations; base file may be redundant if schema already exists — verify before applying.  
\*\*\*`push_subscriptions` table exists on prod; this file formalizes DDL/RLS in migration history.

## Already on production

Migrations that remain in [`supabase/migrations/`](../supabase/migrations/) match prod history (bookmarks rename, OPD-70 follow-ups, cooperation reviews, etc.). See [`../SCHEMA_INVENTORY.md`](../SCHEMA_INVENTORY.md).

## Safety

Do not apply this folder to production without explicit approval. See [`.cursor/rules/supabase-production-safety.mdc`](../../.cursor/rules/supabase-production-safety.mdc).
