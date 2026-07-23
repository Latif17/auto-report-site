# Abuse Prevention & Smell Types Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce a 2-hour spam prevention window for actionable reports and update smell types with an internal-only "Can't tell" option.

**Architecture:** Modifies frontend dropdown and mapping logic. Updates the server's submit endpoint to enforce a 2-hour deduplication window ignoring `internal_only` reports, and creates "Can't tell" reports with an `internal_only` status.

**Tech Stack:** Node.js, Express, Vanilla JS

## Global Constraints

- Increment version in `changelog.json` before completing feature.

---

### Task 1: Update Frontend Options

**Files:**
- Modify: `vercel/public/index.html`
- Modify: `vercel/public/app.js`

**Interfaces:**
- Consumes: User inputs from the report form
- Produces: API payload with `smellType` and `businessLocation`

- [ ] **Step 1: Update the dropdown options in `index.html`**

```html
<!-- Replace the select options around line 140 -->
<select id="businessLocation" name="businessLocation">
    <option value="" disabled selected>Select an option</option>
    <option value="cant_tell">Can't tell (See note below)</option>
    <option value="sewage_drain">Sewage or drain smell</option>
    <option value="chemical_plastic">Chemical or plastic odour</option>
    <option value="rotting_rubbish">Rotting rubbish, compost, or food waste</option>
</select>
```

- [ ] **Step 2: Update the guidance text in `index.html`**

```html
<!-- Replace the guidance text around line 147 -->
<div style="font-size: 0.8rem; color: var(--ink-light); margin-top: 0.5rem; line-height: 1.4;">
    <strong>Guidance:</strong><br>
    &bull; <strong>Can't tell:</strong> Note: If you select this, your report will only be logged internally to track trends, but will NOT be submitted to the EPA. Ask your neighbors if you aren't sure.<br>
    &bull; <strong>Sewage or drain:</strong> Smells like rotten eggs, sulfur, or human waste.<br>
    &bull; <strong>Chemical or plastic:</strong> Can smell like burning plastic, sulfur, or industrial chemicals.<br>
    &bull; <strong>Rotting rubbish:</strong> Often smells like garbage, sour compost, or old food.<br>
</div>
```

- [ ] **Step 3: Update `app.js` mappings**

```javascript
// Replace the mapping logic around line 150
if (rawSmellSelection === 'rotting_rubbish') {
    mappedBusinessLocation = 'Multiple (ReFood, East London Bio Gas)';
    mappedSmellType = 'Rubbish or refuse';
} else if (rawSmellSelection === 'chemical_plastic') {
    mappedBusinessLocation = 'Veolia Dagenham (Plastics)';
    mappedSmellType = 'Plastic';
} else if (rawSmellSelection === 'sewage_drain') {
    mappedBusinessLocation = 'Multiple (Beckton, Riverside, Crossness)';
    mappedSmellType = 'Sewage';
} else if (rawSmellSelection === 'cant_tell') {
    mappedBusinessLocation = 'Unknown';
    mappedSmellType = 'Unknown';
} else {
    console.error(`Unexpected smell selection: ${rawSmellSelection}`);
    throw new Error('Invalid smell selection');
}
```

- [ ] **Step 4: Commit**

```bash
git add vercel/public/index.html vercel/public/app.js
git commit -m "feat: update frontend smell options and mapping"
```

---

### Task 2: Update Server Deduplication Logic

**Files:**
- Modify: `vercel/server.js`

**Interfaces:**
- Consumes: `/api/submit` POST payload

- [ ] **Step 1: Modify `/api/submit` deduplication logic**

