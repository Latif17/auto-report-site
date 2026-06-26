# Auto Report Site

## Why this repo exists
For over 20 years, the Barking area has been plagued by a severe and persistent stench. Residents in the newly developed Barking Riverside (located just 1 mile away from potential culprits) frequently suffer from foul, toxic smells drifting into their homes, often overnight. This environmental hazard has forced residents to keep windows shut, purchase air purifiers, and avoid going outside when the smell is bad.

The main culprits are believed to be businesses operating in the London Sustainable Industries Park off Choats Road, particularly:
- **ReFoods UK** (Dagenham)
- **East London BioGas**
- **Veolia** (Dagenham)

Neighboring businesses have faced the same uphill challenge for two decades. The issue has been reported to Barking Riverside London and Bellway with no resolution.

Previously, the only recourse for the community was organizing manual mass reporting via the [government environmental problem service](https://report-an-environmental-problem.service.gov.uk/smell/source). However, this manual process has proven ineffective, requiring constant community coordination for temporary measures.

**This tool was built to automate the reporting process** for Barking Riverside residents based on these known culprits, ensuring that incidents are consistently and systematically logged to hold the responsible parties accountable.

## Tech Stack & Architecture

- **Frontend:** Vanilla HTML, CSS, and JavaScript. Kept simple and lightweight to ensure fast loading times and ease of use.
- **Backend API:** Node.js with Express. Receives report submissions from the frontend and queues them in the database.
- **Automation / Scraping:** Puppeteer. Used to run a headless browser that automates filling out and submitting the government's environmental problem form.
- **Database:** Supabase (PostgreSQL). Stores user details, incident logs, and the reporting queue.

### Deployment Choices

- **Vercel (Frontend & API):** Chosen for its excellent serverless capabilities. It allows the static frontend and the Express API to be hosted with instant scaling and minimal configuration.
- **GitHub Actions (Scraper Cron Job):** Because serverless functions (like those on Vercel) have strict timeout limits and struggle to run full headless browsers, we use GitHub Actions. It runs a scheduled job every 5 minutes (`scraper.yml`) to execute Puppeteer and reliably process the queued reports.
- **Supabase (Database):** Provides a managed PostgreSQL database that integrates seamlessly with both our serverless API and our GitHub Actions scraper.

## Local Development

1. **Environment Variables:**
   - Ensure you have `SUPABASE_URL` and `SUPABASE_KEY` available if connecting to a real database, or let it run without them for mock mode.
2. **Install and Run:**
   ```bash
   npm install
   npm start
   ```
3. **View the App:**
   - Open your browser to `http://localhost:3000`.

## Deployment

This project uses **Vercel** for the frontend and Express API, **GitHub Actions** for the background scheduled task, and **Supabase** for the PostgreSQL database.

### 1. Database Setup (Supabase)
- Create a free project at [Supabase](https://supabase.com).
- Go to the SQL Editor and run the SQL from `schema.sql` to initialize the tables.
- Retrieve your Project URL and anon API key from Project Settings > API.

### 2. Backend Scheduled Task Setup (GitHub Actions)
- In your GitHub repository, go to **Settings > Secrets and variables > Actions**.
- Create a **New repository secret** called `SUPABASE_URL` and paste your project URL.
- Create another secret called `SUPABASE_KEY` and paste your anon API key.
- The GitHub Action (`.github/workflows/scraper.yml`) will now run automatically every 5 minutes to process queued smell reports.

### 3. Frontend & API Setup (Vercel)
- Create a free account at [Vercel](https://vercel.com) and link your GitHub account.
- Import your repository. Vercel will automatically detect the configuration from `vercel.json`.
- Under **Environment Variables**, add the `SUPABASE_URL` and `SUPABASE_KEY` variables.
- Click **Deploy**.

Your site is now live! Vercel handles the instant web traffic, while GitHub Actions handles the heavy automated browser reporting in the background.
