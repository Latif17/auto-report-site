# Auto Report Site - Form Filler & Architecture Design

## 1. Context & Goals
The project automates submissions to a GOV.uk form for environmental issues. The current backend logic has a critical flaw: users who submit a single report (unpooled) are not saved to the `users` table, causing the scraper to skip them. Furthermore, users who opted to pool data are not automatically included in new incidents. 

The goal of this design is to:
1. Ensure both pooled and unpooled users have their forms successfully submitted.
2. Respect privacy by deleting unpooled user data after submission.
3. Automatically pull pooled users into community incidents.
4. Establish a reliable, secure Docker architecture for the `run-scraper.js` worker on a Proxmox home server.

## 2. Database Schema Changes
- **`users` table update:** Add a `pool_data` boolean column (default `false`).
  ```sql
  ALTER TABLE users ADD COLUMN pool_data BOOLEAN DEFAULT false;
  ```

## 3. Backend Implementation (`server.js`)
- The `/api/submit` and `/api/join` endpoints will be updated to always upsert the user's personal details into the `users` table, regardless of their sharing preference.
- The `shareData` preference from the frontend payload will be mapped to the new `pool_data` column.
- This ensures the background scraper always has access to the PII required to fill out the form.

## 4. Scraper Worker Updates (`run-scraper.js`)
### 4.1. Fetching Users for an Incident
For each pending incident, the scraper will query:
1. **Explicit Users:** Emails from `opted_in_user_reports` matching the `incidentId`.
2. **Pooled Users:** All emails from the `users` table where `pool_data = true`.

The scraper will merge these lists, remove any duplicates, and retrieve the full user records from the `users` table for submission.

### 4.2. Privacy Cleanup (Deletion Logic)
After the loop finishes processing submissions for an incident:
- Identify all processed users who have `pool_data = false`.
- Check the `opted_in_user_reports` joined with `incidents` to ensure these users are not attached to any other `status = 'pending'` incidents.
- For users safe to remove, execute a `DELETE` from the `users` table.

### 4.3. Continuous Polling
- Implement an interval loop (e.g., every 2 minutes) inside the worker to continuously check for pending incidents, effectively making it a daemon process suitable for Docker.

## 5. Frontend Wording Updates (`public/index.html`)
- **"Retain locally" description:** Update to clarify that data is temporarily sent to the server for processing: 
  > *"Saves your details in your own browser so you don't have to re-type them next time. When you log a stink event, your info is securely transmitted to our server temporarily to process the request, and is immediately deleted afterward."*

## 6. Docker Architecture (Proxmox Deployment)
- **`Dockerfile`:** Use a Node image with necessary Chromium dependencies installed (e.g., `ghcr.io/puppeteer/puppeteer:latest`). Set the working directory, install dependencies via `npm ci`, and start the worker.
- **`docker-compose.yml`:** Provide a template containing the necessary environment variables (`SUPABASE_URL`, `SUPABASE_KEY`) and pointing to the `Dockerfile`.
- **Environment Handling:** Ensure the container suppresses any unnecessary browser UI (running fully headless) and has the correct `PUPPETEER_EXECUTABLE_PATH` for the Docker environment.

## 7. Cleanup Tasks
- Modify `.gitignore` and add `.dockerignore` to prevent unnecessary files (like `node_modules`) from bloating the image.
- Review `package.json` to ensure a clean split between server dependencies and worker dependencies where applicable, though standardizing on a single `npm install` for Docker is fine.
