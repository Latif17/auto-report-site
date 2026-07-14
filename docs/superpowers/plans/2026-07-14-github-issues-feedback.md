# GitHub Issues Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a backend API endpoint to receive user feedback and create GitHub Issues using the GitHub REST API, and connect the frontend form to it.

**Architecture:** We will add a new `POST /api/feedback` route to the Express server in `server.js`. This route will use native `fetch` (supported in Node 18+) to call the GitHub Issues API (`POST /repos/Latif17/auto-report-site/issues`) using a Personal Access Token (`GITHUB_TOKEN`) from the environment variables. The frontend `feedback.html` will be updated to send the form data to this new endpoint.

**Tech Stack:** Express (Node.js), GitHub REST API, Vanilla JS Frontend

## Global Constraints
- Node version: >=18.0.0 (allows native `fetch`)
- Use exact paths and strict rate limiting (re-use `strictLimiter` from `server.js`)

---

### Task 1: Update Frontend Form Logic

**Files:**
- Modify: `vercel/public/feedback.html`

**Interfaces:**
- Consumes: User input from the feedback form (`feedbackType` and `message`)
- Produces: POST request to `/api/feedback` with JSON body `{ feedbackType, message }`

- [ ] **Step 1: Write the minimal implementation to connect the form**

In `vercel/public/feedback.html`, locate the `<script>` block at the bottom and replace the `setTimeout` fake submission with an actual `fetch` call to `/api/feedback`.

Modify `vercel/public/feedback.html`:
```html
    <script>
        document.getElementById('feedback-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = document.getElementById('feedback-submit-btn');
            const errorDiv = document.getElementById('feedback-error');
            const successDiv = document.getElementById('feedback-success');
            const form = document.getElementById('feedback-form');
            const btnText = submitBtn.querySelector('.btn-text');
            
            // Reset state
            errorDiv.classList.add('hidden');
            const originalText = btnText.textContent;
            btnText.textContent = 'Submitting...';
            submitBtn.disabled = true;

            const feedbackType = document.getElementById('feedbackType').value;
            const message = document.getElementById('message').value;

            try {
                const response = await fetch('/api/feedback', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ feedbackType, message })
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to submit feedback');
                }

                // Success
                form.classList.add('hidden');
                successDiv.classList.remove('hidden');
            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.classList.remove('hidden');
                btnText.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    </script>
```

- [ ] **Step 2: Commit**

```bash
cd vercel
git add public/feedback.html
git commit -m "feat: connect feedback form to backend api"
```

---

### Task 2: Implement Backend API for GitHub Issues

**Files:**
- Modify: `vercel/server.js`

**Interfaces:**
- Consumes: POST `/api/feedback` with JSON body `{ feedbackType, message }`
- Produces: JSON response `{ success: true, issueUrl: "..." }` or `{ error: "..." }`

- [ ] **Step 1: Write the API endpoint implementation**

In `vercel/server.js`, add the new endpoint right before the `app.delete('/api/delete-data', ...)` route.

Modify `vercel/server.js`:
```javascript
app.post('/api/feedback', strictLimiter, async (req, res) => {
    const { feedbackType, message } = req.body;

    if (!feedbackType || !message) {
        return res.status(400).json({ error: 'Feedback type and message are required' });
    }

    try {
        const githubToken = process.env.GITHUB_TOKEN;
        if (!githubToken) {
            console.error('GITHUB_TOKEN is not set');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const issueTitle = `[${feedbackType}] New User Feedback`;
        const issueBody = `**Type:** ${feedbackType}\n\n**Message:**\n${message}`;

        const response = await fetch('https://api.github.com/repos/Latif17/auto-report-site/issues', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'auto-report-site'
            },
            body: JSON.stringify({
                title: issueTitle,
                body: issueBody,
                labels: ['user-feedback', feedbackType === 'Bug Report' ? 'bug' : 'enhancement']
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('GitHub API error:', errorData);
            return res.status(502).json({ error: 'Failed to create issue with third-party service' });
        }

        const data = await response.json();
        res.json({ success: true, issueUrl: data.html_url });
    } catch (error) {
        console.error('Feedback submission error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
```

- [ ] **Step 2: Commit**

```bash
cd vercel
git add server.js
git commit -m "feat: add github issues feedback api endpoint"
```
