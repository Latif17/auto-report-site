# Submission Log Incidents & PII Protection Design

## Goal
Update the public submission log endpoint (`GET /api/history`) to query and return rows from the `incidents` table directly instead of `opted_in_user_reports`, while ensuring submitter PII (`reported_by` column) is completely excluded from query results and API response payloads.

---

## Background & Architecture
Previously, `GET /api/history` queried `opted_in_user_reports` with a foreign-key join on `incidents`. Because `opted_in_user_reports` logs every individual user's participation in an incident, querying this table returned redundant rows (one per user report) rather than a list of distinct smell incidents.

Additionally, the `incidents` table contains a `reported_by` column storing the email address of the initial submitter. Public endpoints must never expose `reported_by` or any user PII.

---

## Detailed Changes

### 1. `vercel/server.js` (`GET /api/history`)
Update the endpoint handler:
- **Supabase Query:**
  ```javascript
  const { data, error } = await supabase
      .from('incidents')
      .select('id, smell_timestamp, smell_type, business_location, status, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
      .throwOnError();
  ```
- **PII Protection:** `reported_by` is explicitly omitted from the `.select(...)` column string and resulting response objects.
- **Mapping:**
  ```javascript
  const reports = (data || []).map(row => {
      const status = row.status || 'unknown';
      const smellType = row.smell_type || 'Unknown';
      const isNotSubmitted = status === 'internal_only' || smellType === 'Unknown';
      return {
          id: row.id,
          submittedAt: row.created_at || row.smell_timestamp,
          smellType: smellType,
          businessLocation: row.business_location || '—',
          govUkStatus: isNotSubmitted ? 'not_submitted' : 'submitted'
      };
  });
  ```

### 2. Mock Client in `vercel/server.js`
Update the mock Supabase fallback in `server.js` (used when `SUPABASE_URL`/`SUPABASE_KEY` env vars are absent) so that queries matching the new `incidents` select string return mock data formatted as expected by `/api/history`.

### 3. Test & Allowlist Suite
- **`vercel/tests/history.test.js`**: Verify `/api/history` returns an array of reports sourced from `incidents`, with valid `govUkStatus` values, and strictly no PII fields (`reported_by`, `user_email`, `email`, `additional_notes`).
- **`vercel/tests/pii-allowlist.test.js`**: Confirm `reports.reported_by` is not in the allowlist for `/api/history` and add a targeted test checking that `reported_by` is never returned.

---

## Verification Plan
1. **Unit & Integration Tests:** Run `npm test` inside `vercel/` to ensure all history and PII allowlist tests pass cleanly.
2. **PII Audit:** Verify with `pii-allowlist.test.js` that no unexpected fields leak from `/api/history`.
