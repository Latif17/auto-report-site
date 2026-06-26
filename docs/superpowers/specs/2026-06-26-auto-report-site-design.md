# Auto Report Site Design Spec

## Overview
A web application designed to allow local residents to easily and automatically mass-report environmental smell issues to the local council via the GOV.UK form. 
The system enables users to save their details locally for 1-click submission, or opt-in to a shared database so that their details are automatically used to submit additional reports whenever someone in the community reports an active smell.

## Architecture

### 1. Frontend (Static Site)
- **Tech Stack:** HTML, Vanilla CSS, Vanilla JS.
- **Hosting:** Free static hosting (e.g., Render, GitHub Pages, or Vercel).
- **Design:** Modern, premium aesthetic featuring glassmorphism, dynamic gradients, and clear typography.
- **Functionality:**
  - Explains the purpose of the tool clearly.
  - Collects required GOV.UK form fields: Full Name, Email, Postcode, Phone (optional), Address, and Smell Description.
  - **Data Preferences:**
    - *Store Locally:* Saves form data in `localStorage` for 1-click future reporting.
    - *Share Data:* Submits form data to the backend to be stored in the database for automated mass reporting.
  - Submits a request to the backend API when the user clicks "Submit".

### 2. Backend API
- **Tech Stack:** Node.js, Express, Puppeteer (Headless Browser).
- **Hosting:** Render Free Web Service.
- **Endpoints:**
  - `POST /api/submit`:
    - Receives user details from the frontend.
    - Initiates a Puppeteer session to navigate and fill out the multi-step `https://report-an-environmental-problem.service.gov.uk/smell/source` form.
    - Triggers the Mass Reporting Engine.
  - `POST /api/opt-in`:
    - Receives user details.
    - Upserts the user record in the Supabase database.

### 3. Mass Reporting Engine
- When a manual submission is triggered via `POST /api/submit`, the backend fetches all opted-in users from the Supabase database.
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
    - `description` (Text)

## Out of Scope
- User authentication/logins (users are identified and upserted by their email).
- Advanced analytics or reporting dashboards.
