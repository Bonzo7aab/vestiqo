<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into the Domio Next.js App Router application — a Polish property management marketplace connecting property managers (zarządcy) with contractors (wykonawcy).

**What was set up:**
- Client-side PostHog initialization via `instrumentation-client.ts` using the `capture_exceptions: true` flag for automatic error tracking
- Reverse proxy rewrites in `next.config.js` routing analytics through `/ingest/*` (EU endpoints)
- Server-side PostHog client in `src/lib/posthog-server.ts` using `posthog-node`
- Environment variables `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` in `.env.local`
- User identification in `AuthContext.tsx` via `posthog.identify()` triggered whenever a user session loads
- Login, signup, and logout event captures with `posthog.reset()` on logout
- Server-side captures for all critical business actions across 6 server action files and 1 API route

| Event Name | Description | File |
|---|---|---|
| `user_signed_up` | A new user completes registration as a manager or contractor. | `src/components/RegisterPage.tsx` |
| `user_logged_in` | A user successfully logs in with email and password. | `src/components/LoginPage.tsx` |
| `user_logged_out` | A user signs out of their account. | `src/components/LogoutButton.tsx` |
| `contact_form_submitted` | A visitor submits the contact form successfully. | `src/app/kontakt/actions.ts` |
| `contest_offer_accepted` | A manager accepts a contractor's bid on a contest. | `src/app/panel-zarzadcy/konkursy/actions.ts` |
| `contest_cancelled` | A manager cancels an active contest. | `src/app/panel-zarzadcy/konkursy/actions.ts` |
| `contest_draft_abandoned` | A manager discards a contest in draft state. | `src/app/panel-zarzadcy/konkursy/actions.ts` |
| `job_offer_accepted` | A manager accepts a contractor's application for a job listing. | `src/app/panel-zarzadcy/zgloszenia/actions.ts` |
| `order_work_accepted` | A manager accepts completed work from a contractor on an order. | `src/app/panel-zarzadcy/zamowienia/actions.ts` |
| `order_cancelled` | A manager cancels an active order. | `src/app/panel-zarzadcy/zamowienia/actions.ts` |
| `order_reported_for_acceptance` | A contractor reports an order as complete and ready for manager acceptance. | `src/app/panel-wykonawcy/zamowienia/actions.ts` |
| `verification_document_uploaded` | A contractor uploads a verification document during the onboarding process. | `src/app/api/weryfikacja/upload/route.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) Dashboard](https://eu.posthog.com/project/211135/dashboard/778226)
- [New User Signups](https://eu.posthog.com/project/211135/insights/bb4Mvcar)
- [Daily Active Logins](https://eu.posthog.com/project/211135/insights/DLMEKKVP)
- [Signups by User Type](https://eu.posthog.com/project/211135/insights/rhre3pPW)
- [Contest Acceptance vs Cancellation](https://eu.posthog.com/project/211135/insights/ioEDimsd)
- [Order Lifecycle](https://eu.posthog.com/project/211135/insights/Va1bbWBG)

## Verify before merging

- [ ] Run a full production build (the wizard only verified the files it touched) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` to `.env.example` and any environment bootstrap scripts so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify.
- [ ] Confirm the returning-visitor path also calls `identify` — a handler that only identifies on fresh login can leave returning sessions on anonymous distinct IDs.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
