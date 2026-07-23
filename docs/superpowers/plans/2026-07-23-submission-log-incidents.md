# Submission Log Incidents & PII Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update `GET /api/history` to query `incidents` directly instead of `opted_in_user_reports` and verify submitter PII (`reported_by`) is strictly excluded.

**Architecture:** Update the `/api/history` endpoint in `vercel/server.js` to query `incidents` selecting only non-PII columns (`id, smell_timestamp, smell_type, business_location, status, created_at`), update the fallback mock client, and expand automated history and PII allowlist tests.

**Tech Stack:** Node.js, Express, Supabase JS Client, Jest, Supertest.

## Global Constraints

- **No PII Leaks:** `reported_by`, `user_email`, `email`, `full_name`, `phone`, `address`, and `additional_notes` MUST NEVER be included in responses from `/api/history`.
- **Response Format:** `{ reports: [ { id, submittedAt, smellType, businessLocation, govUkStatus } ] }`.

---

### Task 1: Update `/api/history` Query and Supabase Mock Client

**Files:**
- Modify: `vercel/server.js:71-105`
- Modify: `vercel/server.js:229-259`
- Test: `vercel/tests/history.test.js`

**Interfaces:**
- Consumes: Supabase `incidents` table
- Produces: `GET /api/history` returning `{ reports: [...] }` sourced from `incidents`

- [ ] **Step 1: Write failing test in `history.test.js` for `reported_by` exclusion**

```javascript
// Add to vercel/tests/history.test.js inside describe('GET /api/history')
    it('never includes reported_by column in report objects', async () => {
        const res = await request(app).get('/api/history');
        expect(res.status).toBe(200);
        res.body.reports.forEach(r => {
            expect(r).not.toHaveProperty('reported_by');
        });
    });
```

- [ ] **Step 2: Run history test to verify existing suite**

Run: `npx jest vercel/tests/history.test.js`
Expected: Passes or fails based on mock state.

- [ ] **Step 3: Update `server.js` mock Supabase handler and `/api/history` endpoint**

In `vercel/server.js`:

Update lines 71-86 in mock Supabase handler:
```javascript
                            if (table === 'incidents') {
                                const mockTime = new Date();
                                const defaultDate = dateFormatter.format(mockTime);
                                const defaultTime = timeFormatter.format(mockTime);
                                if (mockState.selectCols === 'id, smell_timestamp, smell_type, business_location, status, created_at') {
                                    return resolve({
                                        count: 2,
                                        data: [
                                            { id: 201, created_at: '2026-07-20T10:00:00.000Z', smell_timestamp: '2026-07-20 10:00:00', smell_type: 'Sewage', business_location: 'Multiple (ReFood, Veolia, BioGas)', status: 'pending' },
                                            { id: 202, created_at: '2026-07-19T09:00:00.000Z', smell_timestamp: '2026-07-19 09:00:00', smell_type: 'Unknown', business_location: 'Unknown', status: 'internal_only' }
                                        ]
                                    });
                                }
                                return resolve({
                                    count: 1,
                                    data: [{
                                        id: 9999,
                                        smell_timestamp: `${defaultDate} ${defaultTime}:00`,
                                        smell_type: 'Sewage',
                                        business_location: 'Multiple (ReFood, Veolia, BioGas)',
                                        status: 'pending',
                                        created_at: mockTime.toISOString()
                                    }]
                                });
                            }
```

Update `/api/history` handler (lines 229-259):
```javascript
app.get('/api/history', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('incidents')
            .select('id, smell_timestamp, smell_type, business_location, status, created_at')
            .order('created_at', { ascending: false })
            .limit(50)
            .throwOnError();

        if (error) throw error;

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

        res.json({ reports });
    } catch (err) {
        console.error('History error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
```

- [ ] **Step 4: Run tests to verify history endpoint passes**

Run: `npx jest vercel/tests/history.test.js`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add vercel/server.js vercel/tests/history.test.js
git commit -m "feat: query incidents directly in /api/history without PII"
```

---

### Task 2: PII Allowlist Audit & Full Test Suite Verification

**Files:**
- Modify: `vercel/tests/pii-allowlist.test.js:370-385`
- Test: `vercel/tests/server.test.js`, `vercel/tests/pii-allowlist.test.js`

**Interfaces:**
- Consumes: `/api/history` output
- Produces: Verified PII allowlist and green test suite

- [ ] **Step 1: Update `vercel/tests/pii-allowlist.test.js` with regression test**

Add regression check in `vercel/tests/pii-allowlist.test.js` under `describe('PII Allowlist — GET /api/history')`:
```javascript
    it('does not expose reported_by even if present on incidents table', () => {
        const keys = collectAllKeys(body);
        expect(keys.has('reports.reported_by')).toBe(false);
    });
```

- [ ] **Step 2: Run full Jest test suite**

Run: `npm test --prefix vercel`
Expected: PASS (all tests in `server.test.js`, `history.test.js`, `pii-allowlist.test.js`, `frontend.test.js` pass).

- [ ] **Step 3: Commit changes**

```bash
git add vercel/tests/pii-allowlist.test.js
git commit -m "test: add PII regression check for reported_by in /api/history"
```
