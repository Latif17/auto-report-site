# Auto Report Site Design Spec

## Overview
A web application designed for the Barking Riverside community to mass-report the decades-old environmental smell issues to the local council via the GOV.UK form.
The system enables users to save their details locally for 1-click submission, or opt-in to a shared database so that their details are automatically used to submit additional reports whenever someone in the community reports an active smell.

## The Narrative & Branding
The site will be explicitly tailored to Barking Riverside, highlighting the 20-year history of the smell against the new residential development. It will call out the industrial sources (ReFoods UK, East London BioGas, Veolia) and the inaction of developers like Bellway and Barking Riverside London. The core message: **The government requires overwhelming proof (time, severity, impact) to act, and a single complaint isn't enough.**

## Architecture

### 1. Frontend (Static Site)
- **Tech Stack:** HTML, Vanilla CSS, Vanilla JS.
- **Hosting:** Free static hosting (e.g., Render, GitHub Pages, or Vercel).
- **Design:** Modern, premium aesthetic featuring glassmorphism, dynamic gradients, and clear typography.
- **Metrics & Engagement (Bystander Effect Fix):**
  - **Live Community Stats:** Displays "XX Barking Riverside neighbors standing by" and "Last smell reported [Time] ago".
  - **Active Alert State:** If the last report was over a certain threshold (e.g., 2 hours), the UI prompts users: *"No one has reported a smell recently. Be the one to trigger the community mass-report today!"*
  - **Empowered CTA:** The submit button explicitly states: *"Submit & Trigger [N] Community Reports"*.
- **Functionality:**
  - Collects standard GOV.UK fields: Full Name, Email, Postcode, Phone (optional), Address.
  - Collects specific context required by authorities: **Time of smell, Severity (scale 1-5), and Impact**.
  - **Data Preferences:**
    - *Store Locally:* Saves form data in `localStorage` for 1-click reporting.
    - *Share Data:* Submits form data to the backend for automated mass reporting.

### 2. Backend API
- **Tech Stack:** Node.js, Express, Puppeteer (Headless Browser).
- **Hosting:** Render Free Web Service.
- **Endpoints:**
  - `POST /api/submit`:
    - Receives user details.
    - Initiates a Puppeteer session to navigate and fill out the `https://report-an-environmental-problem.service.gov.uk/smell/source` form. (Time, Severity, and Impact are compiled into the description field).
    - Triggers the Mass Reporting Engine.
  - `POST /api/opt-in`:
    - Upserts the user record in the Supabase database.
  - `GET /api/stats`:
    - Returns the number of opted-in users and the timestamp of the last successful submission.

### 3. Mass Reporting Engine
- When a manual submission is triggered, the backend fetches all opted-in users from the Supabase database.
- It queues up background Puppeteer tasks to submit the GOV.UK form on behalf of every opted-in user. 
- *Note on Limits:* Submissions will be processed sequentially to respect Render's free-tier memory limits and prevent crashing.

### 4. Database
- **Tech Stack:** Supabase (PostgreSQL).
- **Schema:**
  - `users` table:
    - `email` (Primary Key, String)
    - `full_name` (String)
    - `postcode` (String)
    - `phone` (String, nullable)
    - `address` (Text)
  - `system_stats` table (or similar, to track the last report time).

## Out of Scope
- User authentication/logins (users are identified and upserted by their email).
- Advanced analytics dashboards.
