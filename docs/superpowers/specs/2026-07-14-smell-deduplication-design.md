# Smell Report Deduplication Design

## Overview
When multiple residents report a smell from the same source within a short timeframe, the system currently creates separate, individual incidents. To prevent spamming the government service and to aggregate community reports, the system will deduplicate reports that fall within a 3-hour window of an existing incident for the same source.

## Architecture & Logic
The deduplication logic will be handled entirely in the backend (`vercel/server.js`) during the `/api/submit` flow.

### Definition of "Same Source"
An incident is considered to be from the same source if:
- `smell_type` matches exactly.
- `business_location` matches exactly (or is `null` in both).

### The 3-Hour Window
The time window is based on the `smell_timestamp` (the time the user detected the smell), not the time of submission.
- **Window:** ±3 hours from the reported `smell_timestamp`.
- **Anchor Strategy:** If multiple incidents exist within this window, the system selects the oldest one (Earliest Incident Anchor). This treats the earliest report as the start of the event and groups subsequent nearby reports into it.

## Data Flow
When a user submits a report:
1. The backend constructs the `smellTimestamp`.
2. A query is made to the `incidents` table:
   - Match `smell_type` and `business_location`.
   - Filter where `smell_timestamp >= smellTimestamp - 3 hours` and `smell_timestamp <= smellTimestamp + 3 hours`.
   - Order by `smell_timestamp` ASC.
   - Limit to 1.
3. **If an anchor incident is found:**
   - Check if the user's email is already linked to this incident in `opted_in_user_reports`.
   - If yes: Return a 400 error ("You have already submitted a report for this exact event.").
   - If no: Upsert the user into `users` and insert a record into `opted_in_user_reports` linking the user to the *existing* incident ID.
4. **If no anchor incident is found:**
   - Insert a new incident into the `incidents` table.
   - Upsert the user into `users` and insert a record into `opted_in_user_reports` linking the user to the *new* incident ID.

## Error Handling & Edge Cases
- **Database constraints:** The existing unique constraint on `(user_email, incident_id)` in `opted_in_user_reports` continues to prevent concurrent duplicate submissions for the same user on the same event.
- **Missing Data:** If the location is omitted, the query correctly matches incidents where `business_location` is `null`.
- **Timezones:** The `smell_timestamp` stored in PostgreSQL with time zone will be used to correctly compare ranges irrespective of local daylight saving shifts.

## Testing Strategy
- Ensure the query for `±3 hours` is written properly for Supabase PostgREST syntax (`gte` and `lte`).
- Test with simulated timestamps to verify the Earliest Incident Anchor is selected.
