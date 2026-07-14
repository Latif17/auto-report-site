# Submitted At Timestamp Design Spec

## Purpose
Track the exact timestamp when a user's incident report was successfully submitted to the external Gov website by the background scraper.

## Architecture & Data Flow
1. **Database Update:** 
   - Add a new column `submitted_at` to the `opted_in_user_reports` table.
   - Type: `TIMESTAMP WITH TIME ZONE`
   - Default: `NULL` (since a report starts in the `pending` state).

2. **Scraper Update (`homelab/run-scraper.js`):**
   - When the scraper successfully completes a form submission for a given user, it updates the row in `opted_in_user_reports` to `status: 'completed'`.
   - We will modify this `upsert` operation to also include `submitted_at: new Date().toISOString()`.

3. **API Integrity (`vercel/server.js`):**
   - When users initially opt-in or join an incident, the server creates the `opted_in_user_reports` row without setting `submitted_at`. This correctly defaults to `NULL`, preserving the semantic meaning that it hasn't been submitted yet.

## Testing & Verification
- Verify the schema update applies cleanly.
- Verify that running the scraper updates the `submitted_at` field only when the submission succeeds.
- Verify that existing pending reports (if any) or new reports continue to be inserted without errors.
