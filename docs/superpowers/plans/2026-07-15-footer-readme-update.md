# Footer & Repo Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the footer design for better mobile display, add a link to the GitHub repository, and update the README with the live site URL.

**Architecture:** We are updating simple HTML and CSS for layout changes and editing a markdown file. We will use CSS Flexbox to make the footer responsive.

**Tech Stack:** HTML, CSS, Markdown

## Global Constraints

- No external CSS frameworks allowed (Vanilla CSS only)
- Do not use hardcoded `|` separators for links

---

### Task 1: Update README.md

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: N/A
- Produces: N/A

- [ ] **Step 1: Write the updated README content**

Replace any old link or add the live link to the top of `README.md`.

```markdown
# Auto Report Site

Live site: [https://barking-riverside-report-smell.vercel.app/](https://barking-riverside-report-smell.vercel.app/)

Log the industrial smell in Barking Riverside...
```
*(Note: adapt the replacement based on the exact content in the README, just ensure the link is present at the top)*

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add live site URL to README"
```

---

### Task 2: Update Footer HTML

**Files:**
- Modify: `vercel/public/index.html`

**Interfaces:**
- Consumes: N/A
- Produces: HTML structure for CSS flexbox styling

- [ ] **Step 1: Write the updated footer HTML**

Replace the existing `<footer>` block in `vercel/public/index.html` with:

```html
        <footer>
            <nav class="footer-nav">
                <a href="https://report-an-environmental-problem.service.gov.uk/smell/source" target="_blank" rel="noopener noreferrer">Official GOV.UK Form</a>
                <a href="/promise.html">Data Promise</a>
                <a href="/privacy.html">Privacy Policy</a>
                <a href="/manage.html">Manage My Data</a>
                <a href="/feedback.html">Feedback</a>
                <a href="https://github.com/Latif17/auto-report-site" target="_blank" rel="noopener noreferrer">View Source on GitHub</a>
            </nav>
        </footer>
```

- [ ] **Step 2: Commit**

```bash
git add vercel/public/index.html
git commit -m "feat: restructure footer and add github link"
```

---

### Task 3: Update Footer CSS

**Files:**
- Modify: `vercel/public/style.css`

**Interfaces:**
- Consumes: `.footer-nav` class from Task 2
- Produces: Responsive flexbox layout

- [ ] **Step 1: Write the updated footer CSS**

Replace the existing `footer` styling block in `vercel/public/style.css` (around line 520) with:

```css
footer {
    margin-top: 2rem;
    text-align: center;
    font-size: 0.75rem;
    color: var(--ink-light);
}

.footer-nav {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
}

.footer-nav a {
    color: var(--ink);
    text-decoration: underline;
}
```

- [ ] **Step 2: Commit**

```bash
git add vercel/public/style.css
git commit -m "style: make footer responsive with flexbox"
```
