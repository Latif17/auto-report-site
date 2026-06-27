# Form Filler Fixes & Docker Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the form filler backend to properly process unpooled users and automatically include pooled users, while adding a secure Dockerized worker deployment.

**Architecture:** Database schema will add a `pool_data` boolean. The backend will persist all users (pooled or not) to the `users` table so the scraper has access to them, and the scraper will dynamically fetch explicit incident joiners + pooled users. Unpooled users are deleted after successful form submission. The scraper is updated to support interval polling.

**Tech Stack:** Node.js, Express, Puppeteer, Supabase, Jest, Docker.

## Global Constraints
- Node version: ^18.x
- Puppeteer headless mode should run securely in Docker

---

### Task 1: Database Schema & Backend Update

**Files:**
- Modify: `schema.sql`
- Modify: `server.js`
- Modify: `tests/server.test.js`

**Interfaces:**
- Consumes: N/A
- Produces: API that saves `pool_data` boolean on `users` during `/api/submit` and `/api/join`.

- [ ] **Step 1: Update schema.sql**

```sql
-- In schema.sql, modify the users table block to:
CREATE TABLE users (
  email text PRIMARY KEY,
  full_name text,
  postcode text,
  phone text,
  address text,
  pool_data boolean DEFAULT false
);
```

- [ ] **Step 2: Update failing server.test.js**

Update `server.test.js` mock assertions to expect `pool_data` to be passed during the `users.upsert` call.

- [ ] **Step 3: Update server.js implementation**

In `server.js` within `/api/submit`, replace:
```javascript
        if (shareData) {
            insertPromises.push(supabase.from('users').upsert({ email, full_name: fullName, postcode, phone, address }).throwOnError());
        }
```
With:
```javascript
        insertPromises.push(supabase.from('users').upsert({ email, full_name: fullName, postcode, phone, address, pool_data: shareData || false }).throwOnError());
```

And inside `/api/join`, replace:
```javascript
            supabase.from('users').upsert({ email, full_name: fullName, postcode, phone, address }).throwOnError(),
```
With:
```javascript
            supabase.from('users').upsert({ email, full_name: fullName, postcode, phone, address, pool_data: true }).throwOnError(),
```

- [ ] **Step 4: Verify test suite passes**

Run: `npm test tests/server.test.js` (or `npx jest tests/server.test.js`)
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add schema.sql server.js tests/server.test.js
git commit -m "feat: add pool_data to users and update backend"
```

### Task 2: Update Scraper Fetch & Cleanup Logic

**Files:**
- Modify: `run-scraper.js`
- Modify: `tests/run-scraper.test.js`

**Interfaces:**
- Consumes: `users` table with `pool_data` flag.
- Produces: Correct subset of users to process and deletes unpooled users post-submission.

- [ ] **Step 1: Update run-scraper.test.js**

Add/update tests validating that `allUsers` includes both `opted_in` and `pool_data: true` users, and deletes `pool_data: false` users.

- [ ] **Step 2: Update fetch logic in run-scraper.js**

Replace the BATCH FETCH section with:
```javascript
    // --- BATCH FETCH DATA TO PREVENT N+1 QUERIES ---
    const incidentIds = pendingIncidents.map(i => i.id);
    const { data: allUserReports } = await supabase
        .from('opted_in_user_reports')
        .select('incident_id, user_email')
        .in('incident_id', incidentIds);

    const explicitEmails = (allUserReports || []).map(r => r.user_email);
    
    const { data: pooledUsersRecord } = await supabase
        .from('users')
        .select('email')
        .eq('pool_data', true);
        
    const pooledEmails = (pooledUsersRecord || []).map(u => u.email);
    
    const allEmails = [...new Set([...explicitEmails, ...pooledEmails])];
    
    const { data: allUsers } = allEmails.length > 0
        ? await supabase.from('users').select('*').in('email', allEmails)
        : { data: [] };

    const usersByEmail = (allUsers || []).reduce((acc, user) => { acc[user.email] = user; return acc; }, {});
    
    const emailsByIncidentId = {};
    for (const incident of pendingIncidents) {
        const explicitForIncident = (allUserReports || []).filter(r => r.incident_id === incident.id).map(r => r.user_email);
        emailsByIncidentId[incident.id] = [...new Set([...explicitForIncident, ...pooledEmails])];
    }
    // --- END BATCH FETCH ---
