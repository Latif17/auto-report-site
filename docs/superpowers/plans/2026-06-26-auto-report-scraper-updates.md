# Auto Report Scraper and Form Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the Barking Stink reporting tool to use explicit date/time inputs, translate them into GOV.UK scraper conditionally navigated paths, and display only the absolute latest incident in the community activity feed.

**Architecture:** We are updating the data schema to support `date_of_smell`. The backend simplifies insertion and stats retrieval (no more grouping). The frontend asks for `date` and `time` natively. The scraper reads the date, compares it to the current date, and takes the corresponding path on the GOV.UK site (Earlier today / Yesterday / Before yesterday).

**Tech Stack:** Node.js, Express, Puppeteer, Vanilla JS/CSS (Frontend), Supabase (PostgreSQL).

## Global Constraints

- Use standard Date/Time string formatting as required by input types (YYYY-MM-DD for dates, HH:MM for times).
- Do not introduce new dependencies.

---

### Task 1: Database Schema Updates

**Files:**
- Modify: `schema.sql`
- Create: `schema_update.sql`

**Interfaces:**
- Produces: Updated schema definitions for `incidents` table.

- [ ] **Step 1: Write schema update script**
Create `schema_update.sql` with the `ALTER TABLE` commands.

```sql
-- schema_update.sql
ALTER TABLE incidents ADD COLUMN date_of_smell DATE;
-- Note: time_of_smell is already TEXT, we will just use it as is, or nullable. We'll leave it as TEXT NOT NULL and just auto-fill if empty.
```

- [ ] **Step 2: Update base schema definition**
Update `schema.sql` to include `date_of_smell`.

```sql
-- schema.sql
-- Replace the incidents table definition with:
CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    date_of_smell DATE,
    time_of_smell TEXT NOT NULL,
    smell_type TEXT NOT NULL,
    business_location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

- [ ] **Step 3: Commit**

```bash
git add schema.sql schema_update.sql
git commit -m "db: add date_of_smell to incidents schema"
```

### Task 2: Backend API Updates (`server.js`)

**Files:**
- Modify: `server.js`
- Modify: `tests/server.test.js`

**Interfaces:**
- Consumes: JSON payloads for `/api/submit`
- Produces: JSON response for `/api/stats` containing `{ count: number, lastReport: string, recentIncidents: [ { ... } ] }` but only 1 recent incident.

- [ ] **Step 1: Update mock and failing tests**
Update `tests/server.test.js` (if it exists and covers these) or update the mock client in `server.js` directly since there is a heavy mock implementation at the top of `server.js`. Let's update `server.js` mock implementation directly for the tests.

Update the mock `supabase` client inside `server.js`:

```javascript
// Modify server.js mock returning incidents
if (table === 'incidents') {
    const mockTime = new Date();
    return resolve({
        count: 1,
        data: [{
            id: 9999,
            date_of_smell: mockTime.toISOString().split('T')[0],
            time_of_smell: mockTime.toTimeString().slice(0, 5),
            smell_type: 'Industrial Stench',
            business_location: 'Multiple (ReFood, Veolia, BioGas)',
            status: 'pending',
            created_at: mockTime.toISOString()
        }]
    });
}
```

- [ ] **Step 2: Update GET `/api/stats`**

Replace the complex grouping logic in `/api/stats` with a simple fetch for the single latest incident.

```javascript
// server.js - inside app.get('/api/stats')
        const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).throwOnError();
        const { data: sysData } = await supabase.from('system_stats').select('last_report_time').eq('id', 1).single().throwOnError();
        
        // Fetch only the absolute latest incident
        const { data: recentIncidents } = await supabase.from('incidents')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .throwOnError();

        let reportedIncidentIds = [];
        const userEmail = req.query.email;
        if (userEmail) {
            const { data: userReports } = await supabase.from('opted_in_user_reports')
                .select('incident_id')
                .eq('user_email', userEmail)
                .throwOnError();
            if (userReports) {
                reportedIncidentIds = userReports.map(r => r.incident_id);
            }
        }

        const formattedIncident = recentIncidents && recentIncidents.length > 0 ? {
            ...recentIncidents[0],
            alreadyReported: reportedIncidentIds.includes(recentIncidents[0].id)
        } : null;

        res.json({ count: count || 0, lastReport: sysData?.last_report_time, recentIncidents: formattedIncident ? [formattedIncident] : [] });
