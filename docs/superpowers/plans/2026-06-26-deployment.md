# Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Auto Report Site production-ready and deploy it for free using a unified Render web service and Supabase for the database.

**Architecture:** An Express backend serving static HTML/JS/CSS files. Containerized with Docker to include Puppeteer dependencies. Deployed to Render via `render.yaml`. Database hosted on Supabase.

**Tech Stack:** Node.js, Express, Puppeteer, Docker, Render, Supabase.

## Global Constraints

- Backend must connect to Supabase via `SUPABASE_URL` and `SUPABASE_KEY` env vars.
- Puppeteer must run correctly in the deployment environment (Docker).
- The repo must contain a `render.yaml` file for IaC.

---

### Task 1: Restructure Repository & Serve Static Files

**Files:**
- Move: `index.html` -> `backend/public/index.html`
- Move: `app.js` -> `backend/public/app.js`
- Move: `style.css` -> `backend/public/style.css`
- Modify: `backend/server.js`

**Interfaces:**
- Consumes: N/A
- Produces: A unified web server that serves both the API and the frontend.

- [ ] **Step 1: Create public directory and move files**

```bash
mkdir -p backend/public
mv index.html backend/public/
mv app.js backend/public/
mv style.css backend/public/
```

- [ ] **Step 2: Update server.js to serve static files**

In `backend/server.js`, add static serving middleware just before the API routes (or right after the CORS configuration):

```javascript
const path = require('path');

// ... other middleware ...
app.use(express.static(path.join(__dirname, 'public')));
```

- [ ] **Step 3: Test server serves index.html**

Run: `node backend/server.js` in one terminal.
Run: `curl -I http://localhost:3000/index.html` in another terminal.
Expected: HTTP 200 OK.

- [ ] **Step 4: Commit**

```bash
git add backend/public backend/server.js index.html app.js style.css
git commit -m "chore: move frontend files to backend public dir and serve static"
```

### Task 2: Dockerize Backend

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`

**Interfaces:**
- Consumes: `backend/server.js`, `backend/package.json`
- Produces: Docker image for deployment.

- [ ] **Step 1: Create .dockerignore**

Create `backend/.dockerignore`:
```text
node_modules
.env
tests
```

- [ ] **Step 2: Create Dockerfile**

Create `backend/Dockerfile`:
```dockerfile
FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /home/pptruser/app

COPY --chown=pptruser:pptruser package*.json ./
RUN npm ci

COPY --chown=pptruser:pptruser . .

EXPOSE 3000

CMD ["node", "server.js"]
```

- [ ] **Step 3: Test docker build**

Run: `cd backend && docker build -t auto-report-site . && cd ..`
Expected: Successfully built image.

- [ ] **Step 4: Commit**

```bash
git add backend/Dockerfile backend/.dockerignore
git commit -m "build: add Dockerfile and .dockerignore for Render deployment"
```

### Task 3: Render Configuration

**Files:**
- Create: `render.yaml`

**Interfaces:**
- Consumes: Dockerfile path
- Produces: IaC config for Render

- [ ] **Step 1: Create render.yaml**

Create `render.yaml` at the root of the repo:
```yaml
services:
  - type: web
    name: auto-report-site
    env: docker
    dockerfilePath: ./backend/Dockerfile
    dockerContext: ./backend
    envVars:
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_KEY
        sync: false
```

- [ ] **Step 2: Commit**

```bash
git add render.yaml
git commit -m "build: add render.yaml for automated deployment"
```

### Task 4: Documentation Update

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: Render config, Supabase schema
- Produces: End-user deployment instructions

- [ ] **Step 1: Update README.md**

Append the following section to `README.md` (create the file if it doesn't exist):

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add deployment instructions to README"
```
