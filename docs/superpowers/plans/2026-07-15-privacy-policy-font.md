# Privacy Policy Font Readability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve mobile readability of the privacy policy and data promise by creating and applying a new CSS class.

**Architecture:** Create a targeted CSS utility class `.reading-content` that boosts text size and line spacing, and apply it to the specific containers in `privacy.html` and `promise.html`.

**Tech Stack:** HTML, CSS

## Global Constraints

- No build step needed, plain HTML/CSS changes.
- Ensure no layout breakage for existing form elements or dashboard areas.

---

### Task 1: Add `.reading-content` to `style.css`

**Files:**
- Modify: `vercel/public/style.css`

**Interfaces:**
- Consumes: Existing Inter font setup
- Produces: A CSS class `.reading-content` for use in HTML files.

- [ ] **Step 1: Write the CSS implementation**

Add the following to the bottom of `vercel/public/style.css`:

```css
/* Reading Content (Mobile-optimized legibility for long text) */
.reading-content {
    font-size: 1.125rem;
    line-height: 1.65;
    text-align: left;
}

.reading-content p {
    margin-bottom: 1.5rem;
}

.reading-content h3 {
    margin-top: 2rem;
    margin-bottom: 0.75rem;
}

/* Override timeline text size when inside reading-content */
.reading-content .timeline-content {
    font-size: 1.125rem;
    line-height: 1.65;
}
```

- [ ] **Step 2: Commit**

```bash
git add vercel/public/style.css
git commit -m "style: add reading-content class for long form text"
```

### Task 2: Apply `.reading-content` to `privacy.html`

**Files:**
- Modify: `vercel/public/privacy.html`

**Interfaces:**
- Consumes: The `.reading-content` class.

- [ ] **Step 1: Apply class in HTML**

In `vercel/public/privacy.html`, find the `primary-action-section`:

```html
<div class="primary-action-section" style="text-align: left;">
```

Replace it with:

```html
<div class="primary-action-section reading-content">
```

- [ ] **Step 2: Commit**

```bash
git add vercel/public/privacy.html
git commit -m "chore: apply reading-content class to privacy policy"
```

### Task 3: Apply `.reading-content` to `promise.html`

**Files:**
- Modify: `vercel/public/promise.html`

**Interfaces:**
- Consumes: The `.reading-content` class.

- [ ] **Step 1: Apply class in HTML**

In `vercel/public/promise.html`, wrap the `<div class="timeline">` inside a div with `.reading-content`.

Change this:
```html
        <main>
            <div class="timeline">
```

To this:
```html
        <main>
            <div class="reading-content">
                <div class="timeline">
```

And close the div at the end of `<main>`:
Change this:
```html
                </div>
            </div>
        </main>
```
To this (adding the extra closing `</div>`):
```html
                </div>
            </div>
            </div>
        </main>
```

- [ ] **Step 2: Commit**

```bash
git add vercel/public/promise.html
git commit -m "chore: apply reading-content class to data promise page"
```
