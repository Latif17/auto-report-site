# Auto Report Scraper and Form Updates Design Spec

## 1. Overview
The goal of this update is to refine the Barking Stink reporting tool to better align with the latest GOV.UK scraper flow, explicitly tracking "When the smell started" and "Which company is being reported". Furthermore, we are simplifying the community activity feed to only ever show the absolute latest reported event, discarding the previous 24-hour grouping logic.

## 2. Database Schema Updates
The `incidents` table in Supabase will be modified to support the new conditional form inputs.

- **Add `start_category` (TEXT):** Will store values 'Now', 'Earlier today', 'Yesterday', or 'Before yesterday'.
- **Add `date_of_smell` (TEXT, Nullable):** Will store the date (e.g., '12/05/2026' or JSON of Day, Month, Year) only if `start_category` is 'Before yesterday'.
- **Modify `time_of_smell` (TEXT, Nullable):** Time is no longer strictly required if the category is 'Now'.
- **`business_location` (TEXT):** Continues to store the targeted company string.

*(Note: We will need to run an `ALTER TABLE` query on the Supabase database to apply these schema changes.)*

## 3. Backend API (`server.js`)
The server logic will be heavily simplified to stop clustering identical reports.

### `POST /api/submit`
- Will accept the new explicit JSON payload: `{ startCategory, dateOfSmell, timeOfSmell, businessLocation, ...userData }`.
- Blindly inserts a new row into `incidents` with this payload.
- No longer checks for existing incidents in the last hour to cluster them. Every submission is a new, independent row.

### `GET /api/stats`
- **Current Behavior:** Groups identical incidents within the last 24 hours to find "active" clustered events.
- **New Behavior:** Simply runs a query to fetch the exact 1 most recent row from `incidents` (`ORDER BY created_at DESC LIMIT 1`).
- Returns this single incident as the "Last Reported Event" payload along with the total opted-in user count.

## 4. Frontend UI (`index.html` & `app.js`)
The user interface will be updated to collect the required conditional data while keeping friction minimal.

### The Reporting Form
1. **Target Selection ("Who are you reporting?"):**
   - Options: Multiple (ReFoods, East London BioGas and Veolia), ReFoods, East London BioGas, Veolia, Other.
   - Defaults to the Multiple/Collective option.
2. **Start Category ("When did the smell start?"):**
   - Dropdown or Radio options: Now, Earlier today, Yesterday, Before yesterday.
   - Defaults to "Now".
3. **Dynamic Display Logic (`app.js`):**
   - **If "Now":** Hide the Time and Date inputs completely.
   - **If "Earlier today" or "Yesterday":** Show the Time input (Required).
   - **If "Before yesterday":** Show the Date input (Day/Month/Year fields) AND the Time input (Required).

### Community Activity Panel
- Strip out the "Join Event" button and the active incident countdown logic.
- Replace the panel content with a single card: **"Last Reported Event"**.
- Displays the absolute latest incident's Start Category / Date, Time, and the Company targeted, based on the `/api/stats` response.

## 5. Puppeteer Scraper (`scraper.js`)
The scraper script will dynamically route through the GOV.UK pages based on the `startCategory` provided.

- **Company Location (Page 2):** Injects the `businessLocation` string directly.
- **Date Question (Page 8):** Clicks the label matching `startCategory`.
- **Conditional Branching:**
  - **Path A ('Now'):** Skips time and presence checks. Jumps directly from Page 8 to the "How strong was the smell?" page.
  - **Path B ('Earlier today' or 'Yesterday'):** Waits for the "What time?" page, inputs `timeOfSmell`, clicks continue. Waits for "Is it still there?" page, clicks 'Yes', clicks continue. Arrives at "How strong?".
  - **Path C ('Before yesterday'):** Waits for the new "What date did the smell start?" page. Inputs the Day, Month, and Year derived from `dateOfSmell`. Clicks continue. Then proceeds to the "What time?" page, the "Still there?" page, and finally the "How strong?" page.

## 6. Deployment
- The updated code will be tested locally against a mock Supabase payload and locally with `--test-mode` to verify Puppeteer flow before pushing.
- After code is deployed, the `schema.sql` `ALTER TABLE` commands must be executed against the live Supabase instance.
