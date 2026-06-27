# Folder Reorganization by Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the project files into separate, clean folders for Vercel, Supabase, and Homelab deployments, optimizing dependencies.

**Architecture:** Create three directories (`vercel/`, `supabase/`, `homelab/`), split code and dependencies using dedicated `package.json` files, update Dockerfile and import paths, and clean up the root repository.

**Tech Stack:** Node.js, Express, Puppeteer, Supabase, Jest, Docker.

## Global Constraints
- Node version: ^18.x
- No shared root node_modules or package.json files in the final state

---

### Task 1: Create Directories & Dependencies Configuration

**Files:**
- Create: `vercel/package.json`
- Create: `homelab/package.json`

**Interfaces:**
- Consumes: N/A
- Produces: Isolated dependencies folders and configurations

- [ ] **Step 1: Create vercel/package.json**

Create `vercel/package.json` with the following content:
```json
{
  "name": "auto-report-web",
  "version": "1.0.0",
  "private": true,
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "test": "jest tests/server.test.js --runInBand"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.108.2",
    "cors": "^2.8.6",
    "dotenv": "^17.4.2",
    "express": "^5.2.1",
    "express-rate-limit": "^8.5.2",
    "helmet": "^8.2.0"
  },
  "devDependencies": {
    "jest": "^30.4.2",
    "supertest": "^7.2.2"
  }
}
```

- [ ] **Step 2: Create homelab/package.json**

Create `homelab/package.json` with the following content:
```json
{
  "name": "auto-report-worker",
  "version": "1.0.0",
  "private": true,
  "main": "run-scraper.js",
  "scripts": {
    "start": "node run-scraper.js",
    "test": "jest tests/ --runInBand"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.108.2",
    "dotenv": "^17.4.2",
    "puppeteer": "^25.2.1",
    "puppeteer-extra": "^3.3.6",
    "puppeteer-extra-plugin-stealth": "^2.11.2"
  },
  "devDependencies": {
    "jest": "^30.4.2"
  }
}
```

- [ ] **Step 3: Verify package files**
Verify that both package.json files are correctly formatted and exist.

- [ ] **Step 4: Commit**
```bash
git add vercel/package.json homelab/package.json
git commit -m "feat: initialize package.json files for vercel and homelab"
```

---

### Task 2: Move Web Application to vercel/

**Files:**
- Create: `vercel/api/index.js`
- Create: `vercel/vercel.json`
- Modify: `vercel/server.js` (update static folder path if needed)
- Move: `server.js` -> `vercel/server.js`
- Move: `public/` -> `vercel/public/`
- Move: `tests/server.test.js` -> `vercel/tests/server.test.js`

**Interfaces:**
- Consumes: N/A
- Produces: Working Web API and frontend at `vercel/`

- [ ] **Step 1: Move existing web files**
Run shell commands:
```bash
mkdir -p vercel/tests vercel/api
cp server.js vercel/server.js
cp -r public vercel/
cp tests/server.test.js vercel/tests/server.test.js
```

- [ ] **Step 2: Create vercel/api/index.js**
Create `vercel/api/index.js` containing:
```javascript
module.exports = require('../server.js');
```

- [ ] **Step 3: Create vercel/vercel.json**
Create `vercel/vercel.json` containing:
```json
{
  "version": 2,
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.js" },
    { "source": "/style.css", "destination": "/public/style.css" },
    { "source": "/app.js", "destination": "/public/app.js" },
    { "source": "/((?!_vercel/).*)", "destination": "/public/index.html" }
  ]
}
```

- [ ] **Step 4: Update static path in vercel/server.js**
In `vercel/server.js`, find:
```javascript
app.use(express.static(path.join(__dirname, __dirname.endsWith('api') ? '../public' : 'public')));
```
Since the static folder is always inside the same directory under `public/`, modify this line to:
```javascript
app.use(express.static(path.join(__dirname, 'public')));
```

- [ ] **Step 5: Install dependencies and run tests**
Run:
```bash
cd vercel
npm install
npm test
cd ..
```
Expected: All 12 server tests PASS.

- [ ] **Step 6: Commit**
```bash
git add vercel/
git commit -m "feat: migrate web app and server backend to vercel/ directory"
```

---

### Task 3: Move Worker Application to homelab/

**Files:**
- Move: `run-scraper.js` -> `homelab/run-scraper.js`
- Move: `scraper.js` -> `homelab/scraper.js`
- Move: `utils.js` -> `homelab/utils.js`
- Move: `Dockerfile` -> `homelab/Dockerfile`
- Move: `docker-compose.yml` -> `homelab/docker-compose.yml`
- Move: `.dockerignore` -> `homelab/.dockerignore`
- Move: `tests/run-scraper.test.js` -> `homelab/tests/run-scraper.test.js`
- Move: `tests/scraper.test.js` -> `homelab/tests/scraper.test.js`

**Interfaces:**
- Consumes: N/A
- Produces: Working Scraper Daemon at `homelab/`

- [ ] **Step 1: Move existing worker files**
Run:
```bash
mkdir -p homelab/tests
cp run-scraper.js homelab/run-scraper.js
cp scraper.js homelab/scraper.js
cp utils.js homelab/utils.js
cp Dockerfile homelab/Dockerfile
cp docker-compose.yml homelab/docker-compose.yml
cp .dockerignore homelab/.dockerignore
cp tests/run-scraper.test.js homelab/tests/run-scraper.test.js
cp tests/scraper.test.js homelab/tests/scraper.test.js
```

- [ ] **Step 2: Update Dockerfile path imports**
In `homelab/Dockerfile`, the files are now in the root of the build context `homelab/`. The original `COPY` commands remain valid:
```dockerfile
COPY --chown=pptruser:pptruser package*.json ./
RUN npm ci
COPY --chown=pptruser:pptruser . .
```
Verify the Dockerfile looks correct.

- [ ] **Step 3: Install dependencies and run tests**
Run:
```bash
cd homelab
npm install
npm test
cd ..
```
Expected: All 17 scraper/runner tests PASS.

- [ ] **Step 4: Commit**
```bash
git add homelab/
git commit -m "feat: migrate scraper worker and docker setup to homelab/ directory"
```

---

### Task 4: Move Database Files & Clean Up Root

**Files:**
- Move: `schema.sql` -> `supabase/schema.sql`
- Move: `schema_update.sql` -> `supabase/schema_update.sql`
- Move: `schema_update_pool_data.sql` -> `supabase/schema_update_pool_data.sql`
- Delete: Root repository redundant files

**Interfaces:**
- Consumes: N/A
- Produces: Reorganized, clean project repository

- [ ] **Step 1: Move database SQL files**
Run:
```bash
mkdir -p supabase
cp schema.sql supabase/schema.sql
cp schema_update.sql supabase/schema_update.sql
cp schema_update_pool_data.sql supabase/schema_update_pool_data.sql
```

- [ ] **Step 2: Delete redundant root files**
Remove the old root files that were moved to subfolders:
```bash
rm server.js run-scraper.js scraper.js utils.js
rm schema.sql schema_update.sql schema_update_pool_data.sql
rm Dockerfile docker-compose.yml .dockerignore vercel.json
rm package.json package-lock.json
rm -rf api public tests node_modules
```

- [ ] **Step 3: Verify repository cleanliness**
Verify `git status` shows clean subdirectories and deleted root files.

- [ ] **Step 4: Commit**
```bash
git add supabase/
git add .
git commit -m "chore: clean up root files and complete directory reorganization"
```
