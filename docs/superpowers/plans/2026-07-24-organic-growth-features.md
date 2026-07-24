# Organic Growth Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add zero-ongoing-effort organic growth surfaces to the report-a-smell web app: SEO metadata, an informational landing page, a native share button after submitting, and a socially-shareable dashboard — per `docs/superpowers/specs/2026-07-24-organic-growth-features-design.md`.

**Architecture:** All changes are additive to the existing `vercel/` Express + static-HTML app. No new dependencies, no database schema changes, no new routes beyond one (`GET /dashboard.html`) needed to server-render live stats into a meta tag for social crawlers that don't execute JS.

**Tech Stack:** Plain HTML/CSS/vanilla JS (existing `vercel/public/*.html`, `app.js`), Express (`vercel/server.js`), Jest + Supertest (existing test setup).

## Global Constraints

- Node >=18, no new npm dependencies required for any task in this plan.
- `vercel/public/` is served via `express.static` registered at `vercel/server.js:45`, with no templating engine. Any route that needs to intercept a specific static path (Task 5) MUST be registered *before* that line, or `express.static` will serve the raw file first and the route will never run.
- `npm test` in `vercel/` only runs `tests/server.test.js` and `tests/pii-allowlist.test.js` (see `vercel/package.json`'s `test` script). This is an existing, deliberate convention — `tests/frontend.test.js` is already excluded from the default script. Do **not** add `tests/frontend.test.js` to the `test` script; run it explicitly with `npx jest tests/frontend.test.js` as noted in each task below.
- `vercel/tests/pii-allowlist.test.js` enforces a deny-by-default allowlist, but it only walks JSON responses from `/api/*` endpoints. The new `GET /dashboard.html` route in Task 5 serves HTML, not JSON, so it is out of scope for that test file — but it must still never expose PII (it only ever handles aggregate counts, no per-user data).
- `og-image.png` (recommend 1200×630) and `demo-clip.mp4` are real media assets that do not exist in `vercel/public/` yet and are **not** created by this plan — the maintainer supplies them afterward (the demo clip is a screen recording of the live form, per the design spec). Code must reference fixed paths (`/og-image.png`, `/demo-clip.mp4`) and must not error or break page rendering if those files are temporarily absent (a broken image icon / non-functional video embed is an acceptable, non-blocking degrade).
- Before finishing, update `vercel/public/changelog.json` per project convention (Task 6) — this is a MINOR version bump (new features).

---

### Task 1: SEO & Open Graph metadata on the homepage

**Files:**
- Modify: `vercel/public/index.html:6-7`
- Test: `vercel/tests/frontend.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing consumed by later tasks (self-contained).

- [ ] **Step 1: Write the failing test**

Add this describe block to `vercel/tests/frontend.test.js` (it already has a top-level `htmlContent` loaded from `index.html` in `beforeAll` — reuse it, don't reload the file):

```js
describe('index.html SEO & Open Graph metadata', () => {
    it('has a search-friendly title and description', () => {
        expect(htmlContent).toContain('<title>Report the Barking Riverside Smell | Stink Log</title>');
        expect(htmlContent).toContain('<meta name="description" content="Report the recurring industrial smell in Barking Riverside, London. Log an incident in under a minute and we\'ll submit it to GOV.UK on your behalf.">');
    });

    it('has Open Graph tags for social link previews', () => {
        expect(htmlContent).toContain('<meta property="og:type" content="website">');
        expect(htmlContent).toContain('<meta property="og:title" content="Report the Barking Riverside Smell">');
        expect(htmlContent).toContain('<meta property="og:description" content="Log the recurring industrial smell in Barking Riverside — takes under a minute, submitted to GOV.UK for you.">');
        expect(htmlContent).toContain('<meta property="og:url" content="https://barking-riverside-report-smell.vercel.app/">');
        expect(htmlContent).toContain('<meta property="og:image" content="https://barking-riverside-report-smell.vercel.app/og-image.png">');
    });

    it('has Twitter Card tags', () => {
        expect(htmlContent).toContain('<meta name="twitter:card" content="summary_large_image">');
        expect(htmlContent).toContain('<meta name="twitter:title" content="Report the Barking Riverside Smell">');
        expect(htmlContent).toContain('<meta name="twitter:image" content="https://barking-riverside-report-smell.vercel.app/og-image.png">');
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest tests/frontend.test.js -t "SEO & Open Graph metadata"`
Expected: FAIL — none of the new tags exist yet.

- [ ] **Step 3: Implement**

In `vercel/public/index.html`, replace:

```html
    <meta name="description" content="Log the industrial smell in Barking Riverside. Save your details locally to easily report environmental issues with one click.">
    <title>Stink Log | Barking Stink</title>
```

with:

```html
    <meta name="description" content="Report the recurring industrial smell in Barking Riverside, London. Log an incident in under a minute and we'll submit it to GOV.UK on your behalf.">
    <title>Report the Barking Riverside Smell | Stink Log</title>
    <meta property="og:type" content="website">
    <meta property="og:title" content="Report the Barking Riverside Smell">
    <meta property="og:description" content="Log the recurring industrial smell in Barking Riverside — takes under a minute, submitted to GOV.UK for you.">
    <meta property="og:url" content="https://barking-riverside-report-smell.vercel.app/">
    <meta property="og:image" content="https://barking-riverside-report-smell.vercel.app/og-image.png">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Report the Barking Riverside Smell">
    <meta name="twitter:description" content="Log the recurring industrial smell in Barking Riverside — takes under a minute, submitted to GOV.UK for you.">
    <meta name="twitter:image" content="https://barking-riverside-report-smell.vercel.app/og-image.png">
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest tests/frontend.test.js -t "SEO & Open Graph metadata"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add vercel/public/index.html vercel/tests/frontend.test.js
git commit -m "feat: add SEO and Open Graph metadata to homepage"
```

---

### Task 2: "Why Does It Smell?" info page + nav link

**Files:**
- Create: `vercel/public/about-the-smell.html`
- Modify: `vercel/public/nav.js`
- Test: `vercel/tests/frontend.test.js`

**Interfaces:**
- Consumes: `.dossier-container`, `.dossier-header`, `.primary-action-section`, `.reading-content` CSS classes already defined in `vercel/public/style.css` (used identically by `vercel/public/promise.html`).
- Produces: nothing consumed by later tasks (self-contained).

- [ ] **Step 1: Write the failing test**

Add to `vercel/tests/frontend.test.js`:

```js
describe('about-the-smell.html info page', () => {
    const aboutPath = path.join(__dirname, '../public/about-the-smell.html');
    const navPath = path.join(__dirname, '../public/nav.js');
    let aboutContent;
    let navContent;

    beforeAll(() => {
        aboutContent = fs.readFileSync(aboutPath, 'utf8');
        navContent = fs.readFileSync(navPath, 'utf8');
    });

    it('explains the backstory and names the suspected culprits', () => {
        expect(aboutContent).toContain('Barking Riverside');
        expect(aboutContent).toContain('ReFoods UK');
        expect(aboutContent).toContain('East London BioGas');
        expect(aboutContent).toContain('Veolia');
    });

    it('embeds the demo clip and links back to the report form', () => {
        expect(aboutContent).toContain('<source src="/demo-clip.mp4" type="video/mp4">');
        expect(aboutContent).toContain('href="/"');
    });

    it('has Open Graph and Twitter Card tags', () => {
        expect(aboutContent).toContain('<meta property="og:type" content="website">');
        expect(aboutContent).toContain('<meta property="og:title" content="Why Does Barking Riverside Smell?">');
        expect(aboutContent).toContain('<meta property="og:description" content="The 20-year history, the suspected industrial culprits, and how residents are reporting it.">');
        expect(aboutContent).toContain('<meta property="og:url" content="https://barking-riverside-report-smell.vercel.app/about-the-smell.html">');
        expect(aboutContent).toContain('<meta property="og:image" content="https://barking-riverside-report-smell.vercel.app/og-image.png">');
        expect(aboutContent).toContain('<meta name="twitter:card" content="summary_large_image">');
    });

    it('is linked from the navigation menu', () => {
        expect(navContent).toContain('<a href="/about-the-smell.html">Why Does It Smell?</a>');
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest tests/frontend.test.js -t "about-the-smell.html info page"`
Expected: FAIL — `about-the-smell.html` doesn't exist, `fs.readFileSync` throws ENOENT.

- [ ] **Step 3: Implement — create the page**

Create `vercel/public/about-the-smell.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Why Barking Riverside smells: the suspected industrial culprits, the 20-year history, and how residents are reporting it.">
    <title>Why Does Barking Riverside Smell? | Stink Log</title>
    <meta property="og:type" content="website">
    <meta property="og:title" content="Why Does Barking Riverside Smell?">
    <meta property="og:description" content="The 20-year history, the suspected industrial culprits, and how residents are reporting it.">
    <meta property="og:url" content="https://barking-riverside-report-smell.vercel.app/about-the-smell.html">
    <meta property="og:image" content="https://barking-riverside-report-smell.vercel.app/og-image.png">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Why Does Barking Riverside Smell?">
    <meta name="twitter:image" content="https://barking-riverside-report-smell.vercel.app/og-image.png">
    <link rel="stylesheet" href="style.css">
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
</head>
<body>
    <div class="dossier-container">
        <header class="dossier-header">
            <div class="header-top">
                <span class="classification" id="version-display">STINK LOG // v1.1.0</span>
                <span class="case-number">CASE: BARKING-RIVERSIDE</span>
            </div>
            <h1>Why Does Barking Riverside Smell?</h1>
        </header>

        <main>
            <p class="subject" style="margin-bottom: 1.5rem;">A 20-year problem, and why we built a tool to fight it.</p>
            <div class="primary-action-section reading-content">
                <h3>The Problem</h3>
                <p>For over 20 years, the Barking area has been plagued by a severe and persistent stench. Residents in the newly developed Barking Riverside — located just a mile from the suspected source — frequently suffer from foul, toxic smells drifting into their homes, often overnight. It's forced people to keep windows shut, buy air purifiers, and avoid going outside when the smell is bad.</p>

                <h3>The Suspected Culprits</h3>
                <p>The main culprits are believed to be businesses operating in the London Sustainable Industries Park off Choats Road, particularly:</p>
                <ul>
                    <li><strong>ReFoods UK</strong> (Dagenham)</li>
                    <li><strong>East London BioGas</strong></li>
                    <li><strong>Veolia</strong> (Dagenham)</li>
                </ul>
                <p>The issue has been reported to Barking Riverside London and Bellway with no resolution.</p>

                <h3>See How Fast Reporting Actually Is</h3>
                <p>The official government form is 19 pages long. This tool fills it out and submits it for you. Here's a real submission, timed:</p>
                <video controls preload="none" style="width:100%; max-width:600px; display:block; margin: 1rem auto;">
                    <source src="/demo-clip.mp4" type="video/mp4">
                    Your browser doesn't support embedded video — <a href="/demo-clip.mp4">watch the clip here</a> instead.
                </video>

                <h3>Report It Yourself</h3>
                <p>Logging a smell takes under a minute. We handle the official 19-page GOV.UK submission for you.</p>
                <a href="/" class="btn btn-submit" style="display: inline-block; text-decoration: none; text-align: center; width: auto; padding: 0.85rem 1.5rem;">Log a Report →</a>
            </div>
        </main>

    </div>
    <script defer src="/nav.js"></script>
</body>
</html>
```

- [ ] **Step 4: Implement — link it from the nav menu**

In `vercel/public/nav.js`, in the `navHTML` template literal, replace:

```js
                <nav class="fab-menu-links">
                    <a href="https://github.com/Latif17/auto-report-site" target="_blank" rel="noopener noreferrer">View Source on GitHub</a>
```

with:

```js
                <nav class="fab-menu-links">
                    <a href="/about-the-smell.html">Why Does It Smell?</a>
                    <a href="https://github.com/Latif17/auto-report-site" target="_blank" rel="noopener noreferrer">View Source on GitHub</a>
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest tests/frontend.test.js -t "about-the-smell.html info page"`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add vercel/public/about-the-smell.html vercel/public/nav.js vercel/tests/frontend.test.js
git commit -m "feat: add why-does-it-smell info page with nav link"
```

---

### Task 3: Dashboard static SEO/OG tags + live-stats placeholder

**Files:**
- Modify: `vercel/public/dashboard.html:1-10`
- Test: `vercel/tests/frontend.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: the literal token `__OG_STATS_PLACEHOLDER__`, which must appear exactly once, inside the `content` attribute of the `og:description` meta tag. Task 5's server route replaces this exact string — do not add surrounding punctuation inside the token itself.

- [ ] **Step 1: Write the failing test**

Add to `vercel/tests/frontend.test.js`:

```js
describe('dashboard.html SEO & Open Graph metadata', () => {
    const dashboardPath = path.join(__dirname, '../public/dashboard.html');
    let dashboardContent;

    beforeAll(() => {
        dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
    });

    it('has a search-friendly title and description', () => {
        expect(dashboardContent).toContain('<title>Barking Riverside Smell Reports — Live Stats | Stink Log</title>');
        expect(dashboardContent).toContain('<meta name="description" content="Live count of industrial smell reports logged and submitted to GOV.UK by Barking Riverside residents.">');
    });

    it('has Open Graph tags including a live-stats placeholder for og:description', () => {
        expect(dashboardContent).toContain('<meta property="og:type" content="website">');
        expect(dashboardContent).toContain('<meta property="og:title" content="Barking Riverside Smell Reports — Live Stats">');
        expect(dashboardContent).toContain('<meta property="og:description" content="__OG_STATS_PLACEHOLDER__">');
        expect(dashboardContent).toContain('<meta property="og:url" content="https://barking-riverside-report-smell.vercel.app/dashboard.html">');
        expect(dashboardContent).toContain('<meta property="og:image" content="https://barking-riverside-report-smell.vercel.app/og-image.png">');
    });

    it('has a Twitter Card', () => {
        expect(dashboardContent).toContain('<meta name="twitter:card" content="summary_large_image">');
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest tests/frontend.test.js -t "dashboard.html SEO & Open Graph metadata"`
Expected: FAIL — none of these tags exist yet.

- [ ] **Step 3: Implement**

In `vercel/public/dashboard.html`, replace:

```html
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Platform Impact - Auto Report</title>
```

with:

```html
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Live count of industrial smell reports logged and submitted to GOV.UK by Barking Riverside residents.">
    <title>Barking Riverside Smell Reports — Live Stats | Stink Log</title>
    <meta property="og:type" content="website">
    <meta property="og:title" content="Barking Riverside Smell Reports — Live Stats">
    <meta property="og:description" content="__OG_STATS_PLACEHOLDER__">
    <meta property="og:url" content="https://barking-riverside-report-smell.vercel.app/dashboard.html">
    <meta property="og:image" content="https://barking-riverside-report-smell.vercel.app/og-image.png">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Barking Riverside Smell Reports — Live Stats">
    <meta name="twitter:image" content="https://barking-riverside-report-smell.vercel.app/og-image.png">
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest tests/frontend.test.js -t "dashboard.html SEO & Open Graph metadata"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add vercel/public/dashboard.html vercel/tests/frontend.test.js
git commit -m "feat: add dashboard SEO/OG metadata with live-stats placeholder"
```

---

### Task 4: "Share with a neighbour" button after a successful report

**Files:**
- Modify: `vercel/public/index.html` (button markup after the `#status-message` div)
- Modify: `vercel/public/app.js` (share logic + wiring into both success paths)
- Test: `vercel/tests/frontend.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing consumed by later tasks (self-contained). Note for maintainers: this task adds a pure, top-level `buildShareMessage(origin)` function to `app.js` (defined *outside* the `DOMContentLoaded` closure, at the very top of the file) specifically so it stays testable by string-mirroring, consistent with how `mapSmellSelection` is tested elsewhere in this codebase (see `vercel/tests/frontend.test.js`'s existing `app.js mapping logic` block).

- [ ] **Step 1: Write the failing test**

Add to `vercel/tests/frontend.test.js`:

```js
describe('Share with a neighbour button', () => {
    it('index.html contains a hidden share button after the status message', () => {
        expect(htmlContent).toContain('<div id="status-message" class="status-message hidden"></div>');
        expect(htmlContent).toContain('<button type="button" id="share-btn" class="btn btn-secondary hidden"');
    });

    it('app.js wires navigator.share with a clipboard fallback', () => {
        expect(appJsContent).toContain('navigator.share(');
        expect(appJsContent).toContain('navigator.clipboard.writeText(');
        expect(appJsContent).toContain("getElementById('share-btn')");
    });

    function buildShareMessage(origin) {
        // Mirrors the pure function added to app.js for unit testing
        return {
            title: 'Stink Log — Barking Riverside',
            text: "I just reported the smell in Barking Riverside — if you've smelt it too, you can log it here in under a minute:",
            url: origin + '/'
        };
    }

    it('buildShareMessage produces the expected share payload', () => {
        const result = buildShareMessage('https://barking-riverside-report-smell.vercel.app');
        expect(result).toEqual({
            title: 'Stink Log — Barking Riverside',
            text: "I just reported the smell in Barking Riverside — if you've smelt it too, you can log it here in under a minute:",
            url: 'https://barking-riverside-report-smell.vercel.app/'
        });
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest tests/frontend.test.js -t "Share with a neighbour button"`
Expected: FAIL — button markup and `navigator.share` wiring don't exist yet (the last sub-test, which only checks a locally mirrored function, will pass trivially — that's expected and matches the existing `mapSmellSelection` test pattern; the first two sub-tests are the ones proving the feature is missing).

- [ ] **Step 3: Implement — add the button markup**

In `vercel/public/index.html`, replace:

```html
                <div id="status-message" class="status-message hidden"></div>
```

with:

```html
                <div id="status-message" class="status-message hidden"></div>
                <button type="button" id="share-btn" class="btn btn-secondary hidden" style="margin-top: 0.75rem;">Share with a neighbour</button>
```

- [ ] **Step 4: Implement — add share logic to app.js**

At the very top of `vercel/public/app.js` (before the existing `document.addEventListener('DOMContentLoaded', ...)` line), add:

```js
function buildShareMessage(origin) {
    return {
        title: 'Stink Log — Barking Riverside',
        text: "I just reported the smell in Barking Riverside — if you've smelt it too, you can log it here in under a minute:",
        url: origin + '/'
    };
}

```

Inside the `DOMContentLoaded` closure, near the other `getElementById` declarations at the top (right after `const statusMessage = document.getElementById('status-message');`), add:

```js
    const shareBtn = document.getElementById('share-btn');

    function showShareButton() {
        shareBtn.classList.remove('hidden');
    }

    function hideShareButton() {
        shareBtn.classList.add('hidden');
        shareBtn.textContent = 'Share with a neighbour';
    }

    async function shareWithNeighbour() {
        const shareData = buildShareMessage(window.location.origin);
        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (e) {
                // User dismissed the native share sheet — no action needed.
            }
        } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
            shareBtn.textContent = 'Link copied!';
            setTimeout(() => { shareBtn.textContent = 'Share with a neighbour'; }, 2000);
        }
    }

    shareBtn.addEventListener('click', shareWithNeighbour);
```

Then wire it into both reset points and both success points:

1. Replace (main form submit — reset at start):
```js
        submitBtn.classList.add('loading');
        statusMessage.classList.add('hidden');
        statusMessage.className = 'status-message'; // Reset classes
```
with:
```js
        submitBtn.classList.add('loading');
        statusMessage.classList.add('hidden');
        statusMessage.className = 'status-message'; // Reset classes
        hideShareButton();
```

2. Replace (main form submit — success):
```js
            statusMessage.classList.add('success');
            statusMessage.classList.remove('hidden');

        } catch (error) {
```
with:
```js
            statusMessage.classList.add('success');
            statusMessage.classList.remove('hidden');
            showShareButton();

        } catch (error) {
```

3. Replace (auto-join — reset at start):
```js
            submitBtn.classList.add('loading');
            statusMessage.classList.add('hidden');
            statusMessage.className = 'status-message'; // Reset classes
            try {
                // Handle Local Storage retention/removal
```
with:
```js
            submitBtn.classList.add('loading');
            statusMessage.classList.add('hidden');
            statusMessage.className = 'status-message'; // Reset classes
            hideShareButton();
            try {
                // Handle Local Storage retention/removal
```

4. Replace (auto-join — success):
```js
                statusMessage.textContent = 'Successfully joined the report. Your details have been added.';
                statusMessage.className = 'status-message success';
                statusMessage.classList.remove('hidden');

                // Clear join states
```
with:
```js
                statusMessage.textContent = 'Successfully joined the report. Your details have been added.';
                statusMessage.className = 'status-message success';
                statusMessage.classList.remove('hidden');
                showShareButton();

                // Clear join states
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest tests/frontend.test.js -t "Share with a neighbour button"`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add vercel/public/index.html vercel/public/app.js vercel/tests/frontend.test.js
git commit -m "feat: add share-with-a-neighbour button after successful report"
```

---

### Task 5: Server-rendered live stats in dashboard's og:description

**Files:**
- Modify: `vercel/server.js` (add `fs` require, add `getDashboardStats()` helper, refactor `/api/dashboard-stats` to use it, add new `GET /dashboard.html` route)
- Test: `vercel/tests/server.test.js`

**Interfaces:**
- Consumes: the `__OG_STATS_PLACEHOLDER__` token produced in Task 3's `vercel/public/dashboard.html`.
- Produces: `async function getDashboardStats()` returning `{ usersCount: number, incidentsCount: number, formsCount: number }`.

- [ ] **Step 1: Write the failing test**

Add to `vercel/tests/server.test.js` (add `const fs = require('fs'); const path = require('path');` near its existing top-level requires if not already present):

```js
describe('GET /dashboard.html (server-rendered live stats)', () => {
    it('serves HTML with the mock stats injected into og:description', async () => {
        const res = await request(app).get('/dashboard.html');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/html/);
        // Mock supabase client returns users: 42, incidents: 1, opted_in_user_reports: 0 for a head-count '*' select.
        expect(res.text).toContain('<meta property="og:description" content="0 reports submitted to GOV.UK by 42 residents in Barking Riverside.">');
        expect(res.text).not.toContain('__OG_STATS_PLACEHOLDER__');
    });

    it('still serves the full page markup (not just a fragment)', async () => {
        const res = await request(app).get('/dashboard.html');
        expect(res.text).toContain('<div class="dossier-container">');
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest tests/server.test.js -t "server-rendered live stats"`
Expected: FAIL — the route doesn't exist yet, so `express.static` serves the raw file with the literal `__OG_STATS_PLACEHOLDER__` still in it (the second test may pass since the static file still contains the container div, but the first test's `og:description` assertion fails).

- [ ] **Step 3: Implement — add `fs` require**

In `vercel/server.js`, replace the top of the requires block:

```js
const path = require('path');
const express = require('express');
```

with:

```js
const path = require('path');
const fs = require('fs');
const express = require('express');
```

- [ ] **Step 4: Implement — add the stats helper and refactor the existing endpoint**

Replace the existing `/api/dashboard-stats` handler:

```js
app.get('/api/dashboard-stats', async (req, res) => {
    try {
        const [
            { count: usersCount },
            { count: incidentsCount },
            { count: formsCount }
        ] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true }).throwOnError(),
            supabase.from('incidents').select('*', { count: 'exact', head: true }).throwOnError(),
            supabase.from('opted_in_user_reports').select('*', { count: 'exact', head: true }).throwOnError()
        ]);

        res.json({
            users: usersCount || 0,
            incidents: incidentsCount || 0,
            formsSubmitted: formsCount || 0
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
```

with:

```js
async function getDashboardStats() {
    const [
        { count: usersCount },
        { count: incidentsCount },
        { count: formsCount }
    ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).throwOnError(),
        supabase.from('incidents').select('*', { count: 'exact', head: true }).throwOnError(),
        supabase.from('opted_in_user_reports').select('*', { count: 'exact', head: true }).throwOnError()
    ]);
    return {
        usersCount: usersCount || 0,
        incidentsCount: incidentsCount || 0,
        formsCount: formsCount || 0
    };
}

app.get('/api/dashboard-stats', async (req, res) => {
    try {
        const { usersCount, incidentsCount, formsCount } = await getDashboardStats();
        res.json({
            users: usersCount,
            incidents: incidentsCount,
            formsSubmitted: formsCount
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
```

(`getDashboardStats` is a `function` declaration, so it's hoisted — it can be called from the new route in Step 5 even though that route is registered earlier in the file.)

- [ ] **Step 5: Implement — add the SSR route before the static middleware**

In `vercel/server.js`, replace:

```js
app.use(express.static(path.join(__dirname, 'public')));
```

with:

```js
app.get('/dashboard.html', async (req, res) => {
    const filePath = path.join(__dirname, 'public', 'dashboard.html');
    try {
        const { usersCount, formsCount } = await getDashboardStats();
        const description = `${formsCount} reports submitted to GOV.UK by ${usersCount} residents in Barking Riverside.`;
        const html = fs.readFileSync(filePath, 'utf8');
        const rendered = html.replace('__OG_STATS_PLACEHOLDER__', description);
        res.type('html').send(rendered);
    } catch (error) {
        console.error('Dashboard page render error:', error);
        res.sendFile(filePath);
    }
});

app.use(express.static(path.join(__dirname, 'public')));
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx jest tests/server.test.js -t "server-rendered live stats"`
Expected: PASS

- [ ] **Step 7: Run the full default test suite to check for regressions**

Run: `cd vercel && npm test`
Expected: All tests pass, including the pre-existing `/api/dashboard-stats` tests (behavior is unchanged — same response shape, just now sourced from the shared helper).

- [ ] **Step 8: Commit**

```bash
git add vercel/server.js vercel/tests/server.test.js
git commit -m "feat: server-render live stats into dashboard og:description for social crawlers"
```

---

### Task 6: Changelog update

**Files:**
- Modify: `vercel/public/changelog.json`

- [ ] **Step 1: Add the new version entry**

At the top of the array in `vercel/public/changelog.json`, add (bumping MINOR since these are new features, and dated today):

```json
  {
    "version": "v1.11.0",
    "date": "2026-07-24",
    "changes": [
      "Added search-engine-friendly page titles and social link previews (Open Graph / Twitter Card) across the homepage and dashboard.",
      "Added a new 'Why Does It Smell?' page explaining the suspected causes, with a short demo clip of how fast reporting is.",
      "Added a 'Share with a neighbour' button after logging a report, so you can forward it straight from your phone's share menu.",
      "The public dashboard now shows live report counts when its link is shared on social media or messaging apps."
    ]
  },
```

- [ ] **Step 2: Commit**

```bash
git add vercel/public/changelog.json
git commit -m "docs: update changelog for v1.11.0"
```

---

## Manual follow-ups (not part of this plan's automated steps)

- Add a real `vercel/public/og-image.png` (1200×630 recommended) for social link previews.
- Record and add `vercel/public/demo-clip.mp4` — a short screen recording of a live form submission with a visible timer, per the design spec.
