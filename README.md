# Auto Report Site

## Local Development

1. **Environment Variables:**
   - Ensure you have `SUPABASE_URL` and `SUPABASE_KEY` available if connecting to a real database, or let it run without them for mock mode.
2. **Install and Run:**
   ```bash
   cd backend
   npm install
   npm start
   ```
3. **View the App:**
   - Open your browser to `http://localhost:3000`.

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