```

- [ ] **Step 3: Update cleanup logic in run-scraper.js**

At the end of processing an incident, before `Mark as completed`, add:
```javascript
        // Cleanup unpooled users
        const unpooledProcessed = users.filter(u => u.pool_data === false).map(u => u.email);
        if (unpooledProcessed.length > 0) {
            const { data: otherPending } = await supabase
                .from('opted_in_user_reports')
                .select('user_email, incidents!inner(status)')
                .in('user_email', unpooledProcessed)
                .eq('incidents.status', 'pending')
                .neq('incident_id', incident.id);
                
            const emailsWithOtherPending = new Set((otherPending || []).map(r => r.user_email));
            const emailsToDelete = unpooledProcessed.filter(e => !emailsWithOtherPending.has(e));
            
            if (emailsToDelete.length > 0) {
                console.log(`Deleting ${emailsToDelete.length} unpooled user records...`);
                await supabase.from('users').delete().in('email', emailsToDelete);
            }
        }
```

- [ ] **Step 4: Verify test suite passes**

Run: `npm test tests/run-scraper.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add run-scraper.js tests/run-scraper.test.js
git commit -m "feat: fetch pooled users and delete unpooled users post-submission"
```

### Task 3: Continuous Polling for Scraper

**Files:**
- Modify: `run-scraper.js`

- [ ] **Step 1: Implement daemon mode**

Rename `async function run()` to `async function processQueue()`.
At the bottom, implement the new `run` loop:
```javascript
async function run() {
    console.log("Starting scraper worker...");
    if (process.env.DAEMON_MODE === 'true') {
        console.log("Daemon mode active. Polling every 2 minutes.");
        while(true) {
            await processQueue();
            await new Promise(r => setTimeout(r, 120000));
        }
    } else {
        await processQueue();
    }
}

if (require.main === module) {
    run().catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { run, processQueue };
```

- [ ] **Step 2: Commit**

```bash
git add run-scraper.js
git commit -m "feat: add continuous polling loop for docker worker"
```

### Task 4: Frontend Wording

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Update wording**

Find:
```html
<span>Saves your details in your own browser so you don't have to re-type them next time. Your info stays on your device until you actively log a stink event.</span>
```
Replace with:
```html
<span>Saves your details in your own browser so you don't have to re-type them next time. When you log a stink event, your info is securely transmitted to our server temporarily to process the request, and is immediately deleted afterward.</span>
```

- [ ] **Step 2: Commit**

```bash
git add public/index.html
git commit -m "docs: update frontend privacy wording for local retention"
```

### Task 5: Docker Setup

**Files:**
- Create: `.dockerignore`
- Create: `Dockerfile`
- Create: `docker-compose.yml`

- [ ] **Step 1: Create .dockerignore**

```text
node_modules
.git
.env
tests
```

- [ ] **Step 2: Create Dockerfile**

```dockerfile
FROM ghcr.io/puppeteer/puppeteer:latest

USER root
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV DAEMON_MODE=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

CMD ["node", "run-scraper.js"]
```

- [ ] **Step 3: Create docker-compose.yml**

```yaml
version: '3.8'

services:
  scraper:
    build: .
    container_name: auto-report-scraper
    restart: always
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
```

- [ ] **Step 4: Commit**

```bash
git add .dockerignore Dockerfile docker-compose.yml
git commit -m "feat: add Docker and docker-compose configurations"
```
