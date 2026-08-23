# Environments (local / test / production)

Use this when developing or QA’ing features **without touching production data**.

## Targets

| Target | Supabase project | Ref | App URL | When to use |
|--------|------------------|-----|---------|-------------|
| **Local Docker** | `domio` (CLI) | `localhost:54321` | `http://localhost:3000` | Isolated E2E, schema experiments, offline |
| **Cloud test** | `vestiqo-test` | `hcnoqbnschbsxsjrbxao` | localhost or **Vercel Preview** | Day-to-day feature work, shareable PR previews |
| **Production** | `vestiqo` | `fabbgaqxsetnsppxegnx` | `https://www.vestiqo.pl` (also `https://vestiqo.vercel.app`) | Live users only |

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

Production app URLs: `https://www.vestiqo.pl`, `https://vestiqo.vercel.app` (legacy `domio-ruby.vercel.app` removed).

`NEXT_PUBLIC_APP_URL` on Vercel Production is `https://www.vestiqo.pl`. Preview builds use `VERCEL_URL` via `getPublicAppOrigin()`.

### Preview password gate

Feature-branch Preview URLs are gated by `PREVIEW_PASSWORD` (middleware). Production and local `npm run dev` are not gated.

1. In Vercel → Project → Settings → Environment Variables, add `PREVIEW_PASSWORD` for **Preview** only (not Production).
2. Redeploy the preview (or push a new commit) so the build picks it up.
3. Open the Preview URL, enter the password once. A signed httpOnly cookie remembers access in that browser for **1 year**. Changing the password invalidates existing cookies.

If `PREVIEW_PASSWORD` is unset, Preview stays publicly reachable.

### Supabase Auth redirect URLs (dashboard)

For **vestiqo** (prod) set Site URL to `https://www.vestiqo.pl` and include in Redirect URLs:

- `https://www.vestiqo.pl/**`
- `https://vestiqo.vercel.app/**`
- `https://vestiqo-bonzo7aabs-projects.vercel.app/**`

For **vestiqo-test** include Preview wildcards if available, e.g. `https://*-bonzo7aabs-projects.vercel.app/**` and `http://localhost:3000/**`.

### Sentry

Org slug in env is still `domio-z0` (project display name set to `vestiqo`). To rename the org in Sentry: Settings → General → Organization slug. Then update Vercel `SENTRY_ORG`. Allowed domains are currently `*` (no block on `vestiqo.vercel.app`).

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

### Email / analytics / feature flags

Resend and PostHog may still be shared with prod. Avoid bulk mail from Preview; filter analytics by `VERCEL_ENV=preview` if needed.

**Flagship** uses a separate app per environment (same flag keys, different `FLAGSHIP_APP_ID`):

| Environment | Flagship app |
|-------------|----------------|
| **Production** | existing prod app (e.g. `vestiqo`) |
| **Preview / Development / local** | `vestiqo-preview` (create in Cloudflare if missing) |

Set `FLAGSHIP_APP_ID` per Vercel environment. Use a **User API Token** from **My Profile → API Tokens** (value starts with `cfut_`), not an **Account API Token** from Manage Account → Account API Tokens (`cfat_`). Account tokens can evaluate flags but Cloudflare returns 403 on `GET/PUT /flags`, so `/administracja/flagi` cannot list or toggle. The user token needs **Flagship Read** and **Flagship Edit** (dashboard has no “Write” row; IAM calls the write group Flagship Write). After creating a token, paste it into `CLOUDFLARE_FLAGSHIP_API_TOKEN` and restart/redeploy — the dashboard does not push it to the app.

Boolean flags (`orders`, `contractor-services`, `calendar`, and the others in `src/lib/flagship/keys.ts`): variants `on=true` / `off=false`. When enabled with no targeting rules, `default_variation` must be `on`. Changes can take up to ~30 seconds to propagate.

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
