# Transparency and Trust Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement truthful, reassuring transparency features about data flow and security across the site.

**Architecture:** Frontend HTML/CSS updates. Adds a new static `promise.html` page and updates existing static files (`index.html`, `manage.html`, `privacy.html`, `style.css`).

**Tech Stack:** HTML5, vanilla CSS.

## Global Constraints
- Frontend only. All changes must be contained within `vercel/public/`.
- No new external dependencies.

---

### Task 1: Form Adjustments and Trust Box

**Files:**
- Modify: `vercel/public/index.html`

**Interfaces:**
- Consumes: Existing form structure.
- Produces: Updated labels and a new visual trust box element below the submit button.

- [ ] **Step 1: Update "Retain locally" label**
Modify `index.html` around the `storeLocally` checkbox.
Change `<strong>Retain locally</strong>` to `<strong>Remember my details</strong>`.
Change the description `<span>Saves your details...` to `<span>Save your details in your browser so you don't have to re-type them next time.</span>`.

- [ ] **Step 2: Add Trust Box**
Locate the submit button (`<button type="submit" class="btn btn-submit" id="submit-btn">...`) in `index.html`.
Immediately below it, add the Trust Box HTML:
```html
<div class="trust-box" style="margin-top: 1.5rem; background: var(--paper); border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem;">
    <h3 style="margin-top: 0; margin-bottom: 0.75rem; font-size: 1rem; color: var(--accent); display: flex; align-items: center; gap: 0.5rem;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        Data Protection Promise
    </h3>
    <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.85rem; color: var(--ink);">
        <li style="margin-bottom: 0.5rem;">✓ <strong>Secure Storage:</strong> Your data is encrypted in transit and safely stored at rest, used exclusively to file official reports on your behalf.</li>
        <li style="margin-bottom: 0.5rem;">✓ <strong>Anonymized Pooling:</strong> If you share with the community, your personal details are strictly separated. Neighbors only see the smell event itself.</li>
        <li style="margin-bottom: 0.75rem;">✓ <strong>Full Control:</strong> You can permanently wipe your data from our servers at any time.</li>
    </ul>
    <a href="/promise.html" style="font-size: 0.85rem; font-weight: 600;">Read our full Data Promise →</a>
</div>
```

- [ ] **Step 3: Verify the page loads**
Run: `open vercel/public/index.html` (or visually inspect the file) to verify the HTML structure is correct.
Expected: HTML is valid, no unclosed tags.

- [ ] **Step 4: Commit**
```bash
git add vercel/public/index.html
git commit -m "feat: update form wording and add trust box"
```

---

### Task 2: Our Data Promise Page

**Files:**
- Create: `vercel/public/promise.html`
- Modify: `vercel/public/style.css`

**Interfaces:**
- Consumes: Global CSS variables from `style.css`.
- Produces: A new static page accessible via URL.

- [ ] **Step 1: Add Timeline CSS**
Append timeline styles to `vercel/public/style.css`:
```css
/* Timeline Styles */
.timeline {
    position: relative;
    max-width: 600px;
    margin: 2rem auto;
    padding-left: 2rem;
}
.timeline::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--border);
}
.timeline-item {
    position: relative;
    margin-bottom: 2rem;
}
.timeline-item::before {
    content: '';
    position: absolute;
    left: -2.35rem;
    top: 0.25rem;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--paper);
    border: 2px solid var(--accent);
}
.timeline-title {
    font-weight: 700;
    color: var(--accent);
    margin-bottom: 0.25rem;
}
.timeline-content {
    font-size: 0.95rem;
    line-height: 1.5;
    color: var(--ink);
}
```

