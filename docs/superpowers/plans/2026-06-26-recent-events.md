# Recent Events Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to select a recent smell event to auto-populate the form with previously submitted incident details, without storing PII for non-opted-in users.

**Architecture:** A new `incidents` table stores anonymous event details. The `/api/submit` endpoint handles deduping and logs opted-in users to `opted_in_user_reports`. `/api/stats` returns grouped incidents. The frontend displays these and allows 1-click auto-population of the form inputs.

**Tech Stack:** HTML/CSS/Vanilla JS (Frontend), Node/Express/Supabase (Backend), Puppeteer (Scraper)

## Global Constraints
- Do not store user email/PII in the database if `shareData` is false.
- Keep the design vibrant, modern, and matching the existing CSS.

---

### Task 1: Update Database Schema

**Files:**
- Modify: `backend/schema.sql`

**Interfaces:**
- Produces: `incidents` table and `opted_in_user_reports` table for the backend to use.

- [ ] **Step 1: Update schema.sql with new tables**

```sql
-- Add to the end of backend/schema.sql
CREATE TABLE incidents (
  id SERIAL PRIMARY KEY,
  time_of_smell TEXT,
  smell_type TEXT,
  business_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE opted_in_user_reports (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id),
  user_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

- [ ] **Step 2: Commit**

```bash
git add backend/schema.sql
git commit -m "db: add incidents and opted_in_user_reports tables"
```

---

### Task 2: Scraper Updates

**Files:**
- Modify: `backend/scraper.js`

**Interfaces:**
- Consumes: `incidentData.smellType` and `incidentData.businessLocation`
- Produces: Updated `submitGovForm` that dynamically types the location and smell.

- [ ] **Step 1: Update submitGovForm logic**

```javascript
// In backend/scraper.js, inside submitGovForm function, replace the hardcoded "Page 2" inputs.
// Find the Page 2 logic:
        // Page 2: Can you give details?
        await clickLabel(page, 'Yes');
        await page.evaluate((location) => {
            const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
            if(inputs[0]) inputs[0].value = location || 'ReFoods UK (Dagenham), East London BioGas, Veolia Dagenham';
            if(inputs[1]) inputs[1].value = 'Choats Rd Dagenham';
            if(inputs[2]) inputs[2].value = 'RM9 6LF';
        }, incidentData.businessLocation);
        await goNext(page);

// And find the Page 6 logic (Describe smell):
        // Page 6: Describe smell
        if (incidentData.smellType && incidentData.smellType !== 'Other') {
            await clickLabel(page, incidentData.smellType);
        } else {
            await clickLabel(page, 'You cannot describe it');
        }
        await goNext(page);
