# Dashboard Tweaks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement UI/UX improvements to the dashboard including week/month navigation, chart overhauls, category filtering, and backend caching.

**Architecture:** Client-side processing using `Chart.js` for dynamic UI updates without network overhead, backed by a CDN-cached full dataset payload from the `/api/smell-stats-all` endpoint.

**Tech Stack:** Vanilla JS, Chart.js, Express (Backend).

## Global Constraints
- No PII is allowed to be returned by public dashboard APIs (must pass pii-allowlist.test.js).
- The UI must retain its "STINK LOG" dark terminal aesthetic.
- Chart instances must be properly destroyed when switching tabs or updating views to avoid memory leaks.
- Client-side processing must handle empty states gracefully without throwing errors.

---

### Task 1: Backend API Caching

**Files:**
- Modify: `vercel/server.js`
- Test: `vercel/tests/server.test.js`

**Interfaces:**
- Produces: `GET /api/smell-stats-all` response with `Cache-Control` headers.

- [ ] **Step 1: Write the failing test**
Modify `vercel/tests/server.test.js` to assert the header.

```javascript
describe('GET /api/smell-stats-all', () => {
    // ... existing tests ...
    it('sets Cache-Control headers for Edge Caching', async () => {
        const response = await request(app).get('/api/smell-stats-all');
        expect(response.headers['cache-control']).toBe('public, s-maxage=300, stale-while-revalidate=600');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test tests/server.test.js`
Expected: FAIL (header is undefined or doesn't match)

- [ ] **Step 3: Write minimal implementation**
In `vercel/server.js`, inside the `/api/smell-stats-all` route handler:

```javascript
app.get('/api/smell-stats-all', async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
        // ... existing logic ...
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test tests/server.test.js`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add vercel/server.js vercel/tests/server.test.js
git commit -m "perf: add edge caching headers to /api/smell-stats-all"
```

---

### Task 2: Trends Charts Filtering & Heatmap Update

**Files:**
- Modify: `vercel/public/dashboard.html`

**Interfaces:**
- Consumes: `allHistoricalData`

- [ ] **Step 1: Write minimal implementation (Trends Filtering & Heatmap Axis)**
Update `renderTrendsCharts()` in `vercel/public/dashboard.html`:

```javascript
        function renderTrendsCharts() {
            if (allHistoricalData.length === 0) return;
            
            const validCategories = new Set(["Sewage", "Rubbish or refuse", "Plastic"]);
            const monthlyTotals = {};
            const monthlyByType = {};
            const allTypes = new Set();
            const heatmapData = {};
            
            allHistoricalData.forEach(inc => {
                const smell = inc.smellType;
                if (!validCategories.has(smell)) return; // Filter invalid categories
                
                const d = new Date(inc.timestamp);
                const label = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
                allTypes.add(smell);
                
                monthlyTotals[label] = (monthlyTotals[label] || 0) + 1;
                
                if (!monthlyByType[smell]) monthlyByType[smell] = {};
                monthlyByType[smell][label] = (monthlyByType[smell][label] || 0) + 1;
                
                // Heatmap logic per smell type
                if (!heatmapData[smell]) heatmapData[smell] = {};
                const heatKey = `${d.getHours()},${d.getDay()}`;
                heatmapData[smell][heatKey] = (heatmapData[smell][heatKey] || 0) + 1;
            });
            
            // Format heatmap datasets (bubble chart)
            const heatDatasets = Array.from(allTypes).map((smell, i) => {
                const color = chartColors[i % chartColors.length];
                const data = Object.keys(heatmapData[smell]).map(k => {
                    const [x, y] = k.split(',').map(Number);
                    return { x, y, r: Math.min(heatmapData[smell][k] * 2, 20) };
                });
                return {
                    label: smell,
                    data: data,
                    backgroundColor: color + '99',
                    borderColor: color
                };
            });

            // ... totalCtx and typeCtx logic remain mostly the same, but they use the filtered allTypes ...

            // Heatmap (Scatter/Bubble) update
            const heatCtx = document.getElementById('trendsHeatmapChart').getContext('2d');
            if (chartInstances.trendsHeatmap) chartInstances.trendsHeatmap.destroy();
            chartInstances.trendsHeatmap = new Chart(heatCtx, {
                type: 'bubble',
                data: { datasets: heatDatasets },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: {
                        x: { 
                            title: { display: true, text: 'Hour of Day (0-23)', color: '#888' },
                            grid: { color: '#333333' }, ticks: { stepSize: 1, color: '#00ff00', font: { family: "'IBM Plex Mono', monospace" } },
                            min: 0, max: 23
                        },
                        y: { 
                            title: { display: true, text: 'Day of Week', color: '#888' },
                            grid: { color: '#333333' }, ticks: { 
                                stepSize: 1, color: '#00ff00', font: { family: "'IBM Plex Mono', monospace" },
                                callback: function(value) { return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][value]; }
                            },
                            min: -1, max: 7
                        }
                    },
                    plugins: { legend: { labels: { color: '#00ff00', font: { family: "'IBM Plex Mono', monospace" } } } }
                }
            });
        }
