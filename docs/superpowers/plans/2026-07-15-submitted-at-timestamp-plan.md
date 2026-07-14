# Submitted At Timestamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track the exact timestamp when a user's incident report was successfully submitted to the external Gov website by the background scraper.

**Architecture:** Add `submitted_at` to the `opted_in_user_reports` table and update the `upsert` payload in `run-scraper.js` to include the current timestamp.

**Tech Stack:** Node.js, Supabase SQL

## Global Constraints
- Do not affect the `vercel/server.js` endpoints handling opt-ins (let `submitted_at` default to null there).

---

### Task 1: Update Database Schema

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `supabase/schema_update.sql`

**Interfaces:**
- Consumes: N/A
- Produces: Table `opted_in_user_reports` now has column `submitted_at TIMESTAMP WITH TIME ZONE`.

- [ ] **Step 1: Write schema update for the existing table**
Update `supabase/schema.sql` to include `submitted_at TIMESTAMP WITH TIME ZONE` for `opted_in_user_reports` on line 29:
```sql
CREATE TABLE opted_in_user_reports (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id),
  user_email TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE
);
```

- [ ] **Step 2: Add migration command to schema_update.sql**
Append to `supabase/schema_update.sql`:
```sql
ALTER TABLE opted_in_user_reports ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;
```

- [ ] **Step 3: Commit**
```bash
git add supabase/schema.sql supabase/schema_update.sql
git commit -m "feat: add submitted_at timestamp to opted_in_user_reports"
```

---

### Task 2: Update Scraper

**Files:**
- Modify: `homelab/run-scraper.js`

**Interfaces:**
- Consumes: Modified DB schema
- Produces: Upsert statement sending `submitted_at` upon successful submission.

- [ ] **Step 1: Write scraper implementation**
In `homelab/run-scraper.js`, modify the `upsert` block inside `if (success) {` (around line 156):
```javascript
                            const { error: completeLinkError } = await supabase
                                .from('opted_in_user_reports')
                                .upsert({ 
                                    incident_id: incident.id, 
                                    user_email: user.email,
                                    status: 'completed',
                                    submitted_at: new Date().toISOString()
                                }, { onConflict: 'user_email, incident_id' });
```

- [ ] **Step 2: Commit**
```bash
git add homelab/run-scraper.js
git commit -m "feat: update scraper to log submitted_at timestamp"
```
