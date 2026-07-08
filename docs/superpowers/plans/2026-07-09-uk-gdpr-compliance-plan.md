# UK GDPR Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make auto-report-site compliant with England Law (UK GDPR & DPA 2018) by adding a privacy policy, right to erasure via a simple data management page, and explicitly unambiguous consent mechanisms.

**Architecture:** We are updating the frontend (`public/index.html`, `public/app.js`) to adjust consent checkboxes. We are creating a new `public/manage.html` and `public/privacy.html`. We are adding a new backend endpoint in `server.js` (`DELETE /api/delete-data`) that simply takes an email address and deletes the associated data from Supabase without email verification.

**Tech Stack:** Express, Node.js, static HTML/JS, Supabase, Jest

## Global Constraints
- Node.js backend.
- Pure HTML/CSS/JS frontend.
- Do not use email verification for data deletion per user preference.

---

### Task 1: Form UI & Consent Adjustments

**Files:**
- Modify: `vercel/public/index.html`
- Modify: `vercel/public/app.js`

**Interfaces:**
- Updates static HTML to remove the `checked` attribute from `storeLocally`.
- Updates the description for `shareData`.

- [ ] **Step 1: Update the storeLocally checkbox**
Modify `vercel/public/index.html` to remove the `checked` attribute from the `storeLocally` checkbox to comply with PECR.

```html
<label class="checkbox-container">
    <input type="checkbox" id="storeLocally" name="storeLocally">
    <span class="checkmark"></span>
    <div class="checkbox-content">
```

- [ ] **Step 2: Update the Pool Data description**
Modify `vercel/public/index.html` to make the `shareData` consent explicit.

```html
<label class="checkbox-container highlight">
    <input type="checkbox" id="shareData" name="shareData">
    <span class="checkmark"></span>
    <div class="checkbox-content">
        <strong>Pool Data (Recommended)</strong>
        <span>By pooling your data, you grant explicit consent for us to transmit your personal details to GOV.UK to submit the official environmental form on your behalf whenever other Barking Riverside residents log a smell issue.</span>
    </div>
</label>
```

- [ ] **Step 3: Update local storage loader in app.js**
Modify `vercel/public/app.js` in `loadSavedData()` to not assume `checked` if `storeLocally` is undefined.

```javascript
document.getElementById('storeLocally').checked = data.storeLocally === true;
```

- [ ] **Step 4: Commit**
```bash
git add vercel/public/index.html vercel/public/app.js
git commit -m "feat: adjust UI for strict opt-in consent and PECR compliance"
```

---

### Task 2: Create Privacy Policy Page

**Files:**
- Create: `vercel/public/privacy.html`
- Modify: `vercel/public/index.html`

**Interfaces:**
- Exposes `/privacy.html` statically.

- [ ] **Step 1: Create `vercel/public/privacy.html`**
Create a new HTML file extending the site's layout with the Privacy Policy content.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy | Barking Stink</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="dossier-container">
        <header class="dossier-header">
            <h1>Privacy Policy</h1>
        </header>
        <main>
            <div class="primary-action-section" style="text-align: left;">
                <h3>1. Data Controller</h3>
                <p>This service operates as a local community tool for Barking Riverside.</p>
                
                <h3>2. Lawful Basis and Consent</h3>
                <p>Under the UK GDPR, our lawful basis for processing your personal data is <strong>Consent</strong> (Article 6(1)(a)).</p>
                
                <h3>3. Data Collected & Purpose</h3>
                <p>We collect your Email, Full Name, Postcode, Phone (optional), and Address strictly to automate the submission of the official GOV.UK environmental reporting form on your behalf.</p>
                
                <h3>4. Third-Party Transmission</h3>
                <p>By opting into data pooling, your personal data will be programmatically transmitted to GOV.UK and local authorities.</p>
                
                <h3>5. Data Retention</h3>
                <p>Your data is retained indefinitely to enable continuous automated reporting until you explicitly withdraw your consent.</p>
                
                <h3>6. Right to Erasure</h3>
                <p>You have the right to request the deletion of your data at any time. You can do so by visiting the <a href="/manage.html">Manage My Data</a> page.</p>
            </div>
            <div style="margin-top: 2rem;">
                <a href="/" class="btn-secondary">Return Home</a>
            </div>
        </main>
    </div>
</body>
</html>
```

- [ ] **Step 2: Link Privacy Policy in footer of `index.html`**
Modify `vercel/public/index.html` footer to include a link to the Privacy Policy.

```html
<footer>
    <p>
        <a href="https://report-an-environmental-problem.service.gov.uk/smell/source" target="_blank" rel="noopener noreferrer">Official GOV.UK Form</a>
        &nbsp;|&nbsp;
        <a href="/privacy.html">Privacy Policy</a>
    </p>
