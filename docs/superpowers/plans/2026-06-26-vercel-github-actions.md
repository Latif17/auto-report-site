# Vercel & GitHub Actions Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate hosting architecture to Vercel (frontend/API) and GitHub Actions (background scraper), replacing Docker/Render.

**Architecture:** Vercel serverless for API/frontend with instant responses, Supabase for state management (adding 'status'), and scheduled GitHub Actions executing the heavy Puppeteer scraper script safely.

**Tech Stack:** Node.js, Express, Puppeteer, Supabase, Vercel, GitHub Actions.

## Global Constraints

- Puppeteer execution MUST be removed entirely from the Express API response cycle.
- GitHub Actions workflow MUST run on an ubuntu runner which supports Puppeteer.
- Vercel configuration must route API requests properly to `backend/server.js`.

---

### Task 1: Database Schema Updates

**Files:**
- Modify: `backend/schema.sql`

**Interfaces:**
- Consumes: N/A
- Produces: Updated SQL schema definition.

- [ ] **Step 1: Update schema.sql with status column**

Modify `backend/schema.sql` to add a `status` column to `incidents`.

```sql
-- Replace the incidents table creation with:
CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    time_of_smell TEXT NOT NULL,
    smell_type TEXT NOT NULL,
    business_location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

- [ ] **Step 2: Commit**

```bash
git add backend/schema.sql
git commit -m "chore: add status column to incidents schema"
```

---

### Task 2: Extract Background Scraper Script

**Files:**
- Create: `backend/run-scraper.js`

**Interfaces:**
- Consumes: Supabase connection and `submitGovForm` from `scraper.js`
- Produces: Standalone node script `run-scraper.js`

- [ ] **Step 1: Create the scraper script**

Create `backend/run-scraper.js`:

```javascript
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { submitGovForm } = require('./scraper');

const supabase = process.env.SUPABASE_URL 
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
    : null;

