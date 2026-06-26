# Deployment Design

## Overview
The goal is to make the Auto Report Site production-ready and deploy it for free using a unified Render web service and Supabase for the database.

## Architecture & Hosting
- **Hosting Platform:** Render Web Service (Free Tier).
- **Containerization:** Docker. A `Dockerfile` using a pre-configured Puppeteer image will be used because Render's default Node.js environment lacks the necessary OS libraries to run Puppeteer.
- **Static Serving:** `index.html`, `style.css`, and `app.js` will be moved into a `backend/public/` directory. The Express server in `backend/server.js` will serve these static files.
- **Database:** Supabase (Free Tier). The backend connects via environment variables (`SUPABASE_URL`, `SUPABASE_KEY`).

## Implementation Steps
1. **Restructure:** Move frontend files to `backend/public/`.
2. **Server Update:** Modify `backend/server.js` to serve static files.
3. **Dockerize:** Create `Dockerfile` and `.dockerignore` for the backend.
4. **Render Config:** Create a `render.yaml` blueprint for 1-click deployment.
5. **Documentation:** Create a README deployment guide for the user to set up Supabase and connect the Render service.
