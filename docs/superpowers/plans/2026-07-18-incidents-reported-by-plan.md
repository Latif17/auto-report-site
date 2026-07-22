# Incidents reported_by Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `reported_by` column to the `incidents` table to track which user initially reported the incident, falling back to `NULL` if the user is deleted.

**Architecture:** Database schema migration to add `reported_by TEXT REFERENCES users(email) ON DELETE SET NULL`, and backend update in `server.js` to insert the email when creating a new incident.

**Tech Stack:** Supabase, Express.js

## Global Constraints

- No project-wide constraints specified.

---

### Task 1: Database Schema

**Files:**
- Create: `supabase/schema_update_reported_by.sql`
- Modify: `supabase/schema.sql:11-19`

**Interfaces:**
- Consumes: `users` table
- Produces: `incidents.reported_by` column

- [ ] **Step 1: Write the migration script**

Create `supabase/schema_update_reported_by.sql` with:

```sql
ALTER TABLE incidents ADD COLUMN reported_by TEXT REFERENCES users(email) ON DELETE SET NULL;
```

- [ ] **Step 2: Update the main schema definition**

Modify `supabase/schema.sql` to include the new column in the `CREATE TABLE IF NOT EXISTS incidents` statement:

```sql
CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    smell_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    smell_type TEXT NOT NULL,
    business_location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    reported_by TEXT REFERENCES users(email) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

- [ ] **Step 3: Commit**

```bash
git add supabase/schema_update_reported_by.sql supabase/schema.sql
git commit -m "feat: add reported_by to incidents schema"
```

### Task 2: Backend Submission Update

**Files:**
- Modify: `vercel/server.js:351-355`
- Modify: `vercel/tests/server.test.js:4-40`, `vercel/tests/server.test.js:74-121`

**Interfaces:**
- Consumes: `incidents.reported_by` schema change
- Produces: `incidents` insertion with `reported_by` populated.

- [ ] **Step 1: Update the backend test to check for reported_by insertion**

In `vercel/tests/server.test.js`, add `let incidentsInsertSpy;` near the top, and update the `beforeEach` to spy on `insert` for `incidents`:

```javascript
// At the top of describe
    let usersUpsertSpy;
    let deleteEqSpy;
    let incidentsInsertSpy;

// Inside beforeEach
        incidentsInsertSpy = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockReturnThis(),
            throwOnError: jest.fn().mockReturnValue({ data: { id: 1 }, error: null }),
            then: jest.fn((cb) => cb({ data: { id: 1 }, error: null }))
        });

// Inside the from mock implementation
        jest.spyOn(app.supabase, 'from').mockImplementation((table) => {
            const chain = originalFrom(table);
            if (table === 'users') {
                chain.upsert = usersUpsertSpy;
            }
            if (table === 'incidents') {
                const originalInsert = chain.insert.bind(chain);
                chain.insert = (data) => {
                    incidentsInsertSpy(data);
                    return originalInsert(data);
                };
            }
            // ... rest of the mock
```

Then in the `POST /api/submit` test:
```javascript
    it('POST /api/submit when shareData is false returns success', async () => {
        // ... (keep existing setup)
        expect(res.statusCode).toEqual(200);
        expect(res.body).toMatchObject({ success: true, message: "Report triggered" });
        expect(usersUpsertSpy).toHaveBeenCalledWith(expect.objectContaining({ pool_data: false }));
        expect(incidentsInsertSpy).toHaveBeenCalledWith(expect.objectContaining({ reported_by: 'testfalse@example.com' }));
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- vercel/tests/server.test.js`
Expected: FAIL due to `reported_by` not being passed to `insert`.

- [ ] **Step 3: Update `server.js` to include `reported_by`**

Modify `vercel/server.js` around line 351:

```javascript
            const { data: newIncident } = await supabase.from('incidents')
                .insert({ smell_timestamp: smellTimestamp, smell_type: smellType, business_location: businessLocation, status: 'pending', reported_by: email || null })
                .select()
                .single()
                .throwOnError();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- vercel/tests/server.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add vercel/server.js vercel/tests/server.test.js
git commit -m "feat: populate reported_by on incident creation"
```
