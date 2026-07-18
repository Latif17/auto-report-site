# Smell Guidance and Incident Language Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the "Smell reported nearby" text format and add guidance for smell types in the report form.

**Architecture:** Modifies frontend HTML and JS files in the public directory to inject new guidance text and format the active incident block. No backend changes required.

**Tech Stack:** Vanilla HTML/JS

## Global Constraints
- Target files are in `vercel/public/`.
- No new libraries or frameworks to be added.

---

### Task 1: Add Form Guidance Text

**Files:**
- Modify: `vercel/public/index.html`

**Interfaces:**
- Consumes: The existing `#businessLocation` select element.
- Produces: A new guidance text block below the select element.

- [ ] **Step 1: Write the minimal implementation**
Modify `vercel/public/index.html` around line 147 (below the `<select id="businessLocation">` and its error text):

```html
<<<<
                            </select>
                            <div class="error-text hidden">MISSING: Smell type</div>
                        </div>
====
                            </select>
                            <div class="error-text hidden">MISSING: Smell type</div>
                            <div style="font-size: 0.8rem; color: var(--ink-light); margin-top: 0.5rem; line-height: 1.4;">
                                <strong>Guidance:</strong><br>
                                &bull; <strong>Rotting rubbish:</strong> Often smells like garbage, sour compost, or old food.<br>
                                &bull; <strong>Chemical or plastic:</strong> Can smell like burning plastic, sulfur, or industrial chemicals.<br>
                                &bull; <strong>Sewage or drain:</strong> Smells like rotten eggs, sulfur, or human waste.<br>
                                <em>(Note: If a smell is already reported nearby, you will see it at the top of the page.)</em>
                            </div>
                        </div>
>>>>
```

- [ ] **Step 2: Run test to verify**
Since there are no automated frontend tests, open `index.html` in a browser or serve locally to manually verify the guidance text is visible under the dropdown and styling is correct.

- [ ] **Step 3: Commit**
```bash
git add vercel/public/index.html
git commit -m "feat: add smell identification guidance to form"
```

---

### Task 2: Format Active Incident Block

**Files:**
- Modify: `vercel/public/app.js`

**Interfaces:**
- Consumes: `topIncident` object from API response.
- Produces: Formatted HTML injected into `#active-incident-location`.

- [ ] **Step 1: Write the minimal implementation**
Modify `vercel/public/app.js` where the `active-incident-location` is populated (around line 54).

```javascript
<<<<
                document.getElementById('active-incident-time').textContent = `${formattedDate} - ${formattedTime}`;
                document.getElementById('active-incident-location').textContent = `Reported: ${topIncident.business_location}`;
                
                const joinBtn = document.getElementById('join-incident-btn');
====
                document.getElementById('active-incident-time').textContent = `${formattedDate} - ${formattedTime}`;
                document.getElementById('active-incident-location').innerHTML = `Reported:<br>Smell - ${topIncident.smell_type || 'Unknown'}<br>Location - ${topIncident.business_location}`;
                
                const joinBtn = document.getElementById('join-incident-btn');
>>>>
```

- [ ] **Step 2: Run test to verify**
Serve the site locally. Create or simulate an active incident response and manually verify the "Smell reported nearby" block displays the separated smell type and location format.

- [ ] **Step 3: Commit**
```bash
git add vercel/public/app.js
git commit -m "feat: format active incident block to separate smell and location"
```
