# Archived unused schema

Removed from active database on **2026-06-11** via [`supabase/migrations/20260611140000_drop_unused_schema.sql`](../../supabase/migrations/20260611140000_drop_unused_schema.sql) (applied on prod and test).

## Why dropped

- No `.from()` usage in application code
- No inbound foreign keys from actively used tables
- No pg_cron / edge function dependencies
- Prod and test had at most seed/demo rows (≤10 per table)

## Removed objects

**Tables:** `subscription_plans`, `user_subscriptions`, `activity_logs`, `user_feedback`, `support_tickets`, `support_ticket_messages`, `image_galleries`, `document_templates`, `shared_files`, `storage_quotas`, `company_storage_quotas`, `certificate_categories`, `certificate_templates`, `file_processing_queue`

**Views:** `contractor_browse_view`, `manager_browse_view`

**Functions:** `get_contractors_for_browse`, `get_managers_for_browse`

## Recovery

Full original `CREATE TABLE` / view / function DDL lives in git history before this commit:

- `database/01_core_tables.sql` — subscription tables
- `database/02_communication.sql` — activity_logs, user_feedback, support_*
- `database/03_file_management.sql` — file extras, certificate taxonomy, processing queue
- `database/14_contractor_profiles.sql` — contractor browse view + RPC
- `database/21_manager_profiles.sql` — manager browse view + RPC
- `database/04_security_policies.sql` — RLS for removed tables

To restore locally, revert those files and re-run bootstrap SQL (not recommended unless re-implementing the feature).

## Replacements in app

| Removed | Use instead |
|---------|-------------|
| `image_galleries` | `file_uploads`, `portfolio_project_images`, listing `images` JSON |
| Browse views / RPCs | Direct queries on `companies` + `company_ratings` (`src/lib/database/contractors.ts`, `managers.ts`) |
| `certificate_categories` | Free-text `certificates.type` column |
| Billing tables | Not implemented — add new migration when Stripe/billing ships |
