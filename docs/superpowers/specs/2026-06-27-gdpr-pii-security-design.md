# GDPR and PII Security Design

## Objective
To resolve a critical data leak vulnerability where Row Level Security (RLS) permissive policies exposed PII (emails, names, addresses) to anyone possessing the public Supabase `anon` key, ensuring compliance with GDPR best practices.

## Architecture Change
The application will transition from using the public `anon` key to using the `service_role` key in backend environments. This allows us to completely revoke public database access.

## Implementation Details

### 1. Database Schema (`schema.sql` & `schema_update.sql`)
- Retain `ENABLE ROW LEVEL SECURITY` on all tables (`users`, `system_stats`, `incidents`, `opted_in_user_reports`).
- Remove all `CREATE POLICY "Allow anon..."` statements.
- By providing no active RLS policies, Supabase will implicitly deny all requests originating from the `anon` and `authenticated` roles.

### 2. Backend Environment and Code (`server.js`, `run-scraper.js`, `scraper.js`)
- Replace the environment variable `SUPABASE_KEY` with `SUPABASE_SERVICE_ROLE_KEY` during Supabase client initialization.
- The `SERVICE_ROLE_KEY` bypasses all RLS checks, allowing the Express API and GitHub Actions scraper to continue functioning exactly as before (e.g., querying user counts, verifying previous reports, and inserting new incidents) while maintaining total database isolation from public frontend exposure.
- If `SUPABASE_KEY` is currently used as a fallback or in mocks, ensure the logic cleanly adopts `SUPABASE_SERVICE_ROLE_KEY`.

### 3. Documentation Updates (`README.md`)
- Update the deployment sections (Vercel and GitHub Actions) to explicitly instruct developers to copy the **Service Role Secret** from the Supabase dashboard instead of the anon API key.
- Update the variable name in instructions from `SUPABASE_KEY` to `SUPABASE_SERVICE_ROLE_KEY`.

## Security & Privacy Outcomes
- The `anon` key will no longer have any read or write access to the database.
- Even if a malicious actor acquires the project URL and `anon` key, they cannot query the database.
- PII is strictly protected behind the Node.js backend.
