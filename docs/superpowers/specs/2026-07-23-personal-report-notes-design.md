# Personal Incident Notes - Design Spec

## Architecture & Data Flow

When a user logs a new smell or joins an existing community report, they will have the option to include a personal note (e.g., specific health impacts, detailed observations). Because this note is personal, it is sent exclusively with their individual submission to GOV.UK and is not shared with the community or pooled with other users' data.

This ensures their privacy while giving them the ability to add specific context to their official report.

## Database Schema Updates

A new column will be added to the Supabase database to persist this user-specific information.

- **Table:** `opted_in_user_reports`
- **New Column:** `additional_notes` (Type: `TEXT`, nullable)

*Trade-off consideration:* We are storing this in `opted_in_user_reports` rather than `users` because the note pertains to a *specific* incident event, rather than being a permanent attachment to all future reports.

## Backend Changes (`vercel/server.js`)

The `/api/submit` and `/api/join` endpoints will be updated to accept a new field `additionalNotes` in the JSON payload.

When creating a new record in `opted_in_user_reports` (or updating an existing one, if applicable), the backend will map `additionalNotes` to the `additional_notes` column in the database.

## Frontend Changes (`vercel/public`)

### User Interface (`index.html`)

An inline `textarea` field will be added to both the "Log a new smell" and "Smell reported nearby" sections. 

- **Label:** "Is there anything else you'd like to add? (Optional)"
- **Guidance Text:** "This personal note will be sent directly to the EPA/Gov.UK for this specific report. It will not be shared with your neighbors."

### Logic (`app.js`)

When the user clicks the submit button (either for a new incident or joining an existing one), `app.js` will read the value from the respective textarea and include it in the POST request body under the key `additionalNotes`.

## Homelab / Scraper Updates (`homelab/scraper.js` & `run-scraper.js`)

1. **Data Fetching:** The script that queries Supabase for pending reports must be updated to retrieve the `additional_notes` column from the `opted_in_user_reports` table.
2. **Form Automation (`scraper.js`):** On Page 19 ("Anything else") of the GOV.UK submission flow, the automation script currently injects a generalized incident description. This logic will be updated to prioritize and include the user's `additional_notes`. The format will be:
   - If a personal note exists: it will be appended to the general incident type details.
   - If it does not exist: the script will default to its existing behavior (submitting just the general incident details).
