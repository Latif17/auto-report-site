# Add `reported_by` to Incidents

## Purpose
Track which user originally reported an incident in the database. This allows us to attribute the origin of an incident to a specific user while preserving data integrity.

## Architecture & Data Flow

1. **Database Schema:**
   - Add a `reported_by` column to the `incidents` table.
   - Type: `TEXT`.
   - Foreign Key: References `users(email)`.
   - Constraint: `ON DELETE SET NULL`. If the original reporting user deletes their account/data, the incident will remain, but the `reported_by` field will become `NULL`, preserving the incident for other users who joined it.

2. **Backend Changes (`server.js`):**
   - In the `/api/submit` endpoint, when the user provides an email and a new incident is being created (not joining an existing one), include `reported_by: email` in the `incidents` `.insert()` query.
   - For users who submit anonymously (no email), `reported_by` will be null.

## Implementation Details

- **`supabase/schema_update_reported_by.sql`**: A new SQL script containing `ALTER TABLE incidents ADD COLUMN reported_by TEXT REFERENCES users(email) ON DELETE SET NULL;`.
- **`supabase/schema.sql`**: Update the `CREATE TABLE IF NOT EXISTS incidents` block to include `reported_by TEXT REFERENCES users(email) ON DELETE SET NULL`.
- **`vercel/server.js`**: Modify the `supabase.from('incidents').insert(...)` call in `/api/submit` to add the `reported_by` key.

## Trade-offs
- Setting `ON DELETE SET NULL` prevents cascading data loss for users who joined an incident that was reported by someone else who later deleted their account.
