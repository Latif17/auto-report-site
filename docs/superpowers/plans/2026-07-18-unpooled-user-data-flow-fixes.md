# Unpooled-User Data Flow Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the gap between what "Pool Data" is supposed to mean and what the code actually does for users who opt out of pooling — stop silently escalating their consent on Join, stop overstating what pooling gates in the privacy policy, and stop letting their PII sit in the database indefinitely or get dropped by a race condition.

**Architecture:** Two new atomic Postgres RPC functions (`cleanup_unpooled_users`, `sweep_stale_unpooled_reports`) replace the existing two-round-trip check-then-delete cleanup in `homelab/run-scraper.js`, closing the race window and adding a retry-cutoff purge. `server.js` and `app.js` are changed so joining an existing incident respects the user's actual `shareData` preference instead of hardcoding `pool_data: true`. `privacy.html` copy is corrected to match actual transmission behavior.

**Tech Stack:** Node.js/Express (`vercel/server.js`), vanilla JS (`vercel/public/app.js`), Node.js worker (`homelab/run-scraper.js`), PostgreSQL/Supabase (`supabase/*.sql`), Jest + Supertest for tests.

## Global Constraints

- No new npm dependencies — everything is achievable with the existing `@supabase/supabase-js` client and plain SQL functions.
- SQL migrations follow the repo's existing naming convention `supabase/schema_update_<name>.sql` and must be appended to the ordered list in `README.md`.
- `run-scraper.test.js` mocks `@supabase/supabase-js` entirely (`jest.mock`) — there is no real Postgres in CI, so SQL functions are verified manually via the Supabase SQL editor, not via the JS test suite.
- The retry cutoff defaults to 48 hours and must be overridable via the `UNPOOLED_RETRY_CUTOFF_HOURS` env var.
- `vercel/public/app.js` has no automated test harness (`vercel/package.json`'s `test` script only runs `tests/server.test.js`) — its task is verified manually in a browser, not with a new Jest/jsdom setup (introducing one is out of scope/YAGNI for a single-flow fix).
- Every existing test in `homelab/tests/run-scraper.test.js` must keep passing unmodified except the three tests that directly exercise the old two-step cleanup mechanism being replaced.

---

## Task 1: Atomic cleanup RPC for successfully-processed unpooled users

**Files:**
- Create: `supabase/schema_update_cleanup_rpc.sql`
- Modify: `homelab/run-scraper.js:182-207`
- Test: `homelab/tests/run-scraper.test.js`

**Interfaces:**
- Produces: Postgres function `cleanup_unpooled_users(p_emails text[], p_exclude_incident_id integer DEFAULT NULL) RETURNS TABLE(deleted_email text)` — deletes `users` rows for the given emails where `pool_data = false` and there is no other active (`status = 'pending'`, incident `status IN ('pending','processing')`) report outside `p_exclude_incident_id`; also nulls their email out of `opted_in_user_reports.user_email` for every row it deletes. Called from JS via `supabase.rpc('cleanup_unpooled_users', { p_emails, p_exclude_incident_id })`.

This replaces the existing two-round-trip check ("any other pending reports for this email?") + delete in `run-scraper.js`, which has two problems: (1) a race window between the check and the delete/insert of a concurrent new report for the same email, and (2) it only deletes from `users`, leaving the email address behind forever in `opted_in_user_reports.user_email` (that's still PII, and it defeats the "fully purge unpooled users" intent).

- [ ] **Step 1: Write the SQL function**

Create `supabase/schema_update_cleanup_rpc.sql`:

```sql
-- schema_update_cleanup_rpc.sql
-- Atomic cleanup for unpooled (pool_data = false) users: deletes their PII from
-- `users` once they have no other active (pending/processing) reports, and scrubs
-- their email out of historical opted_in_user_reports rows. Runs as a single
-- statement so the "any other pending work?" check and the delete/scrub can't
-- race with a concurrent report insert for the same email.
CREATE OR REPLACE FUNCTION cleanup_unpooled_users(p_emails text[], p_exclude_incident_id integer DEFAULT NULL)
RETURNS TABLE(deleted_email text) AS $$
    WITH deleted AS (
        DELETE FROM users
        WHERE email = ANY(p_emails)
          AND pool_data = false
          AND NOT EXISTS (
            SELECT 1
            FROM opted_in_user_reports r
            JOIN incidents i ON i.id = r.incident_id
            WHERE r.user_email = users.email
              AND r.status = 'pending'
              AND i.status IN ('pending', 'processing')
              AND (p_exclude_incident_id IS NULL OR r.incident_id <> p_exclude_incident_id)
          )
        RETURNING email
    ),
    scrubbed AS (
        UPDATE opted_in_user_reports
        SET user_email = NULL
        WHERE user_email IN (SELECT email FROM deleted)
        RETURNING 1
    )
    SELECT email FROM deleted;
$$ LANGUAGE sql;
```

- [ ] **Step 2: Manually verify the function in the Supabase SQL editor (or local psql against a copy of the schema)**

Run:

```sql
insert into incidents (id, smell_timestamp, smell_type, business_location, status) values (99001, now(), 'Test', 'Test Loc', 'pending');
insert into users (email, full_name, postcode, phone, address, pool_data) values ('manual-test@example.com', 'Manual Test', 'AB1 2CD', '', 'Addr', false);
insert into opted_in_user_reports (incident_id, user_email, status) values (99001, 'manual-test@example.com', 'pending');

-- Should return zero rows: the only pending report is for incident 99001 and it's not excluded
select * from cleanup_unpooled_users(array['manual-test@example.com'], NULL);
select email from users where email = 'manual-test@example.com'; -- expect 1 row (still present)

-- Should return one row now that 99001 is excluded (no OTHER active report exists)
select * from cleanup_unpooled_users(array['manual-test@example.com'], 99001);
select email from users where email = 'manual-test@example.com'; -- expect 0 rows
select user_email from opted_in_user_reports where incident_id = 99001; -- expect NULL

delete from opted_in_user_reports where incident_id = 99001;
delete from incidents where id = 99001;
```

Expected: the first call returns no rows and the user still exists; the second call returns `manual-test@example.com` and the user is gone; `user_email` on the historical report row is `NULL`.

- [ ] **Step 3: Update `run-scraper.js` to use the RPC**

Replace `homelab/run-scraper.js:182-207`:

```js
        // Cleanup unpooled users who successfully submitted
        const unpooledProcessed = successfulUsers.filter(u => !u.pool_data).map(u => u.email);
        if (unpooledProcessed.length > 0) {
            const { data: otherPending, error: otherPendingError } = await supabase
                .from('opted_in_user_reports')
                .select('user_email, incidents!inner(status)')
                .in('user_email', unpooledProcessed)
                .eq('incidents.status', 'pending')
                .eq('status', 'pending')
                .neq('incident_id', incident.id);
                
            if (otherPendingError) {
                console.error(`Error querying other pending reports during cleanup:`, otherPendingError);
            } else {
                const emailsWithOtherPending = new Set((otherPending || []).map(r => r.user_email));
                const emailsToDelete = unpooledProcessed.filter(e => !emailsWithOtherPending.has(e));
                
                if (emailsToDelete.length > 0) {
                    console.log(`Deleting ${emailsToDelete.length} unpooled user records...`);
                    const { error: deleteError } = await supabase.from('users').delete().in('email', emailsToDelete);
                    if (deleteError) {
                        console.error("Error deleting unpooled users:", deleteError);
                    }
                }
            }
        }
```

with:

```js
        // Cleanup unpooled users who successfully submitted
        const unpooledProcessed = successfulUsers.filter(u => !u.pool_data).map(u => u.email);
        if (unpooledProcessed.length > 0) {
            const { data: deletedRows, error: cleanupError } = await supabase.rpc('cleanup_unpooled_users', {
                p_emails: unpooledProcessed,
                p_exclude_incident_id: incident.id
            });

            if (cleanupError) {
                console.error("Error cleaning up unpooled users:", cleanupError);
            } else {
                console.log(`Deleted ${(deletedRows || []).length} unpooled user record(s)...`);
            }
        }
```

- [ ] **Step 4: Add `rpc` mock plumbing to the shared test harness**

In `homelab/tests/run-scraper.test.js`, alongside the existing `let mockInResponses = []; let mockEqResponses = []; let mockNeqResponses = [];` (around line 14-16), add:

```js
    let mockRpcResponses = [];
```

In `beforeEach`, alongside the existing `mockInResponses = []; mockEqResponses = []; mockNeqResponses = [];` reset (around line 27-29), add:

```js
        mockRpcResponses = [];
```

In the `mockSupabase` object literal (around line 32-64), add a new `rpc` method alongside `neq`:

```js
            rpc: jest.fn().mockImplementation(() => {
                const nextVal = mockRpcResponses.shift();
                return Promise.resolve(nextVal || { data: [], error: null });
            }),
```

- [ ] **Step 5: Rewrite the test that verifies successful cleanup**

Replace the existing test `'should process both opted_in and pooled users, and cleanup unpooled users'` (`homelab/tests/run-scraper.test.js:198-273`) with:

```js
    it('should process both opted_in and pooled users, and cleanup unpooled users via RPC', async () => {
        let runFunc;
        jest.isolateModules(() => {
            process.env.SUPABASE_URL = 'http://localhost';
            process.env.SUPABASE_KEY = 'test';
            const module = require('../run-scraper');
            runFunc = module.run;
        });

        const pendingIncidents = [
            { id: 10, smell_timestamp: '2026-06-27 12:00:00', smell_type: 'chemical', business_location: 'dump' }
        ];

        const userReports = [{ incident_id: 10, user_email: 'explicit@example.com' }];
        const pooledUsers = [{ email: 'pooled@example.com' }];
        const users = [
            { email: 'explicit@example.com', full_name: 'Explicit User', postcode: 'E1', phone: '111', address: 'Addr 1', pool_data: false },
            { email: 'pooled@example.com', full_name: 'Pooled User', postcode: 'P2', phone: '222', address: 'Addr 2', pool_data: true }
        ];

        // 1. Fetch pending incidents (eq)
        mockEqResponses.push({ data: pendingIncidents, error: null });

        // 2. Fetch opted-in reports (in)
        mockInResponses.push({ data: userReports, error: null });

        // 3. Fetch pooled users record (eq)
        mockEqResponses.push({ data: pooledUsers, error: null });

        // 4. Fetch details of all users (in)
        mockInResponses.push({ data: users, error: null });

        // 5. Update status to processing (eq)
        mockEqResponses.push({ error: null });

        // Mock completed reports (eq)
        mockEqResponses.push({ data: [], error: null });

        // Mock scraper successful submissions
        submitGovForm.mockResolvedValue(true);

        // 6a. Stale sweep RPC call (runs at the very start of processQueue, before any of the above)
        mockRpcResponses.push({ data: [], error: null });
        // 6b. Cleanup RPC call for explicit@example.com
        mockRpcResponses.push({ data: [{ email: 'explicit@example.com' }], error: null });

        // 7. Update status to completed (eq)
        mockEqResponses.push({ error: null });

        const runPromise = runFunc();
        if (jest.runAllTimersAsync) {
            await jest.runAllTimersAsync();
        } else {
            for (let i = 0; i < 10; i++) {
                await Promise.resolve();
                jest.runAllTimers();
            }
        }
        await runPromise;

        // Verify submitGovForm called for BOTH users
        expect(submitGovForm).toHaveBeenCalledTimes(2);
        expect(submitGovForm).toHaveBeenNthCalledWith(1,
            { email: 'explicit@example.com', fullName: 'Explicit User', postcode: 'E1', phone: '111', address: 'Addr 1' },
            { dateOfSmell: '2026-06-27', timeOfSmell: '12:00', smellType: 'chemical', businessLocation: 'dump' }
        );
        expect(submitGovForm).toHaveBeenNthCalledWith(2,
            { email: 'pooled@example.com', fullName: 'Pooled User', postcode: 'P2', phone: '222', address: 'Addr 2' },
            { dateOfSmell: '2026-06-27', timeOfSmell: '12:00', smellType: 'chemical', businessLocation: 'dump' }
        );

        // Verify the atomic cleanup RPC was called for the unpooled user, excluding the current incident
        expect(mockSupabase.rpc).toHaveBeenCalledWith('cleanup_unpooled_users', {
            p_emails: ['explicit@example.com'],
            p_exclude_incident_id: 10
        });
    });
```

Note the `6a`/`6b` split: `sweepStaleUnpooledReports()` (added in Task 2) issues its own `rpc` call at the very start of every `processQueue()` run, before incidents are even fetched, so it always consumes the first queued `mockRpcResponses` entry.

- [ ] **Step 6: Delete the two now-obsolete failure tests and replace with one RPC-failure test**

Delete `'should skip deleting unpooled users if querying other pending reports fails'` (`homelab/tests/run-scraper.test.js:275-344`) and `'should log an error if deleting unpooled users fails'` (lines 412-468) — both tested failure modes of the two-step mechanism that no longer exist. Replace both with a single test:

```js
    it('should log an error if the cleanup RPC fails', async () => {
        let runFunc;
        jest.isolateModules(() => {
            process.env.SUPABASE_URL = 'http://localhost';
            process.env.SUPABASE_KEY = 'test';
            const module = require('../run-scraper');
            runFunc = module.run;
        });

        const pendingIncidents = [
            { id: 10, smell_timestamp: '2026-06-27 12:00:00', smell_type: 'chemical', business_location: 'dump' }
        ];

        const userReports = [{ incident_id: 10, user_email: 'explicit@example.com' }];
        const pooledUsers = [];
        const users = [
            { email: 'explicit@example.com', full_name: 'Explicit User', postcode: 'E1', phone: '111', address: 'Addr 1', pool_data: false }
        ];

        // 1. Fetch pending incidents (eq)
        mockEqResponses.push({ data: pendingIncidents, error: null });
        // 2. Fetch opted-in reports (in)
        mockInResponses.push({ data: userReports, error: null });
        // 3. Fetch pooled users record (eq)
        mockEqResponses.push({ data: pooledUsers, error: null });
        // 4. Fetch details of all users (in)
        mockInResponses.push({ data: users, error: null });
        // 5. Update status to processing (eq)
        mockEqResponses.push({ error: null });
        // Mock completed reports (eq)
        mockEqResponses.push({ data: [], error: null });

        // Mock scraper successful submission
        submitGovForm.mockResolvedValue(true);

        // 6a. Stale sweep RPC call
        mockRpcResponses.push({ data: [], error: null });
        // 6b. Cleanup RPC call fails
        mockRpcResponses.push({ data: null, error: { message: 'cleanup rpc failed' } });

        // 7. Update status to completed (eq)
        mockEqResponses.push({ error: null });

        const runPromise = runFunc();
        if (jest.runAllTimersAsync) {
            await jest.runAllTimersAsync();
        } else {
            for (let i = 0; i < 10; i++) {
                await Promise.resolve();
                jest.runAllTimers();
            }
        }
        await runPromise;

        expect(mockConsoleError).toHaveBeenCalledWith("Error cleaning up unpooled users:", { message: 'cleanup rpc failed' });
    });
```

- [ ] **Step 7: Run the homelab test suite**

Run: `cd homelab && npm test`
Expected: all tests pass — the two rewritten/consolidated tests plus every untouched test (none of the untouched tests exercise a code path that calls `supabase.rpc`, so they're unaffected by the new mock method).

- [ ] **Step 8: Commit**

```bash
git add supabase/schema_update_cleanup_rpc.sql homelab/run-scraper.js homelab/tests/run-scraper.test.js
git commit -m "fix: replace racy two-step unpooled-user cleanup with atomic RPC"
```

---

## Task 2: Retry-cutoff sweep for stuck unpooled reports

**Files:**
- Create: `supabase/schema_update_stale_sweep_rpc.sql`
- Modify: `homelab/run-scraper.js` (top of file + `processQueue`)
- Modify: `homelab/.env.example`
- Test: `homelab/tests/run-scraper.test.js`

**Interfaces:**
- Consumes: none from Task 1 directly (separate RPC), but relies on the same `mockRpcResponses` queue set up in Task 1 Step 4.
- Produces: Postgres function `sweep_stale_unpooled_reports(p_cutoff_hours integer) RETURNS TABLE(purged_email text)`; JS function `sweepStaleUnpooledReports()` (not exported — called internally from `processQueue()`).

Without this, a non-pooling user whose GOV.UK submission keeps failing (e.g. the government form changes and breaks the scraper) has their PII sit in `users` in cleartext forever, since the existing cleanup only fires after a *successful* submission — contradicting their opt-out choice.

- [ ] **Step 1: Write the SQL function**

Create `supabase/schema_update_stale_sweep_rpc.sql`:

```sql
-- schema_update_stale_sweep_rpc.sql
-- Gives up on unpooled (pool_data = false) users whose report has been stuck
-- 'pending' longer than p_cutoff_hours (e.g. the GOV.UK form changed and broke
-- the scraper). Marks those reports 'failed' and purges the now-abandoned PII,
-- all in one atomic statement, mirroring cleanup_unpooled_users' delete+scrub logic.
CREATE INDEX IF NOT EXISTS idx_user_reports_created_at ON opted_in_user_reports(created_at);

CREATE OR REPLACE FUNCTION sweep_stale_unpooled_reports(p_cutoff_hours integer)
RETURNS TABLE(purged_email text) AS $$
    WITH stale AS (
        UPDATE opted_in_user_reports r
        SET status = 'failed'
        FROM users u
        WHERE r.user_email = u.email
          AND u.pool_data = false
          AND r.status = 'pending'
          AND r.created_at < NOW() - (p_cutoff_hours || ' hours')::interval
        RETURNING r.id, r.user_email
    ),
    deleted AS (
        DELETE FROM users
        WHERE email IN (SELECT DISTINCT user_email FROM stale)
          AND pool_data = false
          AND NOT EXISTS (
            SELECT 1
            FROM opted_in_user_reports r2
            JOIN incidents i ON i.id = r2.incident_id
            WHERE r2.user_email = users.email
              AND r2.status = 'pending'
              AND i.status IN ('pending', 'processing')
              AND r2.id NOT IN (SELECT id FROM stale)
          )
        RETURNING email
    ),
    scrubbed AS (
        UPDATE opted_in_user_reports
        SET user_email = NULL
        WHERE user_email IN (SELECT email FROM deleted)
        RETURNING 1
    )
    SELECT email FROM deleted;
$$ LANGUAGE sql;
```

> **Correction (found during implementation):** the first version of this function omitted `r2.id NOT IN (SELECT id FROM stale)`. Sibling CTEs in one `WITH` statement all read the same pre-statement snapshot, so `deleted`'s `NOT EXISTS` subquery could not see `stale`'s own `UPDATE` — it would still find the row it had just marked `'failed'` as `status = 'pending'` on a `'pending'`/`'processing'` incident, blocking its own user's deletion. In the feature's real target scenario (scraper stuck failing, so the incident stays `pending`/`processing`), this bug meant the sweep would routinely purge nobody. The exclusion clause above fixes it by excluding the exact rows `stale` just touched, by id, instead of relying on visibility of the status change.

- [ ] **Step 2: Manually verify the function**

Run in the Supabase SQL editor:

```sql
insert into incidents (id, smell_timestamp, smell_type, business_location, status) values (99002, now(), 'Test', 'Test Loc', 'pending');
insert into users (email, full_name, postcode, phone, address, pool_data) values ('stale-test@example.com', 'Stale Test', 'AB1 2CD', '', 'Addr', false);
insert into opted_in_user_reports (incident_id, user_email, status, created_at) values (99002, 'stale-test@example.com', 'pending', now() - interval '72 hours');

select * from sweep_stale_unpooled_reports(48); -- expect one row: stale-test@example.com
select email from users where email = 'stale-test@example.com'; -- expect 0 rows
select status, user_email from opted_in_user_reports where incident_id = 99002; -- expect status='failed', user_email=NULL

delete from opted_in_user_reports where incident_id = 99002;
delete from incidents where id = 99002;
```

- [ ] **Step 3: Add the sweep call to `run-scraper.js`**

Near the top of `homelab/run-scraper.js`, after the `supabase` client setup (after line 8), add:

```js
const UNPOOLED_RETRY_CUTOFF_HOURS = parseInt(process.env.UNPOOLED_RETRY_CUTOFF_HOURS || '48', 10);

async function sweepStaleUnpooledReports() {
    const { data: purgedUsers, error } = await supabase.rpc('sweep_stale_unpooled_reports', {
        p_cutoff_hours: UNPOOLED_RETRY_CUTOFF_HOURS
    });

    if (error) {
        console.error("Error sweeping stale unpooled reports:", error);
        return;
    }

    if (purgedUsers && purgedUsers.length > 0) {
        console.log(`Purged ${purgedUsers.length} stale unpooled user record(s) past the ${UNPOOLED_RETRY_CUTOFF_HOURS}h retry cutoff.`);
    }
}
```

In `processQueue()`, immediately after the `if (!supabase) { ... }` guard (after line 15) and before `console.log("Checking for pending incidents...")`, add:

```js
    await sweepStaleUnpooledReports();

```

- [ ] **Step 4: Add tests for the sweep**

Add to `homelab/tests/run-scraper.test.js` (after the existing `'should exit if no pending incidents'` test is a natural place, since it reuses the same simple no-incidents path):

```js
    it('should run the stale unpooled report sweep before checking for pending incidents', async () => {
        let runFunc;
        jest.isolateModules(() => {
            process.env.SUPABASE_URL = 'http://localhost';
            process.env.SUPABASE_KEY = 'test';
            const module = require('../run-scraper');
            runFunc = module.run;
        });

        // 1. Sweep RPC call
        mockRpcResponses.push({ data: [], error: null });
        // 2. Fetch pending incidents (eq) -> none
        mockEqResponses.push({ data: [], error: null });

        await runFunc();

        expect(mockSupabase.rpc).toHaveBeenCalledWith('sweep_stale_unpooled_reports', { p_cutoff_hours: 48 });
        expect(mockConsoleLog).toHaveBeenCalledWith("No pending incidents found. Exiting.");
    });

    it('should log the number of purged users when the stale sweep finds stale reports', async () => {
        let runFunc;
        jest.isolateModules(() => {
            process.env.SUPABASE_URL = 'http://localhost';
            process.env.SUPABASE_KEY = 'test';
            const module = require('../run-scraper');
            runFunc = module.run;
        });

        // 1. Sweep RPC call -> purges two users
        mockRpcResponses.push({ data: [{ purged_email: 'stale1@example.com' }, { purged_email: 'stale2@example.com' }], error: null });
        // 2. Fetch pending incidents (eq) -> none
        mockEqResponses.push({ data: [], error: null });

        await runFunc();

        expect(mockConsoleLog).toHaveBeenCalledWith("Purged 2 stale unpooled user record(s) past the 48h retry cutoff.");
    });

    it('should log an error and continue if the stale sweep RPC fails', async () => {
        let runFunc;
        jest.isolateModules(() => {
            process.env.SUPABASE_URL = 'http://localhost';
            process.env.SUPABASE_KEY = 'test';
            const module = require('../run-scraper');
            runFunc = module.run;
        });

        // 1. Sweep RPC call fails
        mockRpcResponses.push({ data: null, error: { message: 'sweep rpc failed' } });
        // 2. Fetch pending incidents (eq) -> none
        mockEqResponses.push({ data: [], error: null });

        await runFunc();

        expect(mockConsoleError).toHaveBeenCalledWith("Error sweeping stale unpooled reports:", { message: 'sweep rpc failed' });
        expect(mockConsoleLog).toHaveBeenCalledWith("No pending incidents found. Exiting.");
    });

    it('should use UNPOOLED_RETRY_CUTOFF_HOURS env var for the sweep cutoff', async () => {
        let runFunc;
        jest.isolateModules(() => {
            process.env.SUPABASE_URL = 'http://localhost';
            process.env.SUPABASE_KEY = 'test';
            process.env.UNPOOLED_RETRY_CUTOFF_HOURS = '12';
            const module = require('../run-scraper');
            runFunc = module.run;
        });

        mockRpcResponses.push({ data: [], error: null });
        mockEqResponses.push({ data: [], error: null });

        await runFunc();

        expect(mockSupabase.rpc).toHaveBeenCalledWith('sweep_stale_unpooled_reports', { p_cutoff_hours: 12 });

        delete process.env.UNPOOLED_RETRY_CUTOFF_HOURS;
    });
```

- [ ] **Step 5: Document the env var**

Append to `homelab/.env.example`:

```
UNPOOLED_RETRY_CUTOFF_HOURS=48
```

- [ ] **Step 6: Run the full homelab test suite**

Run: `cd homelab && npm test`
Expected: all tests pass, including every test from Task 1 and the pre-existing suite.

- [ ] **Step 7: Commit**

```bash
git add supabase/schema_update_stale_sweep_rpc.sql homelab/run-scraper.js homelab/tests/run-scraper.test.js homelab/.env.example
git commit -m "feat: purge unpooled users' PII after a stale retry cutoff"
```

---

## Task 3: Stop forcing pool_data: true on /api/join

**Files:**
- Modify: `vercel/server.js:326-347`
- Test: `vercel/tests/server.test.js:122-133`

**Interfaces:**
- Produces: `/api/join` now reads `shareData` from the request body (boolean) and sets `pool_data: shareData === true` instead of hardcoding `true`.

- [ ] **Step 1: Update `/api/join`**

In `vercel/server.js`, change line 327 from:

```js
    let { email, fullName, postcode, phone, address, incidentId } = req.body;
```

to:

```js
    let { email, fullName, postcode, phone, address, incidentId, shareData } = req.body;
```

And change line 335 from:

```js
            supabase.from('users').upsert({ email, full_name: fullName, postcode, phone, address, pool_data: true }).throwOnError(),
```

to:

```js
            supabase.from('users').upsert({ email, full_name: fullName, postcode, phone, address, pool_data: shareData === true }).throwOnError(),
```

- [ ] **Step 2: Replace the test that asserted the old forced-true behavior**

Replace `'POST /api/join passes pool_data: true'` (`vercel/tests/server.test.js:122-133`) with two tests:

```js
    it('POST /api/join defaults pool_data to false when shareData is not provided', async () => {
        const res = await request(app)
            .post('/api/join')
            .set('X-Forwarded-For', '10.0.0.10')
            .send({
                email: 'join@example.com',
                fullName: 'Join User',
                incidentId: 9999
            });
        expect(res.statusCode).toEqual(200);
        expect(usersUpsertSpy).toHaveBeenCalledWith(expect.objectContaining({ pool_data: false }));
    });

    it('POST /api/join sets pool_data: true when shareData is explicitly true', async () => {
        const res = await request(app)
            .post('/api/join')
            .set('X-Forwarded-For', '10.0.0.11')
            .send({
                email: 'joinshare@example.com',
                fullName: 'Join Share User',
                incidentId: 9999,
                shareData: true
            });
        expect(res.statusCode).toEqual(200);
        expect(usersUpsertSpy).toHaveBeenCalledWith(expect.objectContaining({ pool_data: true }));
    });
```

- [ ] **Step 3: Run the vercel test suite**

Run: `cd vercel && npm test`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add vercel/server.js vercel/tests/server.test.js
git commit -m "fix: /api/join respects the caller's shareData preference instead of forcing pool_data true"
```

---

## Task 4: Stop the Join UI from silently overriding the user's pooling choice

**Files:**
- Modify: `vercel/public/app.js:303-409`

**Interfaces:**
- Consumes: `/api/join` from Task 3, which now honors a `shareData` field in the request body.

Currently, clicking "I smell it too" (`window.joinIncident`) always sends `shareData: true` — both when reading fresh values from the DOM and when falling back to a saved `localStorage` profile — regardless of what the user actually chose. There is no automated test harness for `app.js` (see Global Constraints), so this task is verified manually in a browser.

- [ ] **Step 1: Read the actual shareData checkbox / stored preference instead of hardcoding true**

In `vercel/public/app.js`, in `window.joinIncident`, change:

```js
        const storeLocally = document.getElementById('storeLocally').checked;

        let hasValidData = false;
        let data = null;

        // Check if DOM inputs are complete
        if (fullName && email && postcode && address) {
            hasValidData = true;
            data = {
                fullName,
                email,
                postcode,
                address,
                phone,
                storeLocally,
                shareData: true
            };
        } else {
            // Fallback to localStorage
            const savedDataJson = localStorage.getItem('freshAirWatchData_v2') || localStorage.getItem('freshAirWatchData');
            if (savedDataJson) {
                try {
                    const parsed = JSON.parse(savedDataJson);
                    if (parsed.email && parsed.fullName && parsed.postcode && parsed.address) {
                        hasValidData = true;
                        data = {
                            fullName: parsed.fullName,
                            email: parsed.email,
                            postcode: parsed.postcode,
                            address: parsed.address,
                            phone: parsed.phone || '',
                            storeLocally: parsed.storeLocally !== false,
                            shareData: true
                        };
                    }
                } catch (e) {}
            }
        }
```

to:

```js
        const storeLocally = document.getElementById('storeLocally').checked;
        const shareData = document.getElementById('shareData').checked;

        let hasValidData = false;
        let data = null;

        // Check if DOM inputs are complete
        if (fullName && email && postcode && address) {
            hasValidData = true;
            data = {
                fullName,
                email,
                postcode,
                address,
                phone,
                storeLocally,
                shareData
            };
        } else {
            // Fallback to localStorage
            const savedDataJson = localStorage.getItem('freshAirWatchData_v2') || localStorage.getItem('freshAirWatchData');
            if (savedDataJson) {
                try {
                    const parsed = JSON.parse(savedDataJson);
                    if (parsed.email && parsed.fullName && parsed.postcode && parsed.address) {
                        hasValidData = true;
                        data = {
                            fullName: parsed.fullName,
                            email: parsed.email,
                            postcode: parsed.postcode,
                            address: parsed.address,
                            phone: parsed.phone || '',
                            storeLocally: parsed.storeLocally !== false,
                            shareData: parsed.shareData === true
                        };
                    }
                } catch (e) {}
            }
        }
```

- [ ] **Step 2: Stop forcing shareData: true when persisting back to localStorage after a join**

Change:

```js
                if (data.storeLocally) {
                    const { shareData, ...dataToStore } = data;
                    localStorage.setItem('freshAirWatchData_v2', JSON.stringify({ ...dataToStore, storeLocally: true, shareData: true }));
                    localStorage.removeItem('freshAirWatchData');
                } else {
```

to:

```js
                if (data.storeLocally) {
                    const { shareData, ...dataToStore } = data;
                    localStorage.setItem('freshAirWatchData_v2', JSON.stringify({ ...dataToStore, storeLocally: true, shareData: data.shareData }));
                    localStorage.removeItem('freshAirWatchData');
                } else {
```

- [ ] **Step 3: Manually verify in a browser**

Run: `cd vercel && npm start`, open `http://localhost:3000`.

1. Fill in the reporter details, leave **Pool Data** unchecked, check **Remember my details**, submit a new smell report.
2. Confirm `localStorage.freshAirWatchData_v2` has `"shareData":false`.
3. Trigger a second "active incident" banner (e.g. submit a report from a different browser/incognito session, or manually insert a second `pending` incident via the Supabase dashboard) and click **"I smell it too"** on the original session.
4. Open DevTools → Network, inspect the `/api/join` request body: confirm `shareData` is `false`.
5. Confirm `localStorage.freshAirWatchData_v2.shareData` is still `false` after the join completes (not forced to `true`).
6. Repeat with **Pool Data** checked from the start and confirm `shareData: true` is sent and persisted, so opted-in users still get the one-click pooled join behavior.

- [ ] **Step 4: Commit**

```bash
git add vercel/public/app.js
git commit -m "fix: Join flow no longer silently overrides the user's pool data preference"
```

> **Scope addition (found during implementation):** `window.joinIncident` wasn't the only place `shareData` got forced to `true`. The regular form-submit handler — taken when a joining user has no saved/DOM profile, fills the form manually, and clicks "Join this report" — also unconditionally overwrote it: `formData.shareData = true;` inside `if (joinIncidentId) { ... }` in the `form.addEventListener('submit', ...)` handler, even though `formData` was already built moments earlier from the actual checkbox (`shareData: document.getElementById('shareData').checked`). Same bug class, third location. Fixed by deleting that override line so `formData.shareData` keeps the checkbox-derived value. Committed separately as "fix: stop forcing shareData true on manual join-by-form-submit path".

- [ ] **Step 5: Commit the scope addition**

```bash
git add vercel/public/app.js
git commit -m "fix: stop forcing shareData true on manual join-by-form-submit path"
```

---

## Task 5: Correct the privacy policy's transmission wording

**Files:**
- Modify: `vercel/public/privacy.html:25-26`

**Interfaces:** none (copy-only change).

The current wording — "By opting into data pooling, your personal data will be programmatically transmitted to GOV.UK and local authorities" — reads as if non-pooling avoids GOV.UK transmission entirely. In fact `/api/submit` and `/api/join` (`vercel/server.js:305-315`, `326-347`) always transmit the submitter's own PII to GOV.UK for their own reported/joined incident, regardless of the pooling choice; pooling only additionally auto-enrolls them into *other* residents' future incidents (`homelab/run-scraper.js`'s `pooledEmails` union, applied to every pending incident).

- [ ] **Step 1: Update the copy**

In `vercel/public/privacy.html`, change:

```html
                <h3>4. Third-Party Transmission</h3>
                <p>By opting into data pooling, your personal data will be programmatically transmitted to GOV.UK and local authorities.</p>
```

to:

```html
                <h3>4. Third-Party Transmission</h3>
                <p>Whenever you submit or join a smell report, your personal data is programmatically transmitted to GOV.UK to file that specific report on your behalf. If you additionally opt into data pooling, you grant standing consent for us to also transmit your personal data to GOV.UK automatically whenever other Barking Riverside residents log a new smell event, without you needing to submit or join each time.</p>
```

- [ ] **Step 2: Manually verify**

Run: `cd vercel && npm start`, open `http://localhost:3000/privacy.html`, confirm the updated paragraph renders correctly under the existing "4. Third-Party Transmission" heading with no broken HTML.

- [ ] **Step 3: Commit**

```bash
git add vercel/public/privacy.html
git commit -m "docs: correct privacy policy wording on when data is transmitted to GOV.UK"
```

---

## Task 6: Update migration docs

**Files:**
- Modify: `README.md:71-74`

**Interfaces:** none (docs-only change).

- [ ] **Step 1: Add the two new SQL files to the documented run order**

In `README.md`, change:

```markdown
- Open the SQL Editor and run the schemas in the following order:
  1. `supabase/schema.sql`
  2. `supabase/schema_update.sql`
  3. `supabase/schema_update_pool_data.sql`
```

to:

```markdown
- Open the SQL Editor and run the schemas in the following order:
  1. `supabase/schema.sql`
  2. `supabase/schema_update.sql`
  3. `supabase/schema_update_pool_data.sql`
  4. `supabase/schema_update_cleanup_rpc.sql`
  5. `supabase/schema_update_stale_sweep_rpc.sql`
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: document new cleanup/stale-sweep RPC migrations in the setup order"
```
