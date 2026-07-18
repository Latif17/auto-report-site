# Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public dashboard page showing the total number of signed-up users, reported smells, and automatically submitted forms.

**Architecture:** We will add a new `GET /api/dashboard-stats` endpoint to the Express backend that executes parallel Supabase count queries. A new static HTML file, `public/dashboard.html`, will fetch this data and present it using vanilla HTML/JS and CSS with a premium, animated design. The navigation menu will be updated to link to this page.

**Tech Stack:** Express, Vanilla JS, HTML, CSS, Supabase.

## Global Constraints

- No external CSS frameworks like Tailwind; use Vanilla CSS.
- Ensure the API is under the `globalLimiter`.
- The dashboard must have a premium feel (modern typography, harmonious color palette, micro-animations, number counting up).

---

### Task 1: Backend Dashboard Stats API

**Files:**
- Modify: `vercel/server.js`
- Modify: `vercel/tests/server.test.js`

**Interfaces:**
- Consumes: Supabase database tables (`users`, `incidents`, `opted_in_user_reports`)
- Produces: `GET /api/dashboard-stats` returning JSON like `{ users: 150, incidents: 45, formsSubmitted: 320 }`

- [ ] **Step 1: Write the failing test**

Modify `vercel/tests/server.test.js` to add the following test inside the `describe('API Endpoints')` block:

```javascript
    it('GET /api/dashboard-stats returns total counts', async () => {
        const res = await request(app).get('/api/dashboard-stats');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('users');
        expect(res.body).toHaveProperty('incidents');
        expect(res.body).toHaveProperty('formsSubmitted');
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd vercel && npm test -- -t "GET /api/dashboard-stats returns total counts"`
Expected: FAIL with "404 Not Found"

- [ ] **Step 3: Write minimal implementation**

Modify `vercel/server.js` to add the new endpoint. Place it near the existing `/api/stats` route:

```javascript
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

*Note: The mock Supabase client in `server.js` already returns a `count` for these tables via the `then` chain in `select()`, so the test should pass with the mock data.*

- [ ] **Step 4: Run test to verify it passes**

Run: `cd vercel && npm test -- -t "GET /api/dashboard-stats returns total counts"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd vercel
git add tests/server.test.js server.js
git commit -m "feat: add /api/dashboard-stats endpoint"
```

### Task 2: Frontend Dashboard Page

**Files:**
- Create: `vercel/public/dashboard.html`
- Modify: `vercel/public/style.css`

**Interfaces:**
- Consumes: `GET /api/dashboard-stats`
- Produces: A visually appealing, responsive dashboard at `/dashboard.html`

- [ ] **Step 1: Write the HTML skeleton with inline script**

Create `vercel/public/dashboard.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Platform Impact - Auto Report</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header class="site-header">
        <nav class="nav-container">
            <a href="index.html" class="logo">Auto Report</a>
            <div class="nav-links">
                <a href="dashboard.html">Dashboard</a>
            </div>
        </nav>
    </header>

    <main class="dashboard-main">
        <section class="hero-section text-center">
            <h1>Our Community Impact</h1>
            <p>See the real-time difference our users are making by automating reports.</p>
        </section>

        <section class="metrics-grid">
            <div class="metric-card">
                <h3>Users Signed Up</h3>
                <div class="metric-value" id="val-users">--</div>
            </div>
            <div class="metric-card">
                <h3>Smells Reported</h3>
                <div class="metric-value" id="val-incidents">--</div>
            </div>
            <div class="metric-card">
                <h3>Forms Submitted</h3>
                <div class="metric-value" id="val-forms">--</div>
            </div>
        </section>
        
        <div id="dashboard-error" class="error-message" style="display: none; text-align: center;">
            Statistics currently unavailable.
        </div>
    </main>

    <script>
        async function fetchStats() {
            try {
                const response = await fetch('/api/dashboard-stats');
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                
                animateValue('val-users', 0, data.users, 1500);
                animateValue('val-incidents', 0, data.incidents, 1500);
                animateValue('val-forms', 0, data.formsSubmitted, 1500);
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
                document.getElementById('dashboard-error').style.display = 'block';
            }
        }

        function animateValue(id, start, end, duration) {
            const obj = document.getElementById(id);
            if (!obj) return;
            let startTimestamp = null;
            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                // Ease out quad
                const easeOut = progress * (2 - progress);
                obj.innerHTML = Math.floor(easeOut * (end - start) + start).toLocaleString();
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                } else {
                    obj.innerHTML = end.toLocaleString();
                }
            };
            window.requestAnimationFrame(step);
        }

        document.addEventListener('DOMContentLoaded', fetchStats);
    </script>
</body>
</html>
```

- [ ] **Step 2: Add CSS for the dashboard**

Modify `vercel/public/style.css` to append the dashboard styles at the bottom:

```css
/* Dashboard Specific Styles */
.dashboard-main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 4rem 2rem;
}

.text-center {
    text-align: center;
}

.hero-section h1 {
    font-size: 3rem;
    background: linear-gradient(135deg, var(--primary-color), #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 1rem;
}

.hero-section p {
    font-size: 1.25rem;
    color: var(--text-color);
    opacity: 0.8;
    margin-bottom: 3rem;
}

.metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-top: 2rem;
}

.metric-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 3rem 2rem;
    text-align: center;
    backdrop-filter: blur(10px);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.metric-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    border-color: rgba(255, 255, 255, 0.2);
}

.metric-card h3 {
    font-size: 1.2rem;
    font-weight: 500;
    color: var(--text-color);
    opacity: 0.9;
    margin-bottom: 1rem;
}

.metric-value {
    font-size: 4rem;
    font-weight: 700;
    background: linear-gradient(135deg, #ffffff, #a5b4fc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    line-height: 1.1;
}

.error-message {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
    padding: 1rem;
    border-radius: 8px;
    margin-top: 2rem;
}
```

- [ ] **Step 3: Commit**

```bash
cd vercel
git add public/dashboard.html public/style.css
git commit -m "feat: create dashboard page with premium design and animations"
```

### Task 3: Update Navigation Links

**Files:**
- Modify: `vercel/public/index.html`

**Interfaces:**
- Consumes: Existing navbar structure
- Produces: A new link pointing to `/dashboard.html`

- [ ] **Step 1: Add Dashboard link to index.html**

Open `vercel/public/index.html` and locate the navigation links. Look for something like:
```html
<div class="nav-links">
    <!-- existing links -->
</div>
```
Add `<a href="dashboard.html">Dashboard</a>` to the navigation menu so users can discover the page.

- [ ] **Step 2: Commit**

```bash
cd vercel
git add public/index.html
git commit -m "feat: add dashboard link to navigation"
```
