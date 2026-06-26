# Recent Events Selection Design Spec

## Overview
Allow users to select a recent smell event from the Community Stats section. Selecting an event will auto-populate the form's "Type of Smell", "Date / Time", and "Business Location" fields so users who have previously submitted the form can easily report the same event using their saved details.

## Database Schema Updates
1. **`incidents` table**: Tracks anonymous smell events.
   - `id` (serial primary key)
   - `time_of_smell` (text)
   - `smell_type` (text)
   - `business_location` (text)
   - `created_at` (timestamp default now())
2. **`opted_in_user_reports` table**: Tracks which opted-in users have reported which incident (prevents duplicates).
   - `incident_id` (foreign key)
   - `user_email` (text)
   - `created_at` (timestamp default now())
   - *Note: This table strictly only contains emails of users who checked `shareData: true`.*

## Backend Data Flow (`/api/submit`)
- Extract `timeOfSmell`, `smellType`, and `businessLocation`.
- Check if an identical incident exists within the last hour. If not, create a new `incident` record.
- If the user has `shareData: true`, log their submission in `opted_in_user_reports`.
- If the user is local-only (`shareData: false`), DO NOT store their email. Just return the `incident_id` to the frontend.
- **Background Task (`triggerMassReporting`)**: Iterate over opted-in users, run the Gov.uk scraper for each, and log each in `opted_in_user_reports`.

## Backend Data Flow (`/api/stats`)
- Fetch recent `incidents` from the last 24 hours, grouped by `(time_of_smell, smell_type, business_location)`.
- Include a `report_count` for each incident group.
- Accept an optional `?email=...` query parameter. If provided, check `opted_in_user_reports` and include `alreadyReported: true/false` for incidents the user has already reported.

## Frontend UI (`index.html` & `app.js`)
**Form Additions:**
- **Type of Smell Dropdown**: Options (Rotten Eggs, Sewage, Chemical, Garbage, Other).
- **Business Location Dropdown**: Options (ReFoods UK, East London BioGas, Veolia Dagenham).

**Community Stats Updates:**
- Replace the static "Last smell reported" with a dynamic list of recent incidents.
- Each incident will show: `[Time] - [Location] - [Type] (X reports)`.
- **Button:** Next to each incident is a "Select Event" button.
- **Duplicate Prevention:**
  - The frontend will maintain a `reported_incidents` array in `localStorage`.
  - If the `incident.id` is in `localStorage` OR `incident.alreadyReported` is true from the backend, the button changes to "Already Reported" and is disabled.
- **Interaction:** Clicking "Select Event" auto-fills the form's `timeOfSmell`, `smellType`, and `businessLocation`, and smoothly scrolls the user to the form.

## Scraper Updates
- Update the puppeteer script to use the new `smellType` and `businessLocation` variables instead of hardcoded values when filling out the GOV.UK form.
