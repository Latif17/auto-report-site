# Unified Headers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the styling of the reporter details headers so both new and returning users share the same consistent layout.

**Architecture:** Create a shared `.form-section-header` CSS class and apply it to both the default header and the verified summary containers, removing redundant styles from the inner `h2` and removing the dynamic border-top from the expanded form content.

**Tech Stack:** HTML, CSS

## Global Constraints

- Must rely on freshAirWatchData_v2 (or legacy freshAirWatchData) in localStorage for state testing.
- Must ensure CSS classes and DOM structure support the toggle behavior.

---

### Task 1: Create Shared Header CSS and Update HTML

**Files:**
- Modify: `vercel/public/style.css`
- Modify: `vercel/public/index.html`

**Interfaces:**
- Consumes: Existing DOM structure in `index.html`
- Produces: Updated CSS classes applied to DOM elements

- [ ] **Step 1: Update style.css with new class and modified h2 styles**

```css
/* Add new shared class */
.form-section-header {
    padding: 1rem;
    background: var(--header-bg);
    border-bottom: 1px solid var(--border);
}

/* Modify existing .section-title to remove background, padding, and border (since it's now on the wrapper) */
.section-title {
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: 0.9rem;
    margin: 0;
}

/* Remove border-top from expanded form content */
.details-content.expanded-from-summary {
    margin-top: 1.5rem;
    /* padding-top and border-top removed because the header now has a border-bottom */
}
```

- [ ] **Step 2: Update index.html to use the new class**

Update the `#default-header` and `#verified-summary` divs in `vercel/public/index.html` to include the `form-section-header` class:

```html
                    <!-- Default Header -->
                    <div id="default-header" class="form-section-header" style="display: flex; justify-content: space-between; align-items: baseline;">
                        <h2 class="section-title">Reporter Information (Required for official submission)</h2>
                    </div>

                    <!-- Verified Summary (Returning User) -->
                    <div id="verified-summary" class="hidden form-section-header" style="display: flex; justify-content: space-between; align-items: center;">
                        <div class="summary-content" style="font-weight: 600; font-family: var(--font-mono); color: var(--accent); font-size: 1.1rem;">
                            <span id="summary-details">Jane Doe - IG11 0YP</span>
                        </div>
                        <button type="button" id="edit-details-btn" class="btn-small">Edit File</button>
                    </div>
```

- [ ] **Step 3: Commit**

```bash
git add vercel/public/style.css vercel/public/index.html
git commit -m "style: unify reporter details headers"
```
