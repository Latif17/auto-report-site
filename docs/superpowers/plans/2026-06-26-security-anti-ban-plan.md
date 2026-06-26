# Security & Anti-Ban Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Secure the backend with rate limits and duplicate checks, and upgrade the Puppeteer scraper with stealth features and randomized delays to evade GOV.UK bot detection.

**Architecture:** Use `express-rate-limit` for DDoS protection, exact-match DB queries for duplicate prevention, and `puppeteer-extra-plugin-stealth` with randomized delays for the scraper.

**Tech Stack:** Node.js, Express, Puppeteer Extra, Supabase (PostgreSQL)

## Global Constraints

- No structural changes to database schema required beyond what currently exists.
- Rate limits: 100/15min global, 3/15min strict mutation.
- Stealth delays: 1-3s in scraper, 5-15s between users.

---

### Task 1: Install Security Dependencies

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: none
- Produces: `package.json` with new dependencies

- [ ] **Step 1: Install npm packages**

```bash
npm install express-rate-limit helmet puppeteer-extra puppeteer-extra-plugin-stealth
```

- [ ] **Step 2: Verify installation**

Run: `grep '"express-rate-limit"' package.json`
Expected: Output showing the dependency installed.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add security and stealth dependencies"
```

### Task 2: Implement Global Security Headers & Limiter

**Files:**
- Modify: `server.js`

**Interfaces:**
- Consumes: Express app instance
- Produces: Protected Express app globally

- [ ] **Step 1: Import and configure helmet and global limiter**

```javascript
// At the top of server.js, after existing requires:
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// After app.use(cors());
app.use(helmet());

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window`
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

app.use(globalLimiter);
```

- [ ] **Step 2: Commit**

```bash
git add server.js
git commit -m "feat: add helmet and global rate limit"
```

### Task 3: Implement Strict Rate Limiter

**Files:**
- Modify: `server.js`

**Interfaces:**
- Consumes: Express app instance
- Produces: Strict rate limited mutation endpoints

- [ ] **Step 1: Configure strict limiter**

```javascript
// After globalLimiter definition:
const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3, // Limit each IP to 3 requests per `window` for sensitive endpoints
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many submissions. Please try again later.' }
});

// Apply to specific routes (modify existing route definitions)
// app.post('/api/opt-in', strictLimiter, async (req, res) => { ...
// app.post('/api/submit', strictLimiter, async (req, res) => { ...
// app.post('/api/join', strictLimiter, async (req, res) => { ...
```

- [ ] **Step 2: Apply to `/api/opt-in`**

```javascript
// Change: app.post('/api/opt-in', async (req, res) => {
app.post('/api/opt-in', strictLimiter, async (req, res) => {
```

- [ ] **Step 3: Apply to `/api/submit`**

```javascript
// Change: app.post('/api/submit', async (req, res) => {
app.post('/api/submit', strictLimiter, async (req, res) => {
```

- [ ] **Step 4: Apply to `/api/join`**

```javascript
// Change: app.post('/api/join', async (req, res) => {
app.post('/api/join', strictLimiter, async (req, res) => {
```

- [ ] **Step 5: Commit**

```bash
git add server.js
git commit -m "feat: add strict rate limiting for mutation endpoints"
```

### Task 4: Duplicate Event Prevention

**Files:**
- Modify: `server.js`

**Interfaces:**
- Consumes: Supabase database connection
- Produces: 400 Bad Request if duplicate found in `/api/submit`

- [ ] **Step 1: Add duplicate check logic to `/api/submit`**

```javascript
// Inside app.post('/api/submit', strictLimiter, async (req, res) => {
// Before: const { data: newIncident } = await supabase.from('incidents').insert(...

        // Check for duplicates
        const { data: existingIncidents } = await supabase.from('incidents')
            .select('id')
            .eq('date_of_smell', dateOfSmell)
            .eq('time_of_smell', timeOfSmell)
            .eq('business_location', businessLocation)
            .throwOnError();

        if (existingIncidents && existingIncidents.length > 0) {
            const incidentIds = existingIncidents.map(i => i.id);
            const { data: userLink } = await supabase.from('opted_in_user_reports')
                .select('id')
                .eq('user_email', email)
                .in('incident_id', incidentIds)
                .throwOnError();

            if (userLink && userLink.length > 0) {
                return res.status(400).json({ error: 'You have already submitted a report for this exact event.' });
            }
        }
```

- [ ] **Step 2: Commit**

```bash
git add server.js
git commit -m "feat: prevent duplicate submissions for the same event"
```

### Task 5: Scraper Stealth & Random In-Page Delays

**Files:**
- Modify: `scraper.js`

**Interfaces:**
- Consumes: Puppeteer Extra
- Produces: Stealth browser instance

- [ ] **Step 1: Replace puppeteer with puppeteer-extra**

```javascript
// Replace `const puppeteer = require('puppeteer');` with:
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const randomDelay = (min, max) => new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1) + min)));
```

- [ ] **Step 2: Add random delays to `goNext`**

```javascript
// Inside async function goNext(page) {
// Add a random delay before finding and clicking the button:
    await randomDelay(1000, 3000);
// (Keep existing navigation code)
```

- [ ] **Step 3: Commit**

```bash
git add scraper.js
git commit -m "feat: integrate puppeteer stealth plugin and randomized page delays"
```

### Task 6: Scraper Randomized User Processing Delays

**Files:**
- Modify: `run-scraper.js`

**Interfaces:**
- Consumes: Scraper execution loop
- Produces: Variable delay between users

- [ ] **Step 1: Implement random delay utility**

```javascript
// At the top of run-scraper.js
const randomDelay = (min, max) => new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1) + min)));
```

- [ ] **Step 2: Replace fixed 2-second delay**

```javascript
// Inside the for (const user of users) loop:
// Replace: await new Promise(r => setTimeout(r, 2000));
// With:
                    const delayMs = Math.floor(Math.random() * (15000 - 5000 + 1) + 5000);
                    console.log(`Waiting ${Math.round(delayMs/1000)}s before next submission...`);
                    await randomDelay(5000, 15000);
```

- [ ] **Step 3: Commit**

```bash
git add run-scraper.js
git commit -m "feat: add randomized delay between scraper submissions"
```