```
*(Implementer must also ensure totalCtx and typeCtx chart creation logic is updated to use the filtered `labels` and `typeDatasets` correctly.)*

- [ ] **Step 2: Commit**
```bash
git add vercel/public/dashboard.html
git commit -m "feat: filter trends by valid categories and fix heatmap axes"
```

---

### Task 3: Weekly Chart Overhaul

**Files:**
- Modify: `vercel/public/dashboard.html`
- Modify: `vercel/public/style.css`

**Interfaces:**
- State: `currentWeekOffset`

- [ ] **Step 1: Update HTML Structure**
Add navigation buttons above the weekly chart in `dashboard.html`.

```html
                <div id="tab-weekly" class="tab-content active">
                    <div class="nav-header">
                        <h2>> WEEKLY_SMELL_BREAKDOWN</h2>
                        <div class="nav-controls">
                            <button onclick="changeWeek(-1)">[ < PREV ]</button>
                            <span id="week-label">CURRENT WEEK</span>
                            <button id="next-week-btn" onclick="changeWeek(1)" disabled>[ NEXT > ]</button>
                        </div>
                    </div>
                    <canvas id="weeklySmellChart" style="max-height: 300px;"></canvas>
                </div>
```

- [ ] **Step 2: Add CSS**
In `style.css`:
```css
.nav-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}
.nav-controls button {
    background: none;
    border: none;
    color: #00ff00;
    font-family: 'IBM Plex Mono', monospace;
    cursor: pointer;
}
.nav-controls button:disabled {
    color: #333333;
    cursor: not-allowed;
}
.nav-controls span {
    margin: 0 1rem;
    color: #fff;
}
```

- [ ] **Step 3: Update JS Logic**
In `dashboard.html`, add `currentWeekOffset = 0;` to global state. Remove `fetchWeeklyChart` and replace with `renderWeeklyChart`. Also add `changeWeek`.

```javascript
        let currentWeekOffset = 0;
        
        function changeWeek(delta) {
            currentWeekOffset += delta;
            if (currentWeekOffset > 0) currentWeekOffset = 0;
            document.getElementById('next-week-btn').disabled = (currentWeekOffset === 0);
            renderWeeklyChart();
        }

        function renderWeeklyChart() {
            if (allHistoricalData.length === 0) return;
            
            const now = new Date();
            now.setDate(now.getDate() + (currentWeekOffset * 7));
            const endOfWeek = new Date(now);
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - 6); // 7 day window
            
            // Format label
            const startStr = startOfWeek.toLocaleDateString();
            const endStr = endOfWeek.toLocaleDateString();
            document.getElementById('week-label').innerText = `${startStr} - ${endStr}`;
            
            const counts = {};
            const allTypes = new Set();
            const labels = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date(startOfWeek);
                d.setDate(startOfWeek.getDate() + i);
                labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
            }
            
            allHistoricalData.forEach(inc => {
                const d = new Date(inc.timestamp);
                if (d >= startOfWeek.setHours(0,0,0,0) && d <= endOfWeek.setHours(23,59,59,999)) {
                    const smell = inc.smellType;
                    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
                    allTypes.add(smell);
                    if (!counts[smell]) counts[smell] = {};
                    counts[smell][dayLabel] = (counts[smell][dayLabel] || 0) + 1;
                }
            });
            
            const datasets = Array.from(allTypes).map((smell, i) => {
                const color = chartColors[i % chartColors.length];
                return {
                    label: smell,
                    data: labels.map(l => counts[smell][l] || 0),
                    backgroundColor: color + '80',
                    borderColor: color,
                    borderWidth: 1
                };
            });
            
            const ctx = document.getElementById('weeklySmellChart').getContext('2d');
            if (chartInstances.weekly) chartInstances.weekly.destroy();
            chartInstances.weekly = new Chart(ctx, {
                type: 'bar',
                data: { labels, datasets },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: {
                        x: { stacked: true, grid: { color: '#333333' }, ticks: { color: '#00ff00', font: { family: "'IBM Plex Mono', monospace" } } },
                        y: { stacked: true, grid: { color: '#333333' }, ticks: { stepSize: 1, color: '#00ff00', font: { family: "'IBM Plex Mono', monospace" } } }
                    },
                    plugins: {
                        legend: { labels: { color: '#00ff00', font: { family: "'IBM Plex Mono', monospace" } } },
                        tooltip: { backgroundColor: '#000000', titleColor: '#00ff00', bodyColor: '#00ff00', borderColor: '#00ff00', borderWidth: 1 }
                    }
                }
            });
        }
