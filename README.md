# Auto Report Site

## Production 
https://report-smell-br.vercel.app/

## Why this repo exists
For over 20 years, the Barking area has been plagued by a severe and persistent stench. Residents in the newly developed Barking Riverside (located just 1 mile away from potential culprits) frequently suffer from foul, toxic smells drifting into their homes, often overnight. This environmental hazard has forced residents to keep windows shut, purchase air purifiers, and avoid going outside when the smell is bad.

The main culprits are believed to be businesses operating in the London Sustainable Industries Park off Choats Road, particularly:
- **ReFoods UK** (Dagenham)
- **East London BioGas**
- **Veolia** (Dagenham)

Neighboring businesses have faced the same uphill challenge for two decades. The issue has been reported to Barking Riverside London and Bellway with no resolution.

Previously, the only recourse for the community was organizing manual mass reporting via the [government environmental problem service](https://report-an-environmental-problem.service.gov.uk/smell/source). However, this manual process has proven ineffective, requiring constant community coordination for temporary measures.

**This tool was built to automate the reporting process** for Barking Riverside residents based on these known culprits, ensuring that incidents are consistently and systematically logged to hold the responsible parties accountable.

## Repository Structure & Decoupled Architecture

The repository is organized into distinct deployment-specific folders:

- **`vercel/` (Web Application & Server API):**
  - Contains the frontend client (`public/`) and serverless Express API endpoints (`server.js`).
  - Optimized package configuration (no Puppeteer dependency) for fast serverless build times and low cold-start latency.
- **`homelab/` (Dockerized Scraper Daemon):**
  - Contains the background worker daemon (`run-scraper.js`, `scraper.js`, `utils.js`) and Docker configs (`Dockerfile`, `docker-compose.yml`).
  - Manages browser automation dependencies independently.
- **`supabase/` (Database Schemas):**
  - Contains the PostgreSQL schemas and migration scripts (`schema.sql`, `schema_update.sql`, `schema_update_pool_data.sql`).

---

## Local Development

### 1. Web Frontend & API (`vercel/`)
1. Navigate to the web folder:
   ```bash
   cd vercel
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm start
   ```
4. Access the web app in your browser at `http://localhost:3000`.

### 2. Scraper Worker (`homelab/`)
1. Navigate to the worker folder:
   ```bash
   cd homelab
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the scraper daemon locally:
   ```bash
   npm start
   ```

---

## Deployment Setup

### 1. Database Setup (Supabase)
- Create a project on [Supabase](https://supabase.com).
- Open the SQL Editor and run the schemas in the following order:
  1. `supabase/schema.sql`
  2. `supabase/schema_update.sql`
  3. `supabase/schema_update_pool_data.sql`
- Copy your `Project URL` and `Secret Key` from **Project Settings > API**.

### 2. Web & API Setup (Vercel)
- Create an account on [Vercel](https://vercel.com) and import this repository.
- **Important:** Under **Project Settings > General**, set the **Root Directory** to `vercel`.
- Add `SUPABASE_URL` and `SUPABASE_KEY` as Environment Variables.
- Deploy the project.

### 3. Background Scraper Setup (Homelab or GitHub Actions)

#### Option A: Homelab (Docker Compose)
- Copy the `.env.example` file to `homelab/.env` and populate your Supabase credentials:
  ```env
  SUPABASE_URL=your-supabase-url
  SUPABASE_KEY=your-supabase-key
  ```
- Build and launch the container daemon:
  ```bash
  cd homelab
  docker-compose up -d
  ```

#### Option B: GitHub Actions (Scheduled Scraper)
- Go to your repository settings: **Settings > Secrets and variables > Actions**.
- Create two secrets: `SUPABASE_URL` and `SUPABASE_KEY`.
- The scheduled cron job in `.github/workflows/scraper.yml` will automatically poll and process queued reports every 5 minutes.