```

- [ ] **Step 3: Update POST `/api/submit`**

Remove grouping logic, insert directly. Handle `dateOfSmell` and `timeOfSmell`.

```javascript
// server.js - inside app.post('/api/submit')
    let { email, fullName, postcode, phone, address, dateOfSmell, timeOfSmell, smellType, businessLocation, shareData } = req.body;

    try {
        await supabase.from('system_stats').update({ last_report_time: new Date().toISOString() }).eq('id', 1).throwOnError();

        if (!timeOfSmell) {
            timeOfSmell = new Date().toTimeString().slice(0, 5);
        }
        if (!dateOfSmell) {
            dateOfSmell = new Date().toISOString().split('T')[0];
        }

        const { data: newIncident } = await supabase.from('incidents')
            .insert({ date_of_smell: dateOfSmell, time_of_smell: timeOfSmell, smell_type: smellType, business_location: businessLocation, status: 'pending' })
            .select()
            .single()
            .throwOnError();
        
        const incidentId = newIncident.id;

        if (shareData) {
            await supabase.from('users').upsert({ email, full_name: fullName, postcode, phone, address }).throwOnError();
        }

        const { error } = await supabase.from('opted_in_user_reports').insert({ incident_id: incidentId, user_email: email });
        if (error && error.code !== '23505') throw error;

        res.json({ success: true, message: "Report triggered", incidentId });
```

- [ ] **Step 4: Run server tests to verify**

```bash
npm test tests/server.test.js
```

- [ ] **Step 5: Commit**

```bash
git add server.js
git commit -m "feat: simplify api logic to use explicit date and time"
```

### Task 3: Frontend Form and Stats UI (`app.js` & `index.html`)

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.js`

**Interfaces:**
- Submits `dateOfSmell`, `timeOfSmell`, and `businessLocation` to API.

- [ ] **Step 1: Update index.html Form Fields**

Replace the time input section with:

```html
<!-- Inside #new-incident-section -->
<span class="time-label">LOG NEW STINK EVENT</span>
<div class="input-grid">
    <div class="input-group">
        <label for="businessLocation">Who are you reporting?</label>
        <select id="businessLocation" name="businessLocation" style="width: 100%; padding: 0.75rem; border: 2px solid var(--border); font-family: var(--font-mono);">
            <option value="Multiple (ReFood, Veolia, BioGas)">Multiple (ReFood, Veolia, BioGas)</option>
            <option value="ReFoods UK">ReFoods UK</option>
            <option value="East London BioGas">East London BioGas</option>
            <option value="Veolia">Veolia</option>
        </select>
    </div>
    
    <div class="input-group">
        <label for="dateOfSmell">Date of Smell</label>
        <input type="date" id="dateOfSmell" name="dateOfSmell" required style="width: 100%; padding: 0.75rem; border: 2px solid var(--border); font-family: var(--font-mono);">
    </div>
    
    <div class="input-group">
        <label for="timeOfSmell">Time of Detection</label>
        <input type="time" id="timeOfSmell" name="timeOfSmell" required style="width: 100%; padding: 0.75rem; border: 2px solid var(--border); font-family: var(--font-mono);">
    </div>
</div>
```

- [ ] **Step 2: Update index.html Community Section**

```html
<!-- Replace #active-incident-section with Last Reported Event info box if needed, or just let app.js render it into community-stats -->
<!-- Remove #active-incident-section HTML completely -->
```

- [ ] **Step 3: Update app.js default values and submission**

```javascript
// public/app.js - Set default date and time
    const now = new Date();
    document.getElementById('timeOfSmell').value = now.toTimeString().slice(0,5);
    // Format YYYY-MM-DD
    const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    document.getElementById('dateOfSmell').value = localDate;

// In form submission payload:
            dateOfSmell: document.getElementById('dateOfSmell').value,
            timeOfSmell: document.getElementById('timeOfSmell').value,
            smellType: 'Industrial Stench',
            businessLocation: document.getElementById('businessLocation').value,
```

- [ ] **Step 4: Update app.js fetchStats display logic**

Remove the grouping "Log This Time" button logic. Just display the last event.

```javascript
// public/app.js - Inside fetchStats()
            if (data.recentIncidents && data.recentIncidents.length > 0) {
                document.getElementById('active-alert').classList.add('hidden');
                
                const topIncident = data.recentIncidents[0];
                const isReported = topIncident.alreadyReported || localReported.includes(topIncident.id);
                
                const li = document.createElement('li');
                li.className = 'event-item';
                
                const detailsDiv = document.createElement('div');
                detailsDiv.className = 'event-details';
                
                const strongTime = document.createElement('strong');
                strongTime.textContent = `${topIncident.date_of_smell} at ${topIncident.time_of_smell}`;
                
                const companyDiv = document.createElement('div');
                companyDiv.textContent = `Reported: ${topIncident.business_location}`;
                companyDiv.style.color = "var(--ink-light)";
                companyDiv.style.marginTop = "0.25rem";
                
                detailsDiv.appendChild(strongTime);
                detailsDiv.appendChild(companyDiv);
                
                if (isReported) {
                    const tag = document.createElement('span');
                    tag.textContent = 'You Logged This';
                    tag.style.fontSize = '0.7rem';
                    tag.style.background = 'var(--success-bg)';
                    tag.style.padding = '2px 6px';
                    tag.style.borderRadius = '4px';
                    tag.style.marginLeft = '10px';
                    detailsDiv.appendChild(tag);
                }

                li.appendChild(detailsDiv);
                listEl.appendChild(li);
```

- [ ] **Step 5: Commit**

```bash
git add public/index.html public/app.js
git commit -m "feat: update UI to capture date and company directly"
```

### Task 4: Scraper Dynamic Routing (`scraper.js`)

**Files:**
- Modify: `scraper.js`

**Interfaces:**
- Consumes: `incidentData.dateOfSmell`, `incidentData.timeOfSmell`, `incidentData.businessLocation`

- [ ] **Step 1: Write Date helper logic**

Add a function to determine the GOV.UK label:

```javascript
// scraper.js
function getGovUkDateCategory(dateStr) {
    const target = new Date(dateStr);
    target.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diffTime = Math.abs(today - target);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Earlier today';
    if (diffDays === 1) return 'Yesterday';
    return 'Before yesterday';
}
```

- [ ] **Step 2: Update Scraper Navigation**

Modify the steps from Page 8 onwards:

```javascript
// scraper.js - inside submitGovForm

        // Page 8: What date?
        debugLog('Navigating to Page 8: What date?');
        const dateCategory = incidentData.dateOfSmell ? getGovUkDateCategory(incidentData.dateOfSmell) : 'Earlier today';
        await clickLabel(page, dateCategory);
        await goNext(page);

        // Conditional branch for Before yesterday
        if (dateCategory === 'Before yesterday') {
            debugLog('Navigating to Extra Page: What date did the smell start?');
            const [y, m, d] = incidentData.dateOfSmell.split('-');
            await page.evaluate((day, month, year) => {
                const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="number"]'));
                if (inputs[0]) inputs[0].value = parseInt(day, 10).toString();
                if (inputs[1]) inputs[1].value = parseInt(month, 10).toString();
                if (inputs[2]) inputs[2].value = year;
            }, d, m, y);
            await goNext(page);
        }

        // Page 9: What time?
        debugLog('Navigating to Page 9: What time?');
        const timeId = await page.evaluate(() => {
            const input = document.querySelector('input[type="text"], input[type="time"]');
            return input ? input.id : null;
        });
        const timeFormatted = formatTime(incidentData.timeOfSmell);
        if (timeId) {
            await page.evaluate((id) => document.getElementById(id).value = '', timeId);
            await page.type('#' + timeId, timeFormatted);
        }
        await goNext(page);

        // Page 10: Still there?
        debugLog('Navigating to Page 10: Still there?');
        await clickLabel(page, 'Yes'); // Could make this dynamic later
        await goNext(page);
```

Ensure Business Location is injected into Page 2:
```javascript
        // Page 2: Can you give details?
        debugLog('Navigating to Page 2: Can you give details?');
        await clickLabel(page, 'Yes');
        await page.evaluate((location) => {
            const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
            if(inputs[0]) inputs[0].value = location || 'ReFoods UK (Dagenham), East London BioGas, Veolia Dagenham';
            if(inputs[1]) inputs[1].value = 'Choats Rd Dagenham';
            if(inputs[2]) inputs[2].value = 'RM9 6LF';
        }, incidentData.businessLocation || incidentData.business_location);
```

- [ ] **Step 3: Run scraper tests**

```bash
npm test tests/scraper.test.js
```

- [ ] **Step 4: Commit**

```bash
git add scraper.js
git commit -m "feat: dynamic scraper routing based on explicit date"
```
