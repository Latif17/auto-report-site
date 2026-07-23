# Personal Report Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user-specific "additional notes" field to incident reports that is submitted to GOV.UK but kept private from the community pool.

**Architecture:** We will add `additional_notes` to `opted_in_user_reports`, update the Express `/api/submit` and `/api/join` routes, update `index.html`/`app.js` to collect the input, and finally update the Node.js scraper script to inject this note on Page 19 of the GOV.UK form.

**Tech Stack:** Node.js, Express, Vanilla JS, HTML, Supabase (PostgreSQL), Puppeteer.

## Global Constraints

- No Tailwind CSS (standard Vanilla CSS is used)
- Avoid generic placeholders (none allowed here)

---

### Task 1: Supabase Database Update

**Files:**
- Create: `supabase/schema_update_additional_notes.sql`
- Modify: `supabase/schema.sql:19-28`

**Interfaces:**
- Consumes: N/A
- Produces: `additional_notes` (TEXT) column in `opted_in_user_reports`

- [ ] **Step 1: Create a migration script**

Create `supabase/schema_update_additional_notes.sql` with the following content:

```sql
ALTER TABLE opted_in_user_reports ADD COLUMN additional_notes TEXT;
```

- [ ] **Step 2: Update the base schema**

Modify `supabase/schema.sql` to include `additional_notes` in the `CREATE TABLE opted_in_user_reports` definition.

```sql
CREATE TABLE opted_in_user_reports (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id),
  user_email TEXT,
  status TEXT DEFAULT 'pending',
  additional_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE
);
```

- [ ] **Step 3: Commit**

```bash
git add supabase/schema_update_additional_notes.sql supabase/schema.sql
git commit -m "feat: add additional_notes column to opted_in_user_reports"
```

---

### Task 2: Backend API Update

**Files:**
- Modify: `vercel/server.js:370-380` (approx, `/api/submit` function)
- Modify: `vercel/server.js:390-405` (approx, `/api/join` function)

**Interfaces:**
- Consumes: HTTP POST with `{ additionalNotes: string }`
- Produces: `additional_notes` value saved to DB.

- [ ] **Step 1: Update `/api/submit`**

In `vercel/server.js`, inside `app.post('/api/submit', ...)`, destructure `additionalNotes` from `req.body`:

```javascript
    let { email, fullName, postcode, phone, address, dateOfSmell, timeOfSmell, smellType, businessLocation, shareData, additionalNotes } = req.body;
```

Then update the `opted_in_user_reports` insert call to include `additional_notes: additionalNotes`:

```javascript
        if (email) {
            insertPromises.push(supabase.from('opted_in_user_reports').insert({ incident_id: incidentId, user_email: email, additional_notes: additionalNotes }).then(({error}) => {
                if (error && error.code !== '23505') throw error;
            }));
        }
```

- [ ] **Step 2: Update `/api/join`**

In `vercel/server.js`, inside `app.post('/api/join', ...)`, destructure `additionalNotes` from `req.body`:

```javascript
    let { email, fullName, postcode, phone, address, incidentId, shareData, additionalNotes } = req.body;
```

Then update the `opted_in_user_reports` insert call:

```javascript
            supabase.from('opted_in_user_reports').insert({ incident_id: incidentId, user_email: email, additional_notes: additionalNotes }).then(({error}) => {
                if (error && error.code !== '23505') throw error;
            }),
```

- [ ] **Step 3: Commit**

```bash
git add vercel/server.js
git commit -m "feat: update backend APIs to accept additionalNotes"
```

---

### Task 3: Frontend UI Update

**Files:**
- Modify: `vercel/public/index.html:125-135`, `vercel/public/index.html:160-170`
- Modify: `vercel/public/app.js:165-185`, `vercel/public/app.js:300-335`

**Interfaces:**
- Consumes: User text input
- Produces: API calls containing `additionalNotes`

- [ ] **Step 1: Update HTML for Active Incident**

In `vercel/public/index.html`, inside `#active-incident-section` (around line 125), add a textarea just before the `join-incident-btn`:

```html
                    <div class="input-group full-width" style="margin-bottom: 1rem;">
                        <label for="joinAdditionalNotes" style="text-align: left; display: block;">Is there anything else you'd like to add? (Optional)</label>
                        <textarea id="joinAdditionalNotes" name="joinAdditionalNotes" rows="2" placeholder="e.g. I have asthma and this smell gives me a headache."></textarea>
                        <div style="font-size: 0.8rem; color: var(--ink-light); margin-top: 0.25rem; text-align: left;">This personal note is sent directly to the EPA/Gov.UK for this specific report. It is NOT shared with your neighbors.</div>
                    </div>
```

- [ ] **Step 2: Update HTML for New Incident**

In `vercel/public/index.html`, inside `#new-incident-section` (around line 165), add a textarea just before the `submit-btn` (after the `timeOfSmell` group):

```html
                        <div class="input-group full-width">
                            <label for="newAdditionalNotes">Is there anything else you'd like to add? (Optional)</label>
                            <textarea id="newAdditionalNotes" name="newAdditionalNotes" rows="2" placeholder="e.g. I have asthma and this smell gives me a headache."></textarea>
                            <div style="font-size: 0.8rem; color: var(--ink-light); margin-top: 0.25rem; line-height: 1.4;">This personal note is sent directly to the EPA/Gov.UK for this specific report. It is NOT shared with your neighbors.</div>
                        </div>
```

