# GDPR and PII Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Secure the Supabase database by switching the backend to use the Service Role key and removing all public `anon` access to prevent PII data leaks.

**Architecture:** We will modify the database schema to remove `anon` policies, forcing a default-deny posture for public internet requests. We will update the Express API (`server.js`) and Puppeteer scraper (`scraper.js`/`run-scraper.js`) to authenticate using `SUPABASE_SERVICE_ROLE_KEY`, restoring their access bypassing RLS. Finally, we will update the deployment instructions in `README.md`.

**Tech Stack:** Node.js, Express, Supabase (PostgreSQL), Markdown

## Global Constraints

- No PII is to be accessible via the public Supabase `anon` key.
- All RLS policies for `anon` role MUST be removed.
- Use exact environment variable name `SUPABASE_SERVICE_ROLE_KEY`.

---

### Task 1: Update Database Schema to Remove Anon Access

**Files:**
- Modify: `schema.sql`
- Modify: `schema_update.sql`
- Test: Manual verification script (no automated tests present for SQL schema in repo)

**Interfaces:**
- Consumes: N/A
- Produces: Updated SQL schema files that do not contain `anon` policies.

- [ ] **Step 1: Write SQL check script (Test)**

```javascript
// scratch/test_schema.js
const fs = require('fs');
const schema = fs.readFileSync('schema.sql', 'utf8');
if (schema.includes('anon select on users')) {
    console.error('schema.sql still contains anon policies');
    process.exit(1);
}
console.log('PASS');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scratch/test_schema.js`
Expected: FAIL with "schema.sql still contains anon policies"

- [ ] **Step 3: Write minimal implementation**

Modify `schema.sql` by deleting lines 38-51 (all the `CREATE POLICY "Allow anon...` statements).
Modify `schema_update.sql` by deleting lines 12-25 (all the `CREATE POLICY "Allow anon...` statements).

- [ ] **Step 4: Run test to verify it passes**

Run: `node scratch/test_schema.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rm scratch/test_schema.js
git add schema.sql schema_update.sql
git commit -m "fix(db): remove permissive anon policies to prevent PII leak"
```

### Task 2: Update Backend to Use Service Role Key

**Files:**
- Modify: `server.js`
- Modify: `scraper.js` (or `run-scraper.js` depending on where Supabase is initialized)
- Test: Manual check script to verify env var

**Interfaces:**
- Consumes: `SUPABASE_SERVICE_ROLE_KEY` env variable
- Produces: Backend clients that bypass RLS

- [ ] **Step 1: Write test to verify key usage**

```javascript
// scratch/test_server.js
const fs = require('fs');
const serverCode = fs.readFileSync('server.js', 'utf8');
if (serverCode.includes('process.env.SUPABASE_KEY')) {
    console.error('server.js still uses SUPABASE_KEY');
    process.exit(1);
}
console.log('PASS');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scratch/test_server.js`
Expected: FAIL with "server.js still uses SUPABASE_KEY"

- [ ] **Step 3: Write minimal implementation**

Modify `server.js`:
Change `process.env.SUPABASE_KEY` to `process.env.SUPABASE_SERVICE_ROLE_KEY` around line 42.

Modify `scraper.js`:
Change `process.env.SUPABASE_KEY` to `process.env.SUPABASE_SERVICE_ROLE_KEY` if it exists. (Check if `scraper.js` uses Supabase or `run-scraper.js`).

- [ ] **Step 4: Run test to verify it passes**

Run: `node scratch/test_server.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rm scratch/test_server.js
git add server.js scraper.js run-scraper.js
git commit -m "refactor(backend): use SUPABASE_SERVICE_ROLE_KEY for database access"
```

### Task 3: Update Documentation

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: N/A
- Produces: Updated deployment instructions

- [ ] **Step 1: Write test to verify README updates**

```javascript
// scratch/test_readme.js
const fs = require('fs');
const readme = fs.readFileSync('README.md', 'utf8');
if (readme.includes('SUPABASE_KEY') && !readme.includes('SUPABASE_SERVICE_ROLE_KEY')) {
    console.error('README.md still uses SUPABASE_KEY instead of service role key');
    process.exit(1);
}
console.log('PASS');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scratch/test_readme.js`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Modify `README.md`:
Replace all instances of `SUPABASE_KEY` with `SUPABASE_SERVICE_ROLE_KEY`.
Update "retrieve your anon API key" instructions to say "retrieve your Service Role Secret".

- [ ] **Step 4: Run test to verify it passes**

Run: `node scratch/test_readme.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rm scratch/test_readme.js
git add README.md
git commit -m "docs: update deployment instructions for service role key"
```