```javascript
// In vercel/server.js, locate the block around line 314
// Replace the deduplication window bounds and query logic:

        // Check for duplicates
        const smellTimestamp = `${dateOfSmell} ${timeOfSmell}:00 Europe/London`;
        const lowerBound = shiftHours(dateOfSmell, timeOfSmell, -2);
        const upperBound = shiftHours(dateOfSmell, timeOfSmell, 2);
        
        let query = supabase.from('incidents')
            .select('id, smell_type')
            .neq('status', 'internal_only')
            .gte('smell_timestamp', lowerBound)
            .lte('smell_timestamp', upperBound)
            .order('smell_timestamp', { ascending: true })
            .limit(1);

        const { data: existingIncidents } = await query.throwOnError();

        let incidentId;
        const isCantTell = smellType === 'Unknown';

        if (existingIncidents && existingIncidents.length > 0) {
            const activeIncident = existingIncidents[0];
            
            // If the user is trying to report a different smell or "Can't tell" when there's an active one
            if (activeIncident.smell_type !== smellType) {
                return res.status(400).json({ 
                    error: `A report for ${activeIncident.smell_type || 'another smell'} was already logged recently. It is unlikely the smell changed so quickly. To prevent spam, please join the active report instead or wait until the 2-hour restriction is over.` 
                });
            }

            incidentId = activeIncident.id;
            if (email) {
                const { data: userLink } = await supabase.from('opted_in_user_reports')
                    .select('id')
                    .eq('user_email', email)
                    .eq('incident_id', incidentId)
                    .throwOnError();

                if (userLink && userLink.length > 0) {
                    return res.status(400).json({ error: 'You have already submitted a report for this exact event.' });
                }
            }
            await supabase.from('incidents').update({ status: 'pending' }).eq('id', incidentId).throwOnError();
        } else {
            const initialStatus = isCantTell ? 'internal_only' : 'pending';
            const { data: newIncident } = await supabase.from('incidents')
                .insert({ smell_timestamp: smellTimestamp, smell_type: smellType, business_location: businessLocation, status: initialStatus, reported_by: email || null })
                .select()
                .single()
                .throwOnError();
            
            incidentId = newIncident.id;
        }
```

- [ ] **Step 2: Commit**

```bash
git add vercel/server.js
git commit -m "feat: implement 2-hour anti-spam window and internal_only logic"
```

---

### Task 3: Update Tests

**Files:**
- Modify: `vercel/tests/server.test.js`

**Interfaces:**
- Consumes: `app` from `server.js`

- [ ] **Step 1: Modify existing `/api/submit` duplicate test**

```javascript
// In vercel/tests/server.test.js, find the test "POST /api/submit prevents duplicate submissions"
// Update it to match the new behavior:

    it('POST /api/submit prevents duplicate submissions of same type', async () => {
        // mockExistingIncidents is already { id: 9999, smell_type: 'Industrial Stench' } by default
        const res = await request(app)
            .post('/api/submit')
            .set('X-Forwarded-For', '10.0.0.9')
            .send({ 
                email: 'duplicate@example.com', 
                fullName: 'Duplicate User', 
                timeOfSmell: '00:00',
                smellType: 'Industrial Stench',
                businessLocation: 'ReFoods'
            });
        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('error', 'You have already submitted a report for this exact event.');
    });

    it('POST /api/submit blocks different smell type within 2-hour window', async () => {
        // mockExistingIncidents is { id: 9999, smell_type: 'Industrial Stench' }
        const res = await request(app)
            .post('/api/submit')
            .set('X-Forwarded-For', '10.0.0.12')
            .send({ 
                email: 'new@example.com', 
                fullName: 'New User', 
                timeOfSmell: '00:00',
                smellType: 'Plastic',
                businessLocation: 'Veolia Dagenham'
            });
        expect(res.statusCode).toEqual(400);
        expect(res.body.error).toContain('A report for Industrial Stench was already logged recently.');
    });
```

- [ ] **Step 2: Run tests to verify**

Run: `cd vercel && npm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add vercel/tests/server.test.js
git commit -m "test: update submit tests for deduplication logic"
```

---

### Task 4: Update Changelog

**Files:**
- Modify: `vercel/public/changelog.json` (Create if it does not exist)

- [ ] **Step 1: Verify `changelog.json` exists**

Run: `cat vercel/public/changelog.json` or create it with a basic structure if missing.

- [ ] **Step 2: Append minor feature bump**

Add an entry for the new anti-spam prevention and "Can't tell" option, following existing format. 

- [ ] **Step 3: Commit**

```bash
git add vercel/public/changelog.json
git commit -m "chore: update changelog for smell types and spam prevention"
```
