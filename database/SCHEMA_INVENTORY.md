# Schema inventory — table usage and naming

Last updated: 2026-06-20. Cross-reference of SQL schema vs `src/` Supabase queries (`.from('…')`).

For migration order see [README.md](./README.md). **New prod-pending SQL:** [`pending-prod/`](./pending-prod/) (queue empty). For production safety see [`.cursor/rules/supabase-production-safety.mdc`](../.cursor/rules/supabase-production-safety.mdc).

---

## Summary

| Category | Count |
|----------|-------|
| Active tables | 30 |
| Pending prod migrations | 0 (queue empty as of 2026-06-20) |

---

## Actively used tables (30)

These tables have `.from()` usage in `src/`:

`user_profiles`, `user_companies`, `companies`, `buildings`, `job_categories`, `jobs`, `contests`, `job_applications`, `contest_offers`, `bookmarks`, `orders`, `company_reviews`, `company_ratings`, `portfolio_projects`, `portfolio_project_images`, `certificates`, `file_uploads`, `conversations`, `messages`, `message_read_status`, `notifications`, `notification_preferences`, `push_subscriptions`, `questions`, `question_comments`, `platform_settings`, `admin_action_logs`, `verification_decisions`, `admin_user_notes`, `contractor_account_settings`

---

## Production schema status

Prod (`vestiqo`) and test (`vestiqo-test`) both use `contests` / `contest_offers` (tenders rename applied). Recent migrations on prod include:

- Drop unused schema, push subscriptions
- VAT whitelist columns on `contractor_account_settings`
- OPD-105 short category names
- OPD-41 in-app notification preferences + contest-end cron
- OPD-106 selection protocol (`selection_justification`, `awarded_at`)
- `no_offers` contest status + updated deadline function

Source SQL lives in [`supabase/migrations/`](../supabase/migrations/). New migrations go to [`pending-prod/`](./pending-prod/) until applied to prod.

---

## TypeScript types

[`src/types/database.ts`](../src/types/database.ts) is hand-maintained. Regenerate when convenient: `supabase gen types typescript`.
