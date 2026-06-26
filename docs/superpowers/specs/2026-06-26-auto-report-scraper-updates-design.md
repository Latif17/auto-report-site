# Auto Report Scraper and Form Updates Design Spec

## 1. Overview
The goal of this update is to refine the Barking Stink reporting tool to track "Date of smell", "Time of smell", and "Which company is being reported". We are simplifying the UI so the user just inputs standard date and time fields. The backend/scraper will then translate these standard inputs into the specific conditional flows required by the GOV.UK scraper (Now, Earlier today, Yesterday, Before yesterday). Furthermore, we are simplifying the community activity feed to only ever show the absolute latest reported event, discarding the previous 24-hour grouping logic.

## 2. Database Schema Updates
The `incidents` table in Supabase will be modified to support explicit date tracking.

- **Add `date_of_smell` (DATE):** Will store the specific date the smell started (e.g., '2026-06-26').
- **Modify `time_of_smell` (TEXT):** Will continue storing the time (e.g., '14:30'). This represents the event's actual time. If the user doesn't provide it, the frontend/backend will auto-fill the current time to ensure the event has a valid time.
- **`business_location` (TEXT):** Continues to store the targeted company string.

We will provide an updated `schema.sql` representing the new base schema, and a separate `schema_update.sql` containing just the `ALTER TABLE` commands.

## 3. Backend API (`server.js`)
The server logic will be heavily simplified.

### `POST /api/submit`
- Will accept the JSON payload: `{ dateOfSmell, timeOfSmell, businessLocation, ...userData }`.
- If `timeOfSmell` is missing, it will generate and insert the current time.
- Blindly inserts a new row into `incidents` with this payload.
- No longer checks for existing incidents in the last hour to cluster them. Every submission is a new, independent row.

### `GET /api/stats`
- **New Behavior:** Simply runs a query to fetch the exact 1 most recent row from `incidents` (`ORDER BY created_at DESC LIMIT 1`).
- Returns this single incident as the "Last Reported Event" payload along with the total opted-in user count.

## 4. Frontend UI (`index.html` & `app.js`)
The user interface will be updated to be as simple as possible.

### The Reporting Form
1. **Target Selection ("Who are you reporting?"):**
   - Options: Multiple (ReFoods, East London BioGas and Veolia), ReFoods, East London BioGas, Veolia.
   - Defaults to the Multiple/Collective option.
2. **Date and Time of Smell:**
   - **Date:** A standard `type="date"` input. Defaults to Today.
   - **Time:** A standard `type="time"` input. Defaults to current time.

### Community Activity Panel
- Strip out the "Join Event" button and the active incident countdown logic.
- Replace the panel content with a single card: **"Last Reported Event"**.
- Displays the absolute latest incident's Date, Time, and the Company targeted.

## 5. Puppeteer Scraper (`scraper.js`)
The scraper script will dynamically route through the GOV.UK pages by evaluating `dateOfSmell` against the current date.

- **Company Location (Page 2):** Injects the `businessLocation` string directly.
- **Date Question Mapping (Page 8):** The script compares `dateOfSmell` to the current system date:
  - **If Today:** Clicks "Earlier today". (We can skip "Now" to ensure we always supply the explicit time recorded for the event).
  - **If Yesterday:** Clicks "Yesterday".
  - **If older than Yesterday:** Clicks "Before yesterday".
- **Conditional Branching:**
  - **Path A ('Earlier today' or 'Yesterday'):** Waits for the "What time?" page, inputs `timeOfSmell`, clicks continue. Waits for "Is it still there?" page, clicks 'Yes', clicks continue. Arrives at "How strong?".
  - **Path B ('Before yesterday'):** Waits for the new "What date did the smell start?" page. Inputs the Day, Month, and Year derived from `dateOfSmell`. Clicks continue. Then proceeds to the "What time?" page, the "Still there?" page, and finally the "How strong?" page.

## 6. Deployment
- The updated code will be tested locally before pushing.
- After code is deployed, the `schema_update.sql` commands must be executed against the live Supabase instance.