```

- [ ] **Step 4: Update `switchTab`**
Change `switchTab` to call `renderWeeklyChart` instead of `fetchWeeklyChart`. Remove the legacy `weeklySmellChartInstance` handling entirely from the file since `chartInstances.weekly` is used now.

- [ ] **Step 5: Commit**
```bash
git add vercel/public/dashboard.html vercel/public/style.css
git commit -m "feat: rewrite weekly chart to use client data with week navigation and stacked bars"
```

---

### Task 4: Monthly Chart Navigation

**Files:**
- Modify: `vercel/public/dashboard.html`

**Interfaces:**
- State: `currentMonthOffset`

- [ ] **Step 1: Update HTML Structure**
Add navigation buttons above the monthly chart in `dashboard.html`.

```html
                <div id="tab-monthly" class="tab-content" style="display: none;">
                    <div class="nav-header">
                        <h2>> MONTHLY_SMELL_BREAKDOWN</h2>
                        <div class="nav-controls">
                            <button onclick="changeMonth(-1)">[ < PREV ]</button>
                            <span id="month-label">CURRENT MONTH</span>
                            <button id="next-month-btn" onclick="changeMonth(1)" disabled>[ NEXT > ]</button>
                        </div>
                    </div>
                    <canvas id="monthlySmellChart" style="max-height: 300px;"></canvas>
                </div>
```

- [ ] **Step 2: Update JS Logic**
In `dashboard.html`, add `currentMonthOffset = 0;` and `changeMonth`. Update `renderMonthlyChart`.

```javascript
        let currentMonthOffset = 0;
        
        function changeMonth(delta) {
            currentMonthOffset += delta;
            if (currentMonthOffset > 0) currentMonthOffset = 0;
            document.getElementById('next-month-btn').disabled = (currentMonthOffset === 0);
            renderMonthlyChart();
        }

        function renderMonthlyChart() {
            if (allHistoricalData.length === 0) return;
            
            const now = new Date();
            now.setMonth(now.getMonth() + currentMonthOffset);
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            
            document.getElementById('month-label').innerText = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
            
            // ... existing renderMonthlyChart grouping logic ...
            // Uses currentMonth and currentYear to filter.
```

- [ ] **Step 3: Commit**
```bash
git add vercel/public/dashboard.html
git commit -m "feat: add previous and next month navigation to monthly chart"
```