- [ ] **Step 2: Create `promise.html`**
Create `vercel/public/promise.html` with the timeline content:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Our Data Promise | Barking Stink</title>
    <link rel="stylesheet" href="style.css">
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
</head>
<body>
    <div class="dossier-container">
        <header class="dossier-header">
            <a href="/" style="display: inline-block; margin-bottom: 1rem; font-weight: 600;">← Back to Home</a>
            <h1>Your Data is Safe with Us</h1>
            <p class="subject">We believe in radical transparency. Here is exactly what happens to your data.</p>
        </header>

        <main>
            <div class="timeline">
                <div class="timeline-item">
                    <div class="timeline-title">1. In Transit (Submission)</div>
                    <div class="timeline-content">When you hit submit, your data travels over a secure, encrypted connection (HTTPS/TLS) directly to our backend database.</div>
                </div>
                <div class="timeline-item">
                    <div class="timeline-title">2. At Rest (Storage)</div>
                    <div class="timeline-content">Your personal details are securely stored. They are used by our system for one purpose only: to automatically file the official GOV.UK report on your behalf.</div>
                </div>
                <div class="timeline-item">
                    <div class="timeline-title">3. Anonymization (Community Pooling)</div>
                    <div class="timeline-content">Our database strictly separates the event (the "incident") from your personal info. When an event is shown on the homepage for neighbors to join, your personal details are never exposed.</div>
                </div>
                <div class="timeline-item">
                    <div class="timeline-title">4. Right to Erasure (Deletion)</div>
                    <div class="timeline-content">You have total control. Enter your email on our <a href="/manage.html">Manage My Data</a> page to execute an immediate, hard delete of your records from our systems.</div>
                </div>
            </div>
        </main>
        
        <footer>
            <p>
                <a href="/">Home</a> | <a href="/privacy.html">Privacy Policy</a> | <a href="/manage.html">Manage My Data</a>
            </p>
        </footer>
    </div>
</body>
</html>
```

- [ ] **Step 3: Verify the file exists**
Run: `ls -l vercel/public/promise.html`
Expected: File exists and has size > 0.

- [ ] **Step 4: Commit**
```bash
git add vercel/public/promise.html vercel/public/style.css
git commit -m "feat: add data promise timeline page"
```

---

### Task 3: Navigation Updates

**Files:**
- Modify: `vercel/public/index.html`
- Modify: `vercel/public/manage.html`
- Modify: `vercel/public/privacy.html`

**Interfaces:**
- Consumes: The footers of the existing static files.
- Produces: Updated footer links.

- [ ] **Step 1: Update index.html footer**
In `vercel/public/index.html`, locate the footer:
```html
        <footer>
            <p>
                <a href="https://report-an-environmental-problem.service.gov.uk/smell/source" target="_blank" rel="noopener noreferrer">Official GOV.UK Form</a>
                &nbsp;|&nbsp;
                <a href="/privacy.html">Privacy Policy</a>
            </p>
        </footer>
```
Change it to:
```html
        <footer>
            <p>
                <a href="https://report-an-environmental-problem.service.gov.uk/smell/source" target="_blank" rel="noopener noreferrer">Official GOV.UK Form</a>
                &nbsp;|&nbsp;
                <a href="/promise.html">Data Promise</a>
                &nbsp;|&nbsp;
                <a href="/privacy.html">Privacy Policy</a>
                &nbsp;|&nbsp;
                <a href="/manage.html">Manage Data</a>
            </p>
        </footer>
```

- [ ] **Step 2: Update manage.html footer**
In `vercel/public/manage.html`, locate the footer:
```html
        <footer>
            <p>
                <a href="/">Return Home</a>
            </p>
        </footer>
```
Change it to:
```html
        <footer>
            <p>
                <a href="/">Home</a> | <a href="/promise.html">Data Promise</a> | <a href="/privacy.html">Privacy Policy</a>
            </p>
        </footer>
```

- [ ] **Step 3: Update privacy.html footer**
In `vercel/public/privacy.html`, locate the footer.
Change it to:
```html
        <footer>
            <p>
                <a href="/">Home</a> | <a href="/promise.html">Data Promise</a> | <a href="/manage.html">Manage Data</a>
            </p>
        </footer>
```

- [ ] **Step 4: Verify files are updated**
Run: `git diff`
Expected: The footers of all three files are updated with the new links.

- [ ] **Step 5: Commit**
```bash
git add vercel/public/index.html vercel/public/manage.html vercel/public/privacy.html
git commit -m "feat: add data promise and manage data to footers"
```
