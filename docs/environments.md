# Environments (local / test / production)

Use this when developing or QA’ing features **without touching production data**.

## Targets

| Target | Supabase project | Ref | App URL | When to use |
|--------|------------------|-----|---------|-------------|
| **Local Docker** | `domio` (CLI) | `localhost:54321` | `http://localhost:3000` | Isolated E2E, schema experiments, offline |
| **Cloud test** | `vestiqo-test` | `hcnoqbnschbsxsjrbxao` | localhost or **Vercel Preview** | Day-to-day feature work, shareable PR previews |
| **Production** | `vestiqo` | `fabbgaqxsetnsppxegnx` | production domain | Live users only |

Safety rules: [`.cursor/rules/supabase-production-safety.mdc`](../.cursor/rules/supabase-production-safety.mdc).

## Local env files

| File | Purpose |
|------|---------|
| `.env.local` | Daily `npm run dev` — should point at **vestiqo-test**, not prod |
| `.env.test.local` | Playwright + local Docker Supabase (`E2E_USE_LOCAL_SUPABASE=true`) |
| `.env.test-cloud.local` | Optional Playwright against cloud test (see `tests/env.example.txt`) |

Templates: [`.env.example`](../.env.example), [`tests/env.example.txt`](../tests/env.example.txt), [`tests/env.local.example.txt`](../tests/env.local.example.txt), [`tests/env.test-cloud.example.txt`](../tests/env.test-cloud.example.txt).

**Do not** leave production keys uncommented in `.env.local` for feature work.

## Vercel

| Environment | Supabase |
|-------------|----------|
| **Production** | `vestiqo` (`fabbgaqxsetnsppxegnx`) |
| **Preview** | `vestiqo-test` (`hcnoqbnschbsxsjrbxao`) |
| **Development** | `vestiqo-test` |

After changing Preview env vars, redeploy the preview (or push a new commit) so the build picks them up.

Verify (values are redacted by the CLI, but hosts appear in the dashboard):

```bash
npx vercel env ls | grep SUPABASE
```

Production must stay on `fabbgaqxsetnsppxegnx`. Preview/Development must stay on `hcnoqbnschbsxsjrbxao`.

## Seed / sample accounts (cloud test)

`vestiqo-test` already has categories, companies, contests, and E2E users. Refresh or repair with:

```bash
npm run seed:test
```

Default seeded logins (override via env — see `tests/env.example.txt`):

| Role | Email | Password |
|------|-------|----------|
| Manager | `zarzadca3@openpro.pl` | `Test1!` |
| Contractor | `wykonawca3@openpro.pl` | `Test1!` |

## Schema / migrations

1. New SQL goes in [`database/pending-prod/`](../database/pending-prod/) first.
2. Apply to **vestiqo-test**, verify.
3. After explicit approval, apply to **production**, then move the file to [`supabase/migrations/`](../supabase/migrations/).

### Local schema (prefer this)

```bash
npm run supabase:start
npm run supabase:reset   # applies supabase/migrations/ (canonical)
```

`npm run supabase:migrate-local` still applies the legacy `database/*.sql` list — use only if you need that older path; it can **drift** from cloud test/prod.

## Storage / side effects (R2, email, analytics)

### R2 (file storage) — isolated for test

| Environment | Buckets |
|-------------|---------|
| **Production** | `job-attachments`, `building-images`, `bid-attachments`, `verification-documents` |
| **Preview / local test** | same names + `-test` suffix via `R2_BUCKET_SUFFIX=-test` |

Buckets `*-test` exist in Cloudflare. Wire them as follows:

1. **Vercel Preview (+ Development):** `R2_BUCKET_SUFFIX=-test` (same R2 API keys as prod are OK if scoped to the account).
2. **Local `.env.local` (pointed at vestiqo-test):** same `R2_BUCKET_SUFFIX=-test`.
3. **Public URLs:** enable *Public Development URL* on `building-images-test` (and `job-attachments-test` if you use that public base), then set Preview / local:
   - `NEXT_PUBLIC_R2_PUBLIC_URL_BUILDING_IMAGES=https://pub-….r2.dev`
   - optionally `NEXT_PUBLIC_R2_PUBLIC_URL_JOB_ATTACHMENTS=…`
4. **Production:** leave `R2_BUCKET_SUFFIX` unset; keep prod public URLs.

Optional overrides (instead of suffix): `R2_BUCKET_JOB_ATTACHMENTS`, `R2_BUCKET_BUILDING_IMAGES`, `R2_BUCKET_BID_ATTACHMENTS`, `R2_BUCKET_VERIFICATION_DOCUMENTS`.

### Email / analytics

Resend, PostHog, and Flagship may still be shared with prod. Avoid bulk mail from Preview; filter analytics by `VERCEL_ENV=preview` if needed.

## Quick recipes

### Feature work on non-prod data (recommended)

1. Confirm `.env.local` → `hcnoqbnschbsxsjrbxao`.
2. `npm run dev`
3. Log in as seeded manager/contractor above (or your own test user).

### Shareable QA on a PR

1. Open/push a PR → Vercel Preview URL.
2. Preview uses **vestiqo-test** (not prod).
3. Add the Preview URL under Supabase **vestiqo-test** → Authentication → URL configuration (Site URL / Redirect URLs) if Auth redirects fail.
4. Use seeded accounts or register a new user on test Auth.

### Fully isolated E2E

```bash
npm run supabase:start
# .env.test.local + E2E_USE_LOCAL_SUPABASE=true
npm run test:e2e:local
```