async function run() {
    if (!supabase) {
        console.error("Missing Supabase credentials.");
        process.exit(1);
    }

    console.log("Checking for pending incidents...");
    const { data: pendingIncidents, error: fetchError } = await supabase
        .from('incidents')
        .select('*')
        .eq('status', 'pending');

    if (fetchError) {
        console.error("Error fetching incidents:", fetchError);
        process.exit(1);
    }

    if (!pendingIncidents || pendingIncidents.length === 0) {
        console.log("No pending incidents found. Exiting.");
        process.exit(0);
    }

    for (const incident of pendingIncidents) {
        console.log(`Processing incident ${incident.id}...`);
        
        // Mark as processing
        await supabase.from('incidents').update({ status: 'processing' }).eq('id', incident.id);

        // Fetch all opted-in users for this incident
        const { data: userReports } = await supabase
            .from('opted_in_user_reports')
            .select('user_email')
            .eq('incident_id', incident.id);

        if (userReports && userReports.length > 0) {
            const emails = userReports.map(r => r.user_email);
            const { data: users } = await supabase.from('users').select('*').in('email', emails);

            if (users) {
                for (const user of users) {
                    const userData = {
                        email: user.email,
                        fullName: user.full_name,
                        postcode: user.postcode,
                        phone: user.phone,
                        address: user.address
                    };
                    const incidentData = {
                        timeOfSmell: incident.time_of_smell,
                        smellType: incident.smell_type,
                        businessLocation: incident.business_location
                    };
                    console.log(`Submitting report for ${userData.email}...`);
                    await submitGovForm(userData, incidentData);
                    // Add a small delay between submissions to avoid rate limits
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
        }

        // Mark as completed
        await supabase.from('incidents').update({ status: 'completed' }).eq('id', incident.id);
        console.log(`Finished processing incident ${incident.id}.`);
    }
}

run().catch(console.error);
```

- [ ] **Step 2: Commit**

```bash
git add backend/run-scraper.js
git commit -m "feat: extract puppeteer scraper into standalone script"
```

---

### Task 3: API Cleanup & Test Updates

**Files:**
- Modify: `backend/server.js`
- Modify: `backend/tests/server.test.js`

**Interfaces:**
- Consumes: Supabase `incidents` table with `status`
- Produces: Instant `/api/submit` response without Puppeteer overhead

- [ ] **Step 1: Update API in server.js**

In `backend/server.js`, remove the `const { submitGovForm } = require('./scraper');` line entirely.
Remove the `triggerMassReporting` function at the bottom.

Update the `/api/submit` endpoint to simply insert and link, but DO NOT call `submitGovForm`:

```javascript
app.post('/api/submit', async (req, res) => {
    const { email, fullName, postcode, phone, address, timeOfSmell, smellType, businessLocation, shareData } = req.body;
    
    try {
        await supabase.from('system_stats').update({ last_report_time: new Date().toISOString() }).eq('id', 1).throwOnError();

        // Check for existing pending or processing incident in last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        let { data: existingIncidents } = await supabase.from('incidents')
            .select('id')
            .eq('time_of_smell', timeOfSmell)
            .eq('smell_type', smellType)
            .eq('business_location', businessLocation)
            .gte('created_at', oneHourAgo)
            .throwOnError();

        let incidentId;
        if (existingIncidents && existingIncidents.length > 0) {
            incidentId = existingIncidents[0].id;
        } else {
            const { data: newIncident } = await supabase.from('incidents')
                .insert({ time_of_smell: timeOfSmell, smell_type: smellType, business_location: businessLocation, status: 'pending' })
                .select()
                .single()
                .throwOnError();
            incidentId = newIncident.id;
        }

        if (shareData) {
            await supabase.from('users').upsert({ email, full_name: fullName, postcode, phone, address }).throwOnError();
            const { error } = await supabase.from('opted_in_user_reports').insert({ incident_id: incidentId, user_email: email });
            if (error && error.code !== '23505') throw error;
        } else {
            // Even if they don't share data with community, we still track they reported it so the script runs for them
            const { error } = await supabase.from('opted_in_user_reports').insert({ incident_id: incidentId, user_email: email });
            if (error && error.code !== '23505') throw error;
        }

        res.json({ success: true, message: "Report triggered", incidentId });

    } catch (error) {
        console.error('Submit error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
```

- [ ] **Step 2: Update tests in server.test.js**

In `backend/tests/server.test.js`, remove all references to `scraper` and `jest.mock('./scraper')`.
Remove the `expect(scraper.submitGovForm).toHaveBeenCalledTimes(1);` checks.
Update the tests to simply expect the 200 response:

```javascript
    it('POST /api/submit handles shareData correctly and returns success', async () => {
        const res = await request(app)
            .post('/api/submit')
            .send({ 
                email: 'test@example.com', 
                fullName: 'Test User', 
                shareData: true,
                timeOfSmell: '12:00',
                smellType: 'Waste',
                businessLocation: 'ReFoods'
            });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toMatchObject({ success: true, message: "Report triggered" });
    });
```
(Apply similarly to the `shareData: false` test).

- [ ] **Step 3: Run Tests**

Run `cd backend && npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/server.js backend/tests/server.test.js
git commit -m "refactor: remove puppeteer execution from API cycle"
```

---

### Task 4: Infrastructure Transition (GitHub Actions & Vercel)

**Files:**
- Create: `.github/workflows/scraper.yml`
- Create: `vercel.json`
- Delete: `render.yaml`, `backend/Dockerfile`, `backend/.dockerignore`
- Modify: `README.md`

**Interfaces:**
- Consumes: `backend/run-scraper.js`
- Produces: Scheduled workflow and Vercel routing configuration.

- [ ] **Step 1: Create GitHub Action**

Create `.github/workflows/scraper.yml`:

```yaml
name: Background Scraper

on:
  schedule:
    - cron: '*/5 * * * *'
  workflow_dispatch:

jobs:
  run-scraper:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install Dependencies
        run: |
          cd backend
          npm ci --omit=dev
      - name: Run Scraper
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
        run: |
          cd backend
          node run-scraper.js
```

- [ ] **Step 2: Create vercel.json**

Create `vercel.json` in the root:

```json
{
  "version": 2,
  "builds": [
    { "src": "backend/server.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/backend/server.js" },
    { "src": "/(.*)", "dest": "/backend/public/$1" }
  ]
}
```

- [ ] **Step 3: Remove obsolete Docker/Render files**

```bash
rm render.yaml backend/Dockerfile backend/.dockerignore
```

- [ ] **Step 4: Update README.md**

Modify `README.md` to remove Docker/Render instructions and describe the Vercel/GitHub setup:

```markdown
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

2. **Vercel Deployment (Frontend & API):**
   - Import the repository in Vercel.
   - Vercel will automatically use `vercel.json` to deploy the API and frontend.
   - Set the `SUPABASE_URL` and `SUPABASE_KEY` environment variables.

3. **GitHub Actions (Scraper Worker):**
   - Go to your GitHub repository settings > Secrets and variables > Actions.
   - Add `SUPABASE_URL` and `SUPABASE_KEY` as repository secrets.
   - The `.github/workflows/scraper.yml` will automatically run every 5 minutes to submit pending reports.
```

- [ ] **Step 5: Commit**

```bash
git add .github vercel.json README.md
git rm render.yaml backend/Dockerfile backend/.dockerignore
git commit -m "build: migrate hosting to vercel and github actions"
```
