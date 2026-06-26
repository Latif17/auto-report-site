## Deployment

1. **Supabase Database Setup:**
   - Create a free project at [Supabase](https://supabase.com).
   - Go to the SQL Editor and run the SQL from `backend/schema.sql`.
   - Retrieve your Project URL and anon API key from Project Settings > API.

2. **Render Deployment:**
   - Create a free account at [Render](https://render.com).
   - Connect your GitHub account and choose "Blueprints" from the dashboard.
   - Select this repository. Render will automatically detect the `render.yaml` and configure the web service.
   - When prompted in the Render Dashboard, fill in the `SUPABASE_URL` and `SUPABASE_KEY` environment variables.