- [ ] **Step 3: Update `app.js` for Submit**

In `vercel/public/app.js`, inside the `form.addEventListener('submit', ...)` function, read the correct textarea based on `joinIncidentId` and add it to `formData`. Around line 170:

```javascript
            const formData = {
                fullName: document.getElementById('fullName').value,
                email: document.getElementById('email').value,
                postcode: document.getElementById('postcode').value,
                phone: document.getElementById('phone').value,
                address: document.getElementById('address').value,
                dateOfSmell: document.getElementById('dateOfSmell').value,
                timeOfSmell: document.getElementById('timeOfSmell').value,
                smellType: mappedSmellType,
                businessLocation: mappedBusinessLocation,
                storeLocally: document.getElementById('storeLocally').checked,
                shareData: document.getElementById('shareData').checked,
                additionalNotes: joinIncidentId ? document.getElementById('joinAdditionalNotes').value.trim() : document.getElementById('newAdditionalNotes').value.trim()
            };
```

- [ ] **Step 4: Update `app.js` for Join (global `window.joinIncident`)**

In `vercel/public/app.js`, update `window.joinIncident` (around line 315) to include `additionalNotes`:

```javascript
        const shareData = document.getElementById('shareData').checked;
        const additionalNotes = document.getElementById('joinAdditionalNotes').value.trim();
```

And include it in `data`:
```javascript
            data = {
                fullName,
                email,
                postcode,
                address,
                phone,
                storeLocally,
                shareData,
                additionalNotes
            };
```
And fallback from `localStorage`:
```javascript
                        data = {
                            fullName: parsed.fullName,
                            email: parsed.email,
                            postcode: parsed.postcode,
                            address: parsed.address,
                            phone: parsed.phone || '',
                            storeLocally: parsed.storeLocally !== false,
                            shareData: parsed.shareData === true,
                            additionalNotes
                        };
```

- [ ] **Step 5: Commit**

```bash
git add vercel/public/index.html vercel/public/app.js
git commit -m "feat: add additional notes textarea to frontend forms"
```

---

### Task 4: Scraper Automation Update

**Files:**
- Modify: `homelab/run-scraper.js:60-70`, `homelab/run-scraper.js:145-165`
- Modify: `homelab/scraper.js:350-355`

**Interfaces:**
- Consumes: `additional_notes` from DB query
- Produces: `incidentData.description` passed to Puppeteer

- [ ] **Step 1: Query `additional_notes` in `run-scraper.js`**

In `homelab/run-scraper.js`, line 64, change the select query to include `additional_notes`:

```javascript
    const { data: allUserReports, error: reportsError } = await supabase
        .from('opted_in_user_reports')
        .select('incident_id, user_email, additional_notes')
        .in('incident_id', incidentIds);
```

- [ ] **Step 2: Inject `description` into `incidentData` in `run-scraper.js`**

In `homelab/run-scraper.js`, inside the `for (const user of users)` loop (around line 150), extract the note and assign it:

```javascript
                    const tsDate = new Date(incident.smell_timestamp);
                    const dateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" });
                    const timeFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hour12: false });
                    
                    const userReport = (allUserReports || []).find(r => r.incident_id === incident.id && r.user_email === user.email);
                    const additionalNotes = userReport && userReport.additional_notes ? userReport.additional_notes : '';
                    
                    const incidentData = {
                        dateOfSmell: dateFormatter.format(tsDate),
                        timeOfSmell: timeFormatter.format(tsDate),
                        smellType: incident.smell_type,
                        businessLocation: incident.business_location,
                        description: additionalNotes
                    };
```

- [ ] **Step 3: Update `scraper.js` logic if needed**

In `homelab/scraper.js`, around line 354, verify how it sets `ta.value`:
It's currently:
```javascript
        await page.evaluate((desc) => {
            const ta = document.querySelector('textarea');
            if (ta) { ta.value = desc || ''; ta.dispatchEvent(new Event('input', { bubbles: true })); }
        }, incidentData.smellType ? `Reported as: ${incidentData.smellType}. Details: ${incidentData.description || ''}` : incidentData.description || '');
```
This is actually correct as-is, but we can make it cleaner to avoid outputting `Details: ` if there are no additional notes. Modify `scraper.js` around line 354:

```javascript
        const buildDescription = () => {
            if (incidentData.smellType && incidentData.description) {
                return `Reported as: ${incidentData.smellType}. Details: ${incidentData.description}`;
            } else if (incidentData.smellType) {
                return `Reported as: ${incidentData.smellType}.`;
            } else {
                return incidentData.description || '';
            }
        };

        await page.evaluate((desc) => {
            const ta = document.querySelector('textarea');
            if (ta) { ta.value = desc || ''; ta.dispatchEvent(new Event('input', { bubbles: true })); }
        }, buildDescription());
```

- [ ] **Step 4: Commit**

```bash
git add homelab/run-scraper.js homelab/scraper.js
git commit -m "feat: use user-specific additional notes in GOV.UK scraper"
```
