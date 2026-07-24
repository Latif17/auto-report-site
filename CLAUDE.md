# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Automates reporting a recurring industrial smell (Barking Riverside, London) to the UK government's
[environmental problem service](https://report-an-environmental-problem.service.gov.uk/smell/source). Residents
submit a report once on the web app; a background worker then fills out and submits the government's 19-page
form on their behalf via browser automation.

## Repository structure (three independently deployed projects, no root package.json)

- **`vercel/`** — Express API + static frontend, deployed to Vercel as a serverless function.
  - `server.js` is the entire API; `api/index.js` just re-exports it (`module.exports = require('../server.js')`)
    so Vercel can route to it — `vercel.json` rewrites `/api/*` there and everything else to `public/`.
  - No Puppeteer dependency here on purpose, to keep serverless cold starts fast.
- **`homelab/`** — Dockerized daemon that does the actual browser automation (Puppeteer), meant to run on a
  home server / Proxmox LXC, not on Vercel. `run-scraper.js` is the polling loop, `scraper.js` is the
  page-by-page form filler, `utils.js` has shared helpers (e.g. `randomDelay`).
- **`supabase/`** — Postgres schema as a sequence of hand-applied SQL files (no migration framework). Apply in
  order: `schema.sql` → `schema_update.sql` → `schema_update_pool_data.sql` → `schema_update_cleanup_rpc.sql` →
  `schema_update_stale_sweep_rpc.sql` → `schema_update_reported_by.sql` → `schema_update_additional_notes.sql`.
    When adding a new column/RPC, add a new `schema_update_*.sql` file rather than editing an already-applied one.
- **`docs/superpowers/plans/` and `docs/superpowers/specs/`** — dated design docs and implementation plans for
  past features (naming, dedup, PII/GDPR, dashboard, etc.). These are local-only (gitignored, not pushed to the
  remote) — check here for the reasoning behind existing behavior before changing it if the files are present
  on disk, but don't assume a fresh clone will have them.

Each of `vercel/` and `homelab/` has its own `package.json`, `node_modules`, and `.env`/`.env.example` — always
`cd` into the relevant one before running npm commands.

## Commands

Web app / API (`vercel/`):
```bash
cd vercel
npm install
npm start                 # runs server.js on :3000 (or $PORT)
npm test                  # runs tests/server.test.js and tests/pii-allowlist.test.js --runInBand
npx jest tests/history.test.js       # run a single test file
npx jest -t "returns reports array"  # run tests matching a name
```
Note `npm test` in `vercel/` does **not** pick up every file in `tests/` automatically (e.g.
`tests/frontend.test.js` is not in the default script) — run those explicitly with `npx jest <path>` if needed.

Scraper worker (`homelab/`):
```bash
cd homelab
npm install
npm start                 # runs run-scraper.js once (or loops if DAEMON_MODE=true)
npm test                  # runs jest tests/ --runInBand
SHOW_BROWSER=true npm start   # launch Puppeteer non-headless for debugging the form flow
```

## Architecture

### Data flow: submission → dedup → scraping → cleanup

1. A user submits the web form → `POST /api/submit` (or `/api/join` to add themselves to an existing report).
2. The server dedupes against the `incidents` table: it looks for an existing incident with the same
   `smell_type` within a **±2 hour window** of the reported time (`server.js`'s `shiftHours`/lowerBound/upperBound
   logic). If found, the user is linked to that incident instead of creating a new one; if the existing incident
   has a *different* smell type, the submission is rejected (one incident per smell per time window).
3. `smellType === 'Unknown'` ("can't tell") creates an incident with `status: 'internal_only'` — it's tracked for
   stats but never sent to GOV.UK. Otherwise incidents start `status: 'pending'`.
4. The `homelab` daemon (`run-scraper.js`) polls Supabase for `status = 'pending'` incidents. For each, it
   batches together everyone who should get a submission: users explicitly linked via `opted_in_user_reports`
   for that incident, plus every user with `pool_data = true` (pooled users are auto-enrolled in *all*
   incidents, not just ones they personally reported).
5. For each user it calls `scraper.js#submitGovForm`, which drives Puppeteer through the GOV.UK wizard form
   page-by-page (`clickLabel`/`goNext` helpers), mapping `smell_type` to the form's categories and the incident
   timestamp to the form's relative-date questions (`getGovUkDateCategory`: "Earlier today" / "Yesterday" /
   "Before yesterday", the last of which has an extra date-entry page).
6. On success the `opted_in_user_reports` row is marked `completed`; the incident is marked `completed` only if
   *every* user for it succeeded, otherwise it stays `pending` and gets retried next poll. A user can rejoin an
   incident mid-processing, which flips it back to `pending` even if it was about to complete (see the
   `.eq('status', 'processing')` guard in `run-scraper.js` before marking `completed`).
7. `TEST_MODE=true` (or any `@example.com` email) makes `scraper.js` fill out the entire form but stop before
   the final submit, dumping the rendered page to `homelab/final-page.html` for inspection instead.

### PII / GDPR handling

- PII (name, postcode, phone, address) lives only in `users`, keyed by email. `incidents` and
  `opted_in_user_reports` link to it by email but the public-facing API must never leak it.
- Users who don't opt in to data pooling (`pool_data = false`, i.e. "unpooled") have their PII purged once it's
  no longer needed: `cleanup_unpooled_users` (Postgres RPC, `schema_update_cleanup_rpc.sql`) deletes their
  `users` row and scrubs their email from `opted_in_user_reports` after a successful submission, as long as they
  have no other pending/processing reports. `sweep_stale_unpooled_reports` (`schema_update_stale_sweep_rpc.sql`)
  does the same for reports stuck `pending` past `UNPOOLED_RETRY_CUTOFF_HOURS` (default 48h) — e.g. if GOV.UK
  changed their form and broke the scraper. Both are single atomic SQL statements specifically so the "any
  other active work?" check can't race with a concurrent report insert for the same email.
- **`vercel/tests/pii-allowlist.test.js` enforces a deny-by-default allowlist for every public API response** —
  it walks the full JSON body of each endpoint and fails if any key isn't explicitly allowlisted, with a second
  check that named PII fields (`reported_by`, `user_email`, `email`, `full_name`, `phone`, `postcode`, `address`,
  `additional_notes`, `pool_data`) never appear anywhere. **When adding or changing a field on any `/api/*`
  response, update the allowlist in this file first** — the test is the intended guardrail against accidental
  PII leaks, not an obstacle to work around.

### Local dev without a database

`vercel/server.js` falls back to an in-memory mock Supabase client (see the ternary near the top of the file)
whenever `SUPABASE_URL`/`SUPABASE_KEY` aren't set, so `npm test` and local dev work without real credentials.
The mock's canned responses are keyed off which table/columns are queried — if you add a new query shape that
the tests rely on, you likely need to extend this mock, not just the schema.

### Changelog requirement

Before completing any feature or bug fix, update `vercel/public/changelog.json`: increment the version (PATCH
for bug fixes, MINOR for features) and add clear, non-technical bullet points. If multiple related changes are
being developed together and haven't been pushed to `origin/main` yet, consolidate them into a single version
entry (use the highest version bump among them) rather than one entry per commit — only cut a new entry once
ready to push.
