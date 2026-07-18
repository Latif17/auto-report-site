# Weekly Smell Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a weekly bar chart to the dashboard showing the number of forms submitted per day over the last 7 days, grouped by smell type.

**Architecture:** A new Express endpoint queries Supabase for reports from the last 7 days and aggregates the counts. The frontend uses Chart.js to render a grouped bar chart with a terminal theme.

**Tech Stack:** Node.js, Express, Supabase JS Client, HTML, Chart.js

## Global Constraints

- Must match existing terminal aesthetic (dark theme, green/cyan colors, monospace fonts).
- Handle missing environment variables gracefully (using the mock supabase client in `server.js`).

---

### Task 1: Backend API Endpoint

**Files:**
- Modify: `vercel/server.js`
- Test: `vercel/tests/server.test.js`

**Interfaces:**
- Produces: `GET /api/smell-stats-weekly` returning JSON like `{ labels: ["Mon", "Tue"], datasets: [{ label: "Sewage", data: [1, 0] }] }`

- [ ] **Step 1: Write the failing test**

```javascript
// Add to vercel/tests/server.test.js
describe('GET /api/smell-stats-weekly', () => {
    it('should return 200 and structured chart data', async () => {
        const response = await request(app).get('/api/smell-stats-weekly');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('labels');
        expect(response.body).toHaveProperty('datasets');
        expect(Array.isArray(response.body.labels)).toBe(true);
        expect(Array.isArray(response.body.datasets)).toBe(true);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd vercel && npm test`
Expected: FAIL with "404 Not Found" for the new endpoint

- [ ] **Step 3: Write minimal implementation**

```javascript
// Add to vercel/server.js before the app.get('/api/stats') block

app.get('/api/smell-stats-weekly', async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const lowerBound = sevenDaysAgo.toISOString();

        const { data, error } = await supabase.from('opted_in_user_reports')
            .select('incident_id, incidents!inner(smell_timestamp, smell_type)')
            .gte('incidents.smell_timestamp', lowerBound)
            .throwOnError();

        if (error) throw error;

        // Process data
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const labels = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            labels.push(days[d.getDay()]);
        }

        const countsBySmellAndDay = {};
        const allSmellTypes = new Set();

        (data || []).forEach(report => {
            const incident = Array.isArray(report.incidents) ? report.incidents[0] : report.incidents;
            if (!incident) return;
            const date = new Date(incident.smell_timestamp);
            const dayName = days[date.getDay()];
            const smell = incident.smell_type || 'Unknown';
            allSmellTypes.add(smell);

            if (!countsBySmellAndDay[smell]) countsBySmellAndDay[smell] = {};
            countsBySmellAndDay[smell][dayName] = (countsBySmellAndDay[smell][dayName] || 0) + 1;
        });

        const datasets = Array.from(allSmellTypes).map(smell => {
            return {
                label: smell,
                data: labels.map(day => countsBySmellAndDay[smell][day] || 0),
                backgroundColor: 'rgba(0, 255, 0, 0.7)',
                borderColor: '#00ff00',
                borderWidth: 1
            };
        });

        res.json({ labels, datasets });
    } catch (error) {
        console.error('Weekly stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
```
Wait, the `backgroundColor` logic could be improved with different colors for different smells, but we can do that in the frontend if needed. Let's just fix the backend to return raw data or basic datasets. The frontend can override colors.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd vercel && npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd vercel
git add tests/server.test.js server.js
git commit -m "feat: add /api/smell-stats-weekly endpoint"
```

### Task 2: Frontend Chart Implementation

**Files:**
- Modify: `vercel/public/dashboard.html`

**Interfaces:**
- Consumes: `GET /api/smell-stats-weekly`

- [ ] **Step 1: Add Canvas and Chart.js script**

```html
<!-- In vercel/public/dashboard.html, after the terminal-feed section -->
<section class="chart-section" style="margin-top: 2rem; border: 1px solid #00ff00; padding: 1rem;">
    <h2 style="color: #00ff00; font-size: 1.2rem; border-bottom: 1px solid #00ff00; padding-bottom: 0.5rem; margin-bottom: 1rem; font-family: 'IBM Plex Mono', monospace;">> WEEKLY_SMELL_BREAKDOWN</h2>
    <canvas id="weeklySmellChart" style="max-height: 300px;"></canvas>
</section>

<!-- Before the closing </body> tag -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```

- [ ] **Step 2: Add Chart rendering logic**

```javascript
// In vercel/public/dashboard.html, inside the existing <script> tag, add this function:

async function fetchWeeklyChart() {
    try {
        const response = await fetch('/api/smell-stats-weekly');
        if (!response.ok) throw new Error('Failed to fetch chart data');
        const data = await response.json();

        // Assign colors dynamically to datasets
        const colors = ['#00ff00', '#00cccc', '#cc00cc', '#cccc00', '#0000cc'];
        data.datasets.forEach((dataset, index) => {
            const color = colors[index % colors.length];
            dataset.backgroundColor = color + '80'; // 50% opacity
            dataset.borderColor = color;
            dataset.borderWidth = 1;
        });

        const ctx = document.getElementById('weeklySmellChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: false,
                        grid: { color: '#333333' },
                        ticks: { color: '#00ff00', font: { family: "'IBM Plex Mono', monospace" } }
                    },
                    y: {
                        stacked: false,
                        beginAtZero: true,
                        grid: { color: '#333333' },
                        ticks: { stepSize: 1, color: '#00ff00', font: { family: "'IBM Plex Mono', monospace" } }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#00ff00', font: { family: "'IBM Plex Mono', monospace" } }
                    },
                    tooltip: {
                        backgroundColor: '#000000',
                        titleColor: '#00ff00',
                        bodyColor: '#00ff00',
                        borderColor: '#00ff00',
                        borderWidth: 1,
                        titleFont: { family: "'IBM Plex Mono', monospace" },
                        bodyFont: { family: "'IBM Plex Mono', monospace" }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error fetching chart:', error);
    }
}

// Call it in the DOMContentLoaded listener
// Update existing line: document.addEventListener('DOMContentLoaded', fetchStats);
// To: 
// document.addEventListener('DOMContentLoaded', () => { fetchStats(); fetchWeeklyChart(); });
```

- [ ] **Step 3: Manually test in browser**

Run: `cd vercel && npm start`
Action: Open http://localhost:3000/dashboard.html in the browser and verify the chart renders properly with mock data.

- [ ] **Step 4: Commit**

```bash
git add vercel/public/dashboard.html
git commit -m "feat: add weekly smell breakdown chart to dashboard"
```