```

- [ ] **Step 2: Commit**

```bash
git add backend/scraper.js
git commit -m "feat(scraper): use dynamic smell type and business location"
```

---

### Task 3: Update `/api/submit` endpoint

**Files:**
- Modify: `backend/server.js`

**Interfaces:**
- Consumes: `req.body.timeOfSmell`, `req.body.smellType`, `req.body.businessLocation`
- Produces: `incident.id` in response, inserts into `incidents` and `opted_in_user_reports`.

- [ ] **Step 1: Modify `/api/submit` endpoint**

```javascript
// In backend/server.js, update /api/submit:
app.post('/api/submit', async (req, res) => {
    const { email, fullName, postcode, phone, address, timeOfSmell, smellType, businessLocation, shareData } = req.body;
    
    const userData = { email, fullName, postcode, phone, address };
    const incidentData = { timeOfSmell, smellType, businessLocation };

    try {
        await supabase.from('system_stats').update({ last_report_time: new Date().toISOString() }).eq('id', 1).throwOnError();

        // Check for existing incident in last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        let { data: existingIncidents } = await supabase.from('incidents')
            .select('id')
            .eq('time_of_smell', timeOfSmell)
            .eq('smell_type', smellType)
            .eq('business_location', businessLocation)
            .gte('created_at', oneHourAgo);

        let incidentId;
        if (existingIncidents && existingIncidents.length > 0) {
            incidentId = existingIncidents[0].id;
        } else {
            const { data: newIncident } = await supabase.from('incidents')
                .insert({ time_of_smell: timeOfSmell, smell_type: smellType, business_location: businessLocation })
                .select()
                .single();
            incidentId = newIncident.id;
        }

        if (shareData) {
            await supabase.from('users').upsert({ email, full_name: fullName, postcode, phone, address }).throwOnError();
            await supabase.from('opted_in_user_reports').insert({ incident_id: incidentId, user_email: email });
        }

        res.json({ success: true, message: "Report triggered", incidentId });

        (async () => {
            try {
                await submitGovForm(userData, incidentData);
                await triggerMassReporting(incidentData, email, incidentId);
            } catch (err) {
                console.error("Background submission error:", err);
            }
        })();
    } catch (error) {
        console.error('Submit error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
```

- [ ] **Step 2: Update `triggerMassReporting`**

```javascript
// Also in backend/server.js, update triggerMassReporting signature and logic:
async function triggerMassReporting(incidentData, excludeEmail, incidentId) {
    const { data: users } = await supabase.from('users').select('*');
    if (!users) return;
    
    for (const user of users) {
        if (user.email === excludeEmail) continue;
        const userData = {
            email: user.email,
            fullName: user.full_name,
            postcode: user.postcode,
            phone: user.phone,
            address: user.address
        };
        await submitGovForm(userData, incidentData);
        await supabase.from('opted_in_user_reports').insert({ incident_id: incidentId, user_email: user.email });
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/server.js
git commit -m "feat(api): handle incident creation and opt-in tracking in /api/submit"
```

---

### Task 4: Update `/api/stats` endpoint

**Files:**
- Modify: `backend/server.js`

**Interfaces:**
- Consumes: optional `req.query.email`
- Produces: `incidents` array with `alreadyReported` flag.

- [ ] **Step 1: Modify `/api/stats` endpoint**

```javascript
app.get('/api/stats', async (req, res) => {
    try {
        const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).throwOnError();
        const { data: sysData } = await supabase.from('system_stats').select('last_report_time').eq('id', 1).single().throwOnError();
        
        // Fetch recent incidents
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: recentIncidents } = await supabase.from('incidents')
            .select('*')
            .gte('created_at', twentyFourHoursAgo)
            .order('created_at', { ascending: false });

        let reportedIncidentIds = [];
        const userEmail = req.query.email;
        if (userEmail) {
            const { data: userReports } = await supabase.from('opted_in_user_reports')
                .select('incident_id')
                .eq('user_email', userEmail);
            if (userReports) {
                reportedIncidentIds = userReports.map(r => r.incident_id);
            }
        }

        // Group incidents
        const grouped = [];
        if (recentIncidents) {
            recentIncidents.forEach(inc => {
                const existing = grouped.find(g => 
                    g.time_of_smell === inc.time_of_smell && 
                    g.smell_type === inc.smell_type && 
                    g.business_location === inc.business_location
                );
                if (existing) {
                    existing.report_count++;
                    if (reportedIncidentIds.includes(inc.id)) {
                        existing.alreadyReported = true;
                    }
                } else {
                    grouped.push({
                        id: inc.id,
                        time_of_smell: inc.time_of_smell,
                        smell_type: inc.smell_type,
                        business_location: inc.business_location,
                        report_count: 1,
                        alreadyReported: reportedIncidentIds.includes(inc.id)
                    });
                }
            });
        }

        res.json({ count: count || 0, lastReport: sysData?.last_report_time, recentIncidents: grouped.slice(0, 5) });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
```

- [ ] **Step 2: Commit**

```bash
git add backend/server.js
git commit -m "feat(api): update /api/stats to return grouped recent incidents"
```

---

### Task 5: Frontend Form Updates

**Files:**
- Modify: `index.html`, `app.js`

**Interfaces:**
- Consumes: User inputs for Smell Type and Location

- [ ] **Step 1: Add Dropdowns to `index.html`**

```html
<!-- Inside <form id="report-form">, after "Time of Smell" group -->
<div class="input-group">
    <label for="smellType">Type of Smell</label>
    <select id="smellType" name="smellType" required>
        <option value="" disabled selected>Select smell type</option>
        <option value="Rotten eggs">Rotten eggs</option>
        <option value="Sewage">Sewage</option>
        <option value="Chemical">Chemical</option>
        <option value="Garbage">Garbage</option>
        <option value="Other">Other</option>
    </select>
</div>
<div class="input-group">
    <label for="businessLocation">Business Location</label>
    <select id="businessLocation" name="businessLocation" required>
        <option value="" disabled selected>Select location</option>
        <option value="ReFoods UK (Dagenham)">ReFoods UK (Dagenham)</option>
        <option value="East London BioGas">East London BioGas</option>
        <option value="Veolia Dagenham">Veolia Dagenham</option>
    </select>
</div>
```

- [ ] **Step 2: Collect fields in `app.js` and track locally**

```javascript
// In app.js formData object:
            smellType: document.getElementById('smellType').value,
            businessLocation: document.getElementById('businessLocation').value,

// Update the fetchStats call to include email if available:
    async function fetchStats() {
        try {
            const dataStr = localStorage.getItem('freshAirWatchData_v2') || localStorage.getItem('freshAirWatchData');
            let emailQuery = '';
            if (dataStr) {
                const parsed = JSON.parse(dataStr);
                if (parsed.email && parsed.shareData) {
                    emailQuery = `?email=${encodeURIComponent(parsed.email)}`;
                }
            }
            const res = await fetch('http://localhost:3000/api/stats' + emailQuery);
            // ... rest of fetchStats (will be updated in next task)
```

```javascript
// In app.js submit handler, handle incident tracking for local users:
        try {
            const response = await simulateSubmission(formData);
            if (response.incidentId) {
                let reported = JSON.parse(localStorage.getItem('reported_incidents') || '[]');
                reported.push(response.incidentId);
                localStorage.setItem('reported_incidents', JSON.stringify(reported));
            }
            fetchStats(); // Refresh stats to update buttons
```

- [ ] **Step 3: Commit**

```bash
git add index.html app.js
git commit -m "feat(ui): add smell type and location dropdowns to form"
```

---

### Task 6: Frontend Community Stats UI Updates

**Files:**
- Modify: `index.html`, `app.js`, `style.css`

**Interfaces:**
- Consumes: `/api/stats` data

- [ ] **Step 1: Update `index.html` structure**

```html
<!-- Inside #community-stats -->
                        <div id="community-stats" class="stats-card">
                            <h3>Community Stats</h3>
                            <p><span id="opted-in-count">0</span> Barking Riverside neighbors standing by.</p>
                            <div id="recent-events-container">
                                <h4>Recent Events</h4>
                                <ul id="recent-events-list"></ul>
                            </div>
                            <p id="active-alert" class="alert-danger hidden">No one has reported a smell recently. Be the one to trigger the mass report today!</p>
                        </div>
```

- [ ] **Step 2: Update `style.css`**

```css
/* Add to style.css */
#recent-events-container { margin-top: 15px; }
#recent-events-list { list-style: none; padding: 0; margin: 0; }
.event-item { background: rgba(255,255,255,0.1); border-radius: 8px; padding: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
.event-details { font-size: 0.9rem; }
.btn-small { padding: 5px 10px; font-size: 0.8rem; background: var(--primary); color: white; border: none; border-radius: 4px; cursor: pointer; }
.btn-small:disabled { background: #666; cursor: not-allowed; }
```

- [ ] **Step 3: Update `fetchStats` in `app.js` to render list**

```javascript
// Replace the old fetchStats DOM logic with:
            document.getElementById('opted-in-count').innerText = data.count;
            document.getElementById('submit-btn-text').innerText = `Submit & Trigger ${data.count} Community Reports`;
            
            const listEl = document.getElementById('recent-events-list');
            listEl.innerHTML = '';
            
            let localReported = JSON.parse(localStorage.getItem('reported_incidents') || '[]');

            if (data.recentIncidents && data.recentIncidents.length > 0) {
                document.getElementById('active-alert').style.display = 'none';
                data.recentIncidents.forEach(inc => {
                    const li = document.createElement('li');
                    li.className = 'event-item';
                    
                    const isReported = inc.alreadyReported || localReported.includes(inc.id);
                    
                    li.innerHTML = `
                        <div class="event-details">
                            <strong>${inc.time_of_smell}</strong> - ${inc.smell_type} at ${inc.business_location}<br>
                            <small>${inc.report_count} report(s)</small>
                        </div>
                        <button class="btn-small select-event-btn" data-time="${inc.time_of_smell}" data-type="${inc.smell_type}" data-loc="${inc.business_location}" ${isReported ? 'disabled' : ''}>
                            ${isReported ? 'Already Reported' : 'Report this too'}
                        </button>
                    `;
                    listEl.appendChild(li);
                });

                document.querySelectorAll('.select-event-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        document.getElementById('timeOfSmell').value = e.target.dataset.time;
                        document.getElementById('smellType').value = e.target.dataset.type;
                        document.getElementById('businessLocation').value = e.target.dataset.loc;
                        document.getElementById('report-form').scrollIntoView({ behavior: 'smooth' });
                    });
                });
            } else {
                document.getElementById('active-alert').style.display = 'block';
            }
```

- [ ] **Step 4: Commit**

```bash
git add index.html app.js style.css
git commit -m "feat(ui): render recent events list and allow auto-population"
```
