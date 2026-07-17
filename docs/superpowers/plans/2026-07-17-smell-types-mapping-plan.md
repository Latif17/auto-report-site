# Smell Types Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the Barking Stink UI to provide three user-friendly smell categories and update the GOV.UK scraper to fill out the form accordingly without needing database schema changes.

**Architecture:** The frontend (`app.js`) will translate the user-friendly dropdown selection into a standardized `businessLocation` and `smellType`. The backend (`server.js`) stores these. The scraper (`scraper.js`) will use these two fields to derive the exact GOV.UK options (`siteType`, `smellCategory`, address details, etc.).

**Tech Stack:** HTML/JS (Frontend), Node.js/Puppeteer (Scraper)

## Global Constraints
- Do not modify database schema.
- All scraper changes must perfectly match the GOV.UK labels (e.g., `"Something else"`, `"Rubbish or refuse"`).
- Exact file paths must be used.

---

### Task 1: Update Frontend UI and Submit Mapping

**Files:**
- Modify: `vercel/public/index.html`
- Modify: `vercel/public/app.js`

**Interfaces:**
- Produces: Correct `businessLocation` and `smellType` payload to `/api/submit`.

- [ ] **Step 1: Update the dropdown in `index.html`**

Update the `<select id="businessLocation">` to use the three new user-friendly smell descriptions.

```html
                        <div class="input-group full-width">
                            <label for="businessLocation">What does it smell like?</label>
                            <select id="businessLocation" name="businessLocation" required>
                                <option value="rotting_rubbish">Rotting rubbish, compost, or food waste</option>
                                <option value="chemical_plastic">Chemical or plastic odour</option>
                                <option value="sewage_drain">Sewage or drain smell</option>
                            </select>
                            <div class="error-text hidden">MISSING: Smell type</div>
                        </div>
```

- [ ] **Step 2: Update mapping logic in `app.js`**

Modify the form submit event listener in `vercel/public/app.js` to map the selected value before creating `formData`.

```javascript
        const rawSmellSelection = document.getElementById('businessLocation').value;
        let mappedBusinessLocation = '';
        let mappedSmellType = '';

        if (rawSmellSelection === 'rotting_rubbish') {
            mappedBusinessLocation = 'Multiple (ReFood, East London Bio Gas)';
            mappedSmellType = 'Rubbish or refuse';
        } else if (rawSmellSelection === 'chemical_plastic') {
            mappedBusinessLocation = 'Veolia Dagenham (Plastics)';
            mappedSmellType = 'Something else';
        } else if (rawSmellSelection === 'sewage_drain') {
            mappedBusinessLocation = 'Multiple (Beckton, Riverside, Crossness)';
            mappedSmellType = 'Sewage';
        }

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
            shareData: document.getElementById('shareData').checked
        };
```

- [ ] **Step 3: Run the frontend locally to verify it doesn't break**
Since this is vanilla JS, just open `vercel/public/index.html` in a browser or start a basic HTTP server and check the DOM.

- [ ] **Step 4: Commit**
```bash
git add vercel/public/index.html vercel/public/app.js
git commit -m "feat: simplify smell options and map to generic locations"
```

---

### Task 2: Update Scraper Logic for Page 1 & Page 2

**Files:**
- Modify: `homelab/scraper.js`

**Interfaces:**
- Consumes: `incidentData.business_location` and `incidentData.smell_type` (which come from the backend payload populated by Task 1).

- [ ] **Step 1: Compute scraper configuration from incidentData**

At the top of `submitGovForm` in `homelab/scraper.js`, compute the specific variables needed for the scraping run based on the `smell_type` and `business_location`.

```javascript
        const bLoc = incidentData.businessLocation || incidentData.business_location;
        const sType = incidentData.smellType || incidentData.smell_type;

        let siteType = 'industrial site';
        let smellCategory = sType || 'You cannot describe it';
        let smellDescription = '';
        let addressStreet = 'Choats Rd Dagenham';
        let addressPostcode = 'RM9 6LF';
        let addressTown = '';
        
        if (sType === 'Sewage') {
            siteType = 'sewage or water treatment works';
            addressStreet = '';
            addressPostcode = '';
            addressTown = 'Barking Riverside';
        } else if (bLoc && bLoc.includes('Veolia')) {
            smellCategory = 'Something else';
            smellDescription = 'chemical/plastic odour';
        } else {
            smellCategory = 'Rubbish or refuse';
        }
```

- [ ] **Step 2: Update Page 1 to use `siteType`**

```javascript
        // Page 1: Where is smell coming from?
        debugLog('Navigating to Page 1: Where is smell coming from?');
        await page.goto('https://report-an-environmental-problem.service.gov.uk/smell/source', { waitUntil: 'networkidle0' });
        await clickLabel(page, siteType);
        await goNext(page);
```

- [ ] **Step 3: Update Page 2 to use specific address fields**

```javascript
        // Page 2: Can you give details?
        debugLog('Navigating to Page 2: Can you give details?');
        await clickLabel(page, 'Yes');
        await page.evaluate((locData) => {
            const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
            if(inputs[0] && locData.name) { inputs[0].value = locData.name; inputs[0].dispatchEvent(new Event('input', { bubbles: true })); }
            
            // Try to find specific address fields, otherwise use standard offsets
            const streetInput = document.querySelector('input[name*="line_1"], input[name*="address1"]') || inputs[1];
            const townInput = document.querySelector('input[name*="town"], input[name*="city"]') || inputs[3];
            const postcodeInput = document.querySelector('input[name*="postcode"]') || inputs[inputs.length-1];

            if(streetInput && locData.street) { streetInput.value = locData.street; streetInput.dispatchEvent(new Event('input', { bubbles: true })); }
            if(townInput && locData.town) { townInput.value = locData.town; townInput.dispatchEvent(new Event('input', { bubbles: true })); }
            if(postcodeInput && locData.postcode) { postcodeInput.value = locData.postcode; postcodeInput.dispatchEvent(new Event('input', { bubbles: true })); }
            
        }, { name: bLoc, street: addressStreet, town: addressTown, postcode: addressPostcode });
        await goNext(page);
```

- [ ] **Step 4: Commit**
```bash
git add homelab/scraper.js
git commit -m "feat: dynamically assign siteType and address in scraper"
```

---

### Task 3: Update Scraper Logic for Page 6

**Files:**
- Modify: `homelab/scraper.js`

- [ ] **Step 1: Update Page 6 description logic**

Modify the "Page 6: Describe smell" section in `homelab/scraper.js` to click `smellCategory` and conditionally type the description.

```javascript
        // Page 6: Describe smell
        debugLog('Navigating to Page 6: Describe smell');
        await clickLabel(page, smellCategory);
        
        if (smellCategory === 'Something else' && smellDescription) {
            // Wait for the input box to appear
            await page.waitForSelector('input[type="text"]:not([hidden]), textarea:not([hidden])', { timeout: 3000 }).catch(() => {});
            await page.evaluate((desc) => {
                const inputs = Array.from(document.querySelectorAll('input[type="text"], textarea')).filter(el => {
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && style.visibility !== 'hidden';
                });
                if (inputs.length > 0) {
                    inputs[0].value = desc;
                    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
                }
            }, smellDescription);
        }
        await goNext(page);
```

- [ ] **Step 2: Commit**
```bash
git add homelab/scraper.js
git commit -m "feat: handle something else input for plastic odours on page 6"
```

- [ ] **Step 3: Run full scraper test to verify**
Ensure that `npm test` or a manual run of the scraper works locally if tests exist.
```bash
cd homelab && node run-scraper.js
```
*(assuming mock data is configured or test mode triggers correctly)*
