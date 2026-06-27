<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into the Domio Next.js App Router application — a Polish property management marketplace connecting property managers (zarządcy) with contractors (wykonawcy).

**What was set up (initial run):**
- Client-side PostHog initialization via `instrumentation-client.ts` using the `capture_exceptions: true` flag for automatic error tracking
- Reverse proxy rewrites in `next.config.js` routing analytics through `/ingest/*` (EU endpoints)
- Server-side PostHog client in `src/lib/posthog-server.ts` using `posthog-node`
- Environment variables `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` in `.env.local`
- User identification in `AuthContext.tsx` via `posthog.identify()` triggered whenever a user session loads
- Login, signup, and logout event captures with `posthog.reset()` on logout

**What was added in this run:**
- `contest_created` — fires when a manager publishes a new contest for the first time (`TenderCreationPage.tsx`)
- `contest_offer_submitted` — fires when a contractor submits a completed bid (`ContestOfferSubmissionDialog.tsx`)
- `contest_bid_draft_saved` — fires when a contractor saves their bid as a draft (`ContestOfferSubmissionDialog.tsx`)
- `contest_bid_draft_abandoned` — fires when a contractor discards their saved bid draft (`ContestOfferSubmissionDialog.tsx`)
- `contest_offer_accepted` capture added to the alternate acceptance path in `panel-zarzadcy/zgloszenia/actions.ts`

| Event Name | Description | File |
|---|---|---|
| `user_signed_up` | A new user completes registration as a manager or contractor. | `src/components/RegisterPage.tsx` |
| `user_logged_in` | A user successfully logs in with email and password. | `src/components/LoginPage.tsx` |
| `user_logged_out` | A user signs out of their account. | `src/components/LogoutButton.tsx` |
| `contact_form_submitted` | A visitor submits the contact form successfully. | `src/app/kontakt/actions.ts` |
| `contest_offer_accepted` | A manager accepts a contractor's bid on a contest. | `src/app/panel-zarzadcy/konkursy/actions.ts` + `src/app/panel-zarzadcy/zgloszenia/actions.ts` |
| `contest_cancelled` | A manager cancels an active contest. | `src/app/panel-zarzadcy/konkursy/actions.ts` |
| `contest_draft_abandoned` | A manager discards a contest in draft state. | `src/app/panel-zarzadcy/konkursy/actions.ts` |
| `job_offer_accepted` | A manager accepts a contractor's application for a job listing. | `src/app/panel-zarzadcy/zgloszenia/actions.ts` |
| `order_work_accepted` | A manager accepts completed work from a contractor on an order. | `src/app/panel-zarzadcy/zamowienia/actions.ts` |
| `order_cancelled` | A manager cancels an active order. | `src/app/panel-zarzadcy/zamowienia/actions.ts` |
| `order_reported_for_acceptance` | A contractor reports an order as complete and ready for manager acceptance. | `src/app/panel-wykonawcy/zamowienia/actions.ts` |
| `verification_document_uploaded` | A contractor uploads a verification document during the onboarding process. | `src/app/api/weryfikacja/upload/route.ts` |
| `contest_created` | A manager publishes a new contest for the first time. | `src/components/TenderCreationPage.tsx` |
| `contest_offer_submitted` | A contractor submits a completed bid in the contest offer wizard. | `src/components/contest-offer/ContestOfferSubmissionDialog.tsx` |
| `contest_bid_draft_saved` | A contractor saves their in-progress bid as a draft. | `src/components/contest-offer/ContestOfferSubmissionDialog.tsx` |
| `contest_bid_draft_abandoned` | A contractor discards their saved bid draft for a contest. | `src/components/contest-offer/ContestOfferSubmissionDialog.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) Dashboard](https://eu.posthog.com/project/211135/dashboard/778269)
- [New User Signups by Type](https://eu.posthog.com/project/211135/insights/j8dGR9G4)
- [Contest Pipeline: Created → Offer Submitted → Accepted](https://eu.posthog.com/project/211135/insights/QwMg2iLa)
- [Contest Churn: Cancelled vs Draft Abandoned](https://eu.posthog.com/project/211135/insights/jfEH5psk)
- [Order Lifecycle: Reported → Accepted vs Cancelled](https://eu.posthog.com/project/211135/insights/rq1yW4X7)
- [Daily Active Users (Logins)](https://eu.posthog.com/project/211135/insights/3ddg4SlV)

## Verify before merging

- [ ] Run a full production build (the wizard only verified the files it touched) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify.
- [ ] Confirm the returning-visitor path also calls `identify` — a handler that only identifies on fresh login can leave returning sessions on anonymous distinct IDs.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
