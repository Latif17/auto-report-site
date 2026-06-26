# Auto Report Site

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
