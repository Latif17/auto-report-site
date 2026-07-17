# Dashboard Terminal UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the dashboard UI to match the app's dossier aesthetic using a mobile-first, retro terminal layout.

**Architecture:** Update vanilla HTML and CSS files to replace generic cards with horizontal terminal-style readout lines.

**Tech Stack:** HTML, CSS

## Global Constraints

- Mobile-first approach (`max-width: 600px`).
- Use existing design variables (`var(--ink)`, `var(--paper)`, `var(--accent)`, `var(--font-mono)`).
- Visual verification replaces unit testing as this is a purely aesthetic CSS/HTML change.

---

### Task 1: Update HTML Structure

**Files:**
- Modify: `vercel/public/dashboard.html`

**Interfaces:**
- Consumes: N/A
- Produces: Updated DOM elements that CSS will target.

- [ ] **Step 1: Replace hero section and metric grid**
Modify `dashboard.html` around line 24. Replace the `hero-section` and `metrics-grid` with the new terminal feed structure.

```html
        <main class="dashboard-main" style="padding: 0; margin-top: 2rem;">
            <header class="mission-brief">
                <h2>// SYSTEM STATUS: COMMUNITY MONITORING</h2>
                <p>Tracking real-time dossier updates and evidence logs.</p>
            </header>

            <section class="terminal-feed">
                <div class="terminal-line">
                    <span class="label">> USERS_ACTIVE:</span>
                    <span class="value" id="val-users">--</span>
                    <span class="cursor">_</span>
                </div>
                <div class="terminal-line">
                    <span class="label">> INCIDENTS_LOGGED:</span>
                    <span class="value" id="val-incidents">--</span>
                    <span class="cursor">_</span>
                </div>
                <div class="terminal-line">
                    <span class="label">> FORMS_SUBMITTED:</span>
                    <span class="value" id="val-forms">--</span>
                    <span class="cursor">_</span>
                </div>
            </section>
            
            <div id="dashboard-error" class="error-message terminal-error" style="display: none;">
                [ERR_CONNECTION_FAILED] - RETRYING...
            </div>
        </main>
```

- [ ] **Step 2: Commit**

```bash
git add vercel/public/dashboard.html
git commit -m "refactor(ui): update dashboard HTML structure to terminal feed layout"
```

### Task 2: Remove Obsolete CSS

**Files:**
- Modify: `vercel/public/style.css`

**Interfaces:**
- Consumes: N/A
- Produces: Cleaned CSS file without unused classes.

- [ ] **Step 1: Remove old dashboard styles**
In `vercel/public/style.css`, remove the following CSS blocks (approx lines 724-797):
- `.dashboard-main`
- `.text-center`
- `.hero-section h1`
- `.hero-section p`
- `.metrics-grid`
- `.metric-card`
- `.metric-card:hover`
- `.metric-card h3`
- `.metric-value`
- `.error-message`

Leave the comment `/* Dashboard Specific Styles */` in place.

- [ ] **Step 2: Commit**

```bash
git add vercel/public/style.css
git commit -m "style: remove obsolete dashboard CSS classes"
```

### Task 3: Add Terminal UI CSS

**Files:**
- Modify: `vercel/public/style.css`

**Interfaces:**
- Consumes: HTML structure from Task 1.
- Produces: Final styled dashboard.

- [ ] **Step 1: Add new styles**
Add the following CSS under `/* Dashboard Specific Styles */` in `vercel/public/style.css`:

```css
/* Dashboard Specific Styles */
.dashboard-main {
    margin: 0 auto;
    padding: 2rem 0;
}

.mission-brief {
    margin-bottom: 2rem;
    padding: 0 1rem;
}

.mission-brief h2 {
    font-family: var(--font-mono);
    font-size: 1.1rem;
    color: var(--ink);
    margin-bottom: 0.5rem;
    border-bottom: 2px solid var(--ink);
    display: inline-block;
}

.mission-brief p {
    font-size: 0.95rem;
    color: var(--ink-light);
}

.terminal-feed {
    background: var(--ink);
    color: var(--paper);
    padding: 2rem 1.5rem;
    border: 2px solid var(--border);
    box-shadow: 6px 6px 0px var(--shadow);
    font-family: var(--font-mono);
    margin: 0 1rem;
    position: relative;
    overflow: hidden;
}

/* Subtle scanline effect */
.terminal-feed::after {
    content: " ";
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
    z-index: 2;
    background-size: 100% 2px, 3px 100%;
    pointer-events: none;
}

.terminal-line {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    font-size: 1.25rem;
    margin-bottom: 1rem;
    letter-spacing: 1px;
}

.terminal-line:last-child {
    margin-bottom: 0;
}

.terminal-line .label {
    color: var(--paper);
    margin-right: 0.75rem;
}

.terminal-line .value {
    color: var(--accent);
    font-weight: bold;
}

.terminal-line .cursor {
    color: var(--accent);
    margin-left: 0.25rem;
    animation: blink 1s step-end infinite;
}

@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
}

.terminal-error {
    font-family: var(--font-mono);
    color: var(--paper);
    background: var(--error-text);
    padding: 1rem;
    margin: 2rem 1rem 0;
    border: 2px solid var(--border);
    font-weight: bold;
}

/* Mobile Optimizations */
@media (max-width: 600px) {
    .dashboard-main {
        padding: 1rem 0;
    }
    
    .mission-brief {
        padding: 0;
    }

    .terminal-feed {
        margin: 0;
        padding: 1.5rem 1rem;
        box-shadow: 4px 4px 0px var(--shadow);
    }

    .terminal-line {
        font-size: 1rem;
        margin-bottom: 1.25rem;
        /* Allow wrapping if line is too long, but keep label/value together as much as possible */
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add vercel/public/style.css
git commit -m "style: implement terminal feed dashboard aesthetics"
```
