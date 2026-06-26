# Vercel & GitHub Actions Architecture Design

## Overview
Transition the Auto Report Site hosting architecture from a Render Docker container to a serverless Vercel deployment (for the frontend and API) combined with a scheduled GitHub Actions workflow (for the heavy Puppeteer scraper). This entirely eliminates Docker memory constraints and takes advantage of free, highly scalable hosting options suitable for open source projects.

## Components

### 1. Database (Supabase)
- **Schema Update:** Add a `status` column to the `incidents` table. The values will be `'pending'`, `'processing'`, and `'completed'`.
- **DDoS / Duplicate Bug Fix:** By utilizing the `status` column, the backend will group duplicate reports. When a user submits an event, if an incident within the last hour exists, the user's report is linked to it. The scraper will only process `'pending'` incidents.

### 2. Frontend & API (Vercel)
- **Vercel Configuration:** Add a `vercel.json` file at the repository root to configure Vercel to serve the Express API and static frontend assets seamlessly.
- **API Cleanup:** The `/api/submit` endpoint in `backend/server.js` will be stripped of Puppeteer execution (`submitGovForm` and `triggerMassReporting`). It will simply log the incident to Supabase as `'pending'` and immediately return a success response, drastically speeding up the user experience.

### 3. Background Scraper (GitHub Actions)
- **Workflow:** Create `.github/workflows/scraper.yml` to run on a `schedule` (e.g., `cron: '*/5 * * * *'` for every 5 minutes).
- **Scraper Script:** Extract the mass reporting and `puppeteer` logic into a standalone Node.js script (e.g., `backend/run-scraper.js`).
- **Execution Flow:**
  1. The script connects to Supabase and queries for incidents where `status = 'pending'`.
  2. It marks the found incident as `'processing'`.
  3. It retrieves all opted-in users and executes `submitGovForm` for them in small batches (with minor delays to avoid government rate limits).
  4. Upon finishing all submissions, it marks the incident as `'completed'`.

### 4. Cleanup
- **Remove Obsolete Render Assets:** Delete `render.yaml`, `backend/Dockerfile`, and `backend/.dockerignore`.
- **Documentation:** Update `README.md` to reflect the Vercel and GitHub Actions setup, removing Render instructions.

## Data Flow
1. **User Action:** User submits form on the Vercel-hosted site.
2. **Vercel API:** Vercel creates or updates an incident in Supabase (`status: 'pending'`).
3. **GitHub Action (Every 5 mins):** GitHub wakes up, runs `run-scraper.js`.
4. **Scraper logic:** The script processes the pending incident, drives headless Chromium to submit to the Gov form, and updates the Supabase status to `'completed'`.

## Edge Cases & Error Handling
- **Supabase Connectivity:** Handled natively with `.throwOnError()` returning clean error logs in GitHub Actions.
- **Scraper Failure:** If Puppeteer fails midway, the incident could be stuck in `'processing'`. A future improvement could handle retrying stale processing jobs, but for now, it's sufficient to log the error to GitHub Actions.