</footer>
```

- [ ] **Step 3: Commit**
```bash
git add vercel/public/privacy.html vercel/public/index.html
git commit -m "docs: add UK GDPR privacy policy page and links"
```

---

### Task 3: Backend Deletion Endpoint

**Files:**
- Modify: `vercel/server.js`
- Modify: `vercel/tests/server.test.js`

**Interfaces:**
- Consumes: None
- Produces: `DELETE /api/delete-data` accepting JSON `{ "email": "user@example.com" }`

- [ ] **Step 1: Write the failing test**
Modify `vercel/tests/server.test.js` to add a test block for the new endpoint.

```javascript
describe('DELETE /api/delete-data', () => {
    it('deletes user and returns success', async () => {
        const res = await request(app)
            .delete('/api/delete-data')
            .send({ email: 'delete@example.com' });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual({ success: true, message: 'Data deleted successfully' });
    });

    it('fails without email', async () => {
        const res = await request(app)
            .delete('/api/delete-data')
            .send({});
        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('error', 'Email is required');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test -- --testPathPattern=server.test.js` (from `vercel/` folder)
Expected: FAIL due to 404 on `/api/delete-data`

- [ ] **Step 3: Write minimal implementation**
Modify `vercel/server.js` to add the `DELETE /api/delete-data` endpoint before the `app.listen` block.

```javascript
app.delete('/api/delete-data', strictLimiter, async (req, res) => {
    let { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }
    const processed = processEmail(email);
    if (processed.error) return res.status(400).json({ error: processed.error });
    email = processed.email;

    try {
        // Delete from opted_in_user_reports first to handle potential foreign key constraints
        await supabase.from('opted_in_user_reports').delete().eq('user_email', email).throwOnError();
        // Delete from users
        await supabase.from('users').delete().eq('email', email).throwOnError();

        res.json({ success: true, message: 'Data deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
```

*(Note: If the `users` mock in `server.js` doesn't handle `delete()`, you may need to update the mock at the top of `server.js` to return a chainable mock for `delete()`.)*

- [ ] **Step 4: Update mock for delete in `server.js` (if tests fail)**
Modify `vercel/server.js` in the `createClient` mock:
```javascript
                delete: () => {
                    const chain = {
                        eq: () => chain,
                        throwOnError: () => chain,
                        then: (resolve) => resolve({}),
                        catch: () => chain
                    };
                    return chain;
                },
```

- [ ] **Step 5: Run test to verify it passes**
Run: `npm test -- --testPathPattern=server.test.js` (from `vercel/` folder)
Expected: PASS

- [ ] **Step 6: Commit**
```bash
git add vercel/server.js vercel/tests/server.test.js
git commit -m "feat: add unverified delete endpoint for user data erasure"
```

---

### Task 4: Manage My Data Page

**Files:**
- Create: `vercel/public/manage.html`

**Interfaces:**
- Consumes: `DELETE /api/delete-data`

- [ ] **Step 1: Create `vercel/public/manage.html`**
Create the page for users to submit their email for deletion.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage My Data | Barking Stink</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="dossier-container">
        <header class="dossier-header">
            <h1>Manage My Data</h1>
            <p class="subject">Exercise your right to erasure</p>
        </header>

        <main>
            <div class="primary-action-section" style="text-align: left;">
                <p style="margin-bottom: 1.5rem; color: var(--ink-light);">
                    Enter the email address you used to log events or pool data. Clicking delete will immediately remove your information from our database and stop any future automated reports on your behalf.
                </p>
                
                <form id="manage-form">
                    <div class="input-group full-width" style="margin-bottom: 1rem;">
                        <label for="deleteEmail">Email Address</label>
                        <input type="email" id="deleteEmail" required placeholder="jane@example.com">
                    </div>
                    
                    <button type="submit" class="btn btn-submit" id="delete-btn" style="background: var(--error-bg); color: var(--accent); border-color: var(--accent);">
                        <span class="btn-text" id="delete-btn-text">Delete My Data</span>
                    </button>
                </form>

                <div id="manage-status" class="status-message hidden" style="margin-top: 1rem;"></div>
            </div>
            
            <div style="margin-top: 2rem;">
                <a href="/" class="btn-secondary">Return Home</a>
            </div>
        </main>
    </div>

    <script>
        document.getElementById('manage-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('deleteEmail').value;
            const btn = document.getElementById('delete-btn');
            const status = document.getElementById('manage-status');
            
            btn.disabled = true;
            status.className = 'status-message';
            status.textContent = 'Processing...';
            
            try {
                const res = await fetch('/api/delete-data', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to delete data');
                
                status.textContent = data.message || 'Data deleted successfully.';
                status.className = 'status-message success';
                
                // Clear local storage just in case
                localStorage.removeItem('freshAirWatchData_v2');
                localStorage.removeItem('freshAirWatchData');
            } catch (err) {
                status.textContent = err.message;
                status.className = 'status-message error';
            } finally {
                btn.disabled = false;
            }
        });
    </script>
</body>
</html>
```

- [ ] **Step 2: Commit**
```bash
git add vercel/public/manage.html
git commit -m "feat: add manage my data page for self-serve deletion"
```
