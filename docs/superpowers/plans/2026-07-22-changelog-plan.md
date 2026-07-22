# Changelog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a versioning system and a dedicated changelog page for the Barking Stink website, along with agent instructions to keep it updated.

**Architecture:** A static `changelog.json` holds version data. The frontend JS fetches this to update the header version, and a new `changelog.html` page renders the history. A `GEMINI.md` instructs agents to update the JSON.

**Tech Stack:** HTML, CSS, vanilla JS.

## Global Constraints

- No external frameworks or libraries for UI. Use vanilla JS and CSS.
- Ensure responsive design.

---

### Task 1: Create Data Source

**Files:**
- Create: `vercel/public/changelog.json`

**Interfaces:**
- Produces: JSON structure with version, date, and changes array.

- [ ] **Step 1: Write the JSON structure**

```json
[
  {
    "version": "v1.1.0",
    "date": "2026-07-22",
    "changes": [
      "Added a dedicated changelog page to track website updates.",
      "Improved the design of the footer."
    ]
  },
  {
    "version": "v1.0.0",
    "date": "2026-07-01",
    "changes": [
      "Initial launch of the Barking Stink incident reporting tool."
    ]
  }
]
```

- [ ] **Step 2: Commit**

```bash
git add vercel/public/changelog.json
git commit -m "feat: add changelog data source"
```

---

### Task 2: Create Agent Instructions

**Files:**
- Create: `GEMINI.md`

**Interfaces:**
- Produces: System instructions for agents to follow.

- [ ] **Step 1: Write GEMINI.md instructions**

```markdown
# Agent Instructions

## Changelog and Versioning
Before completing any feature or bug fix, you MUST update `vercel/public/changelog.json`.
- Increment the version (PATCH for bugs, MINOR for features).
- Add clear, non-technical bullet points describing the changes.
```

- [ ] **Step 2: Commit**

```bash
git add GEMINI.md
git commit -m "docs: add agent instructions for changelog updates"
```

---

### Task 3: Update Header and Footer across Pages

**Files:**
- Modify: `vercel/public/index.html` (and optionally dashboard, manage, privacy, promise, feedback)
- Modify: `vercel/public/app.js`

**Interfaces:**
- Consumes: `changelog.json`

- [ ] **Step 1: Add id to classification header in index.html**

Locate:
```html
<span class="classification">CONFIDENTIAL // EVIDENCE LOG</span>
```
Replace with:
```html
<span class="classification" id="version-display">STINK LOG // v1.1.0</span>
```
*(Repeat for other HTML files if applicable).*

- [ ] **Step 2: Add Changelog link to footer in index.html**

Locate:
```html
<a href="/feedback.html">Feedback</a>
<a href="https://github.com/Latif17/auto-report-site" target="_blank" rel="noopener noreferrer">View Source on GitHub</a>
```
Add above GitHub link:
```html
<a href="/changelog.html">Changelog</a>
```
*(Repeat for other HTML files).*

- [ ] **Step 3: Update app.js to fetch version**

Add to `vercel/public/app.js`:
```javascript
// Fetch and display latest version in header
async function updateVersionDisplay() {
    try {
        const response = await fetch('/changelog.json');
        if (!response.ok) throw new Error('Failed to fetch changelog');
        const data = await response.json();
        const latestVersion = data[0].version;
        
        const versionDisplays = document.querySelectorAll('#version-display');
        versionDisplays.forEach(el => {
            el.textContent = 'STINK LOG // ' + latestVersion;
        });
    } catch (error) {
        console.error('Error fetching version:', error);
    }
}

// Call on load
document.addEventListener('DOMContentLoaded', () => {
    updateVersionDisplay();
});
```

- [ ] **Step 4: Commit**

```bash
git add vercel/public/index.html vercel/public/app.js
git commit -m "feat: integrate version in header and add changelog footer link"
```

---

### Task 4: Create Changelog Page

**Files:**
- Create: `vercel/public/changelog.html`
- Modify: `vercel/public/style.css`

**Interfaces:**
- Consumes: `changelog.json`

- [ ] **Step 1: Create changelog.html structure**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Changelog | Barking Stink</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="dossier-container">
        <header class="dossier-header">
            <div class="header-top">
                <span class="classification" id="version-display">STINK LOG // v1.1.0</span>
                <span class="case-number">CASE: BARKING-RIVERSIDE</span>
            </div>
            <h1>Changelog</h1>
            <p class="subject">A history of updates and fixes.</p>
        </header>

        <main id="changelog-container">
            <div style="text-align: center; margin: 2rem;">Loading history...</div>
        </main>
        
        <footer>
            <nav class="footer-nav">
                <a href="/">Home</a>
                <a href="/changelog.html">Changelog</a>
            </nav>
        </footer>
    </div>
    <script type="module" src="app.js"></script>
    <script>
        // Fetch and render changelog
        async function loadChangelog() {
            try {
                const response = await fetch('/changelog.json');
                const data = await response.json();
                const container = document.getElementById('changelog-container');
                container.innerHTML = '';
                
                data.forEach(release => {
                    const section = document.createElement('div');
                    section.className = 'changelog-entry';
                    section.innerHTML = `
                        <h2>${release.version} - <span class="date">${release.date}</span></h2>
                        <ul>
                            ${release.changes.map(change => `<li>${change}</li>`).join('')}
                        </ul>
                    `;
                    container.appendChild(section);
                });
            } catch (err) {
                document.getElementById('changelog-container').innerHTML = '<p>Error loading changelog.</p>';
            }
        }
        document.addEventListener('DOMContentLoaded', loadChangelog);
    </script>
</body>
</html>
```

- [ ] **Step 2: Add CSS for Changelog**

Add to `vercel/public/style.css`:
```css
.changelog-entry {
    background: var(--paper);
    border: 1px solid var(--border);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    border-radius: 4px;
}
.changelog-entry h2 {
    color: var(--accent);
    font-family: var(--font-mono);
    margin-top: 0;
    margin-bottom: 1rem;
    font-size: 1.25rem;
}
.changelog-entry .date {
    color: var(--ink-light);
    font-size: 0.9rem;
}
.changelog-entry ul {
    margin: 0;
    padding-left: 1.2rem;
    color: var(--ink);
}
.changelog-entry li {
    margin-bottom: 0.5rem;
}
```

- [ ] **Step 3: Commit**

```bash
git add vercel/public/changelog.html vercel/public/style.css
git commit -m "feat: add dedicated changelog page"
```
