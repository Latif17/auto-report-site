# Wind-Based Sewage Plant Identification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use wind direction data to predict the specific sewage plant causing a smell and allow the user to submit that specific plant instead of a generic "Multiple".

**Architecture:** Add an experimental UI container in `index.html` that reveals itself when "Sewage or drain smell" is selected and wind data points to a specific plant. In `app.js`, fetch weather from Open-Meteo, determine the plant based on wind direction, and if the user checks the opt-in checkbox, send the specific plant name to the server instead of the generic one.

**Tech Stack:** HTML, Vanilla JS, Jest (for string-matching frontend tests).

## Global Constraints

- No API keys needed (Open-Meteo is unauthenticated).

---

### Task 1: UI Container in index.html

**Files:**
- Modify: `vercel/public/index.html`
- Modify: `vercel/tests/frontend.test.js`

**Interfaces:**
- Consumes: N/A
- Produces: A hidden `div` with id `experimental-wind-feature` containing a descriptive text paragraph and a checkbox `use-wind-location`.

- [ ] **Step 1: Write the failing test**

Modify `vercel/tests/frontend.test.js`. Add inside `describe('index.html structure', ...)`:
```javascript
        it('contains the experimental wind feature container and checkbox', () => {
            expect(htmlContent).toContain('id="experimental-wind-feature"');
            expect(htmlContent).toContain('id="use-wind-location"');
        });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd vercel && npm test tests/frontend.test.js`
Expected: FAIL due to missing strings.

- [ ] **Step 3: Write minimal implementation**

In `vercel/public/index.html`, around line 171, right below the guidance div for `businessLocation`:
```html
                        <div id="experimental-wind-feature" class="hidden" style="margin-top: 1rem; padding: 1rem; border: 1px dashed var(--accent); background: var(--paper); border-radius: 4px;">
                            <strong style="color: var(--accent); font-size: 0.8rem; text-transform: uppercase;">Experimental</strong>
                            <p id="wind-explanation-text" style="font-size: 0.85rem; margin-top: 0.5rem; margin-bottom: 0.5rem;">Fetching weather data...</p>
                            <label class="checkbox-container" style="margin-bottom: 0;">
                                <input type="checkbox" id="use-wind-location">
                                <span class="checkmark"></span>
                                <div class="checkbox-content" style="font-size: 0.85rem;" id="use-wind-location-label">
                                    Use specific location based on wind
                                </div>
                            </label>
                        </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd vercel && npm test tests/frontend.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add vercel/tests/frontend.test.js vercel/public/index.html
git commit -m "feat: add wind direction UI to form"
```

---

### Task 2: Fetch and Mapping Logic in app.js

**Files:**
- Modify: `vercel/public/app.js`

**Interfaces:**
- Consumes: `#businessLocation`, `#experimental-wind-feature`, `#wind-explanation-text`, `#use-wind-location`
- Produces: Updates `mappedBusinessLocation` upon submit.

- [ ] **Step 1: Write minimal implementation for event listener and fetch**

In `vercel/public/app.js`, inside `document.addEventListener('DOMContentLoaded', () => {`, near the top (e.g. after defining UI sections around line 45):
```javascript
    const businessLocationSelect = document.getElementById('businessLocation');
    const windFeature = document.getElementById('experimental-wind-feature');
    const windText = document.getElementById('wind-explanation-text');
    const windCheckbox = document.getElementById('use-wind-location');
    const windLabel = document.getElementById('use-wind-location-label');
    
    let specificWindPlant = null;

    if (businessLocationSelect) {
        businessLocationSelect.addEventListener('change', async (e) => {
            if (e.target.value === 'sewage_drain') {
                try {
                    const weatherRes = await fetch('https://api.open-meteo.com/v1/forecast?latitude=51.52&longitude=0.12&current_weather=true');
                    if (weatherRes.ok) {
                        const weatherData = await weatherRes.json();
                        const windDir = weatherData.current_weather.winddirection;
                        const windSpeed = weatherData.current_weather.windspeed;
                        
                        let plant = null;
                        let directionName = '';
                        
                        if (windDir >= 210 && windDir <= 330) {
                            plant = 'Beckton Sewage Treatment Works';
                            directionName = 'West';
                        } else if (windDir >= 120 && windDir < 210) {
                            plant = 'Crossness Sewage Treatment Works';
                            directionName = 'South';
                        } else if (windDir >= 30 && windDir < 120) {
                            plant = 'Riverside Sewage Treatment Works';
                            directionName = 'East';
                        }

                        if (plant) {
                            specificWindPlant = plant;
                            windText.textContent = `Wind is pushing from the ${directionName} towards Barking Riverside at ${windSpeed}km/h, likely meaning the smell is from ${plant}.`;
                            windLabel.textContent = `Use ${plant} as the specific location for this report`;
                            windFeature.classList.remove('hidden');
                        } else {
                            specificWindPlant = null;
                            if (windFeature) windFeature.classList.add('hidden');
                        }
                    }
                } catch (e) {
                    console.error('Failed to fetch wind data', e);
                    specificWindPlant = null;
                    if (windFeature) windFeature.classList.add('hidden');
                }
            } else {
                if (windFeature) windFeature.classList.add('hidden');
            }
        });
    }
```

- [ ] **Step 2: Update submission logic in app.js**

In `vercel/public/app.js`, inside `form.addEventListener('submit', async (e) => {`, find the smell selection mapping block:
```javascript
                } else if (rawSmellSelection === 'sewage_drain') {
                    const useWind = document.getElementById('use-wind-location')?.checked;
                    mappedBusinessLocation = (useWind && specificWindPlant) ? specificWindPlant : 'Multiple (Beckton, Riverside, Crossness)';
                    mappedSmellType = 'Sewage';
                }
```

- [ ] **Step 3: Run the tests to ensure no regressions**

Run: `cd vercel && npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add vercel/public/app.js
git commit -m "feat: fetch weather and determine specific sewage plant"
```
