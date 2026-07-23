# Mobile Navigation Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inconsistent footer navigation with a unified Floating Action Button (FAB) Speed Dial menu that works flawlessly on mobile and desktop.

**Architecture:** We will inject the FAB and its menu using a single `nav.js` script to keep the codebase DRY. The header will be made sticky via CSS, and the old footers will be removed from all HTML pages.

**Tech Stack:** Vanilla HTML/CSS/JS

## Global Constraints

- No external libraries.
- The `.dossier-container` remains max 600px wide.
- All pages must have the version number in the header.
- The FAB must be pinned to the bottom-right of the `.dossier-container` (or viewport on small screens).

---

### Task 1: Create the FAB Component and Styling

**Files:**
- Create: `vercel/public/nav.js`
- Modify: `vercel/public/style.css`

**Interfaces:**
- Produces: A global `nav.js` script that can be included in any HTML file to auto-mount the FAB menu.

- [ ] **Step 1: Write the FAB injection script**

Create `vercel/public/nav.js` with the following content:

```javascript
document.addEventListener('DOMContentLoaded', () => {
    // Inject the FAB and Menu HTML into the DOM
    const navHTML = `
        <div id="fab-nav-container">
            <div id="fab-menu" class="hidden">
                <nav class="fab-menu-links">
                    <a href="/" class="primary-link">Home (Log Smell)</a>
                    <a href="/dashboard.html">Dashboard</a>
                    <a href="/manage.html">Manage My Data</a>
                    <a href="/feedback.html">Feedback</a>
                    <a href="/changelog.html">Changelog</a>
                    <a href="/privacy.html">Privacy Policy</a>
                    <a href="/promise.html">Data Promise</a>
                    <a href="https://report-an-environmental-problem.service.gov.uk/smell/source" target="_blank" rel="noopener noreferrer">Official GOV.UK Form</a>
                    <a href="https://github.com/Latif17/auto-report-site" target="_blank" rel="noopener noreferrer">View Source on GitHub</a>
                </nav>
            </div>
            <button id="fab-button" aria-label="Menu" aria-expanded="false">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>
        </div>
    `;
    
    // Append to dossier-container if it exists, otherwise body
    const container = document.querySelector('.dossier-container') || document.body;
    container.insertAdjacentHTML('beforeend', navHTML);

    const fabBtn = document.getElementById('fab-button');
    const fabMenu = document.getElementById('fab-menu');

    fabBtn.addEventListener('click', () => {
        const isHidden = fabMenu.classList.contains('hidden');
        if (isHidden) {
            fabMenu.classList.remove('hidden');
            fabBtn.setAttribute('aria-expanded', 'true');
            // Change icon to X
            fabBtn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            `;
        } else {
            fabMenu.classList.add('hidden');
            fabBtn.setAttribute('aria-expanded', 'false');
            // Change back to hamburger
            fabBtn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            `;
        }
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!fabBtn.contains(e.target) && !fabMenu.contains(e.target) && !fabMenu.classList.contains('hidden')) {
            fabBtn.click(); // Trigger the close logic
        }
    });
});
```

- [ ] **Step 2: Add FAB and Sticky Header CSS**

Add the following to the bottom of `vercel/public/style.css`:

```css
/* Sticky Header */
.dossier-header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: var(--paper);
    padding-top: 1rem;
    margin-top: -1rem; /* Counteract container padding if needed, or adjust to fit perfectly */
    border-bottom: 2px solid var(--border);
    margin-bottom: 1.5rem;
}

/* Ensure container has padding to prevent FAB overlap */
.dossier-container {
    padding-bottom: 5rem;
}

/* FAB Container pinned to bottom right of .dossier-container */
#fab-nav-container {
    position: absolute;
    bottom: 2rem;
    right: 2rem;
    z-index: 100;
}

/* Fixed to viewport on mobile screens */
@media (max-width: 600px) {
    #fab-nav-container {
        position: fixed;
        bottom: 1.5rem;
        right: 1.5rem;
    }
}

/* The FAB Button */
#fab-button {
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 50%;
    background: var(--ink);
    color: var(--paper);
    border: 2px solid var(--border);
    box-shadow: 4px 4px 0px var(--shadow);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.1s;
    outline: none;
}

#fab-button:hover {
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0px var(--shadow);
}

#fab-button:active {
    transform: translate(4px, 4px);
    box-shadow: 0px 0px 0px var(--shadow);
}

/* The Menu Drawer/Sheet */
#fab-menu {
    position: absolute;
    bottom: 4.5rem;
    right: 0;
    background: var(--paper);
    border: 2px solid var(--border);
    box-shadow: 6px 6px 0px var(--shadow);
    padding: 1rem;
    width: max-content;
    max-width: calc(100vw - 3rem);
    display: flex;
    flex-direction: column;
    transform-origin: bottom right;
}

#fab-menu.hidden {
    display: none;
}

.fab-menu-links {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.fab-menu-links a {
    padding: 0.75rem 1rem;
    color: var(--ink);
    text-decoration: none;
    font-weight: 600;
    border: 2px solid transparent;
    transition: background 0.1s, border-color 0.1s;
}

.fab-menu-links a:hover {
    background: var(--action-bg);
    border-color: var(--border);
}

.fab-menu-links a.primary-link {
    background: var(--accent);
    color: #ffffff;
    border: 2px solid var(--border);
    box-shadow: 2px 2px 0px var(--shadow);
    margin-bottom: 0.5rem;
}
```

- [ ] **Step 3: Commit Task 1**

```bash
git add vercel/public/nav.js vercel/public/style.css
git commit -m "feat: create FAB navigation component and sticky header styles"
```

---

### Task 2: Apply Redesign to All HTML Pages

**Files:**
- Modify: `vercel/public/index.html`
- Modify: `vercel/public/dashboard.html`
- Modify: `vercel/public/manage.html`
- Modify: `vercel/public/feedback.html`
- Modify: `vercel/public/changelog.html`
- Modify: `vercel/public/privacy.html`
- Modify: `vercel/public/promise.html`

- [ ] **Step 1: Remove Old Footers and Add nav.js**

For each of the 7 HTML files listed above:
1. Delete the entire `<footer>` block (which contains `<nav class="footer-nav">...`).
2. Add `<script src="/nav.js"></script>` just before the closing `</body>` tag.

*Example pattern for all files at the bottom:*
```html
    <!-- ... previous content ... -->
    </div> <!-- closing dossier-container -->
    <script src="/nav.js"></script>
</body>
</html>
```
*(Note: `index.html` and `changelog.html` also have `app.js` and analytics scripts at the bottom. Keep those, just add `nav.js` alongside them).*

- [ ] **Step 2: Ensure version-display exists on all pages**

Check the `<div class="header-top">` inside `<header class="dossier-header">` for every file. 
`index.html`, `dashboard.html`, `feedback.html`, and `changelog.html` already have:
```html
<span class="classification" id="version-display">STINK LOG // v1.1.0</span>
```
For `manage.html`, `privacy.html`, and `promise.html`, ensure their `<div class="header-top">` contains this exact span as the first child, so the JS can automatically update it.

- [ ] **Step 3: Commit Task 2**

```bash
git add vercel/public/*.html
git commit -m "refactor: replace footers with FAB nav and ensure consistent headers"
```
