# Email Normalization and Log Rotation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize email inputs to prevent duplicate reports and enable log rotation to manage container disk usage.

**Architecture:** Use the `validator` library in the Express backend to sanitize emails, and configure the Docker `json-file` driver in `docker-compose.yml` to rotate logs.

**Tech Stack:** Node.js, Express, validator, Docker Compose.

## Global Constraints

- Email strings must be processed with `validator.normalizeEmail(email)`.
- Log max size is 10m, with 3 files max.

---
### Task 1: Add dependencies and implement email normalization

**Files:**
- Modify: `vercel/package.json`
- Modify: `vercel/server.js`

**Interfaces:**
- Consumes: User email strings in `req.body` and `req.query`.
- Produces: Normalized email strings before database insertion/queries.

- [x] **Step 1: Install validator package**

```bash
cd vercel
npm install validator
```

- [x] **Step 2: Update server.js to use validator**

```javascript
// Add to imports at the top
const validator = require('validator');

// Update /api/stats:
// Replace `const userEmail = req.query.email;` with:
// const userEmail = req.query.email ? validator.normalizeEmail(req.query.email) : null;

// Update /api/opt-in:
// Replace `const { email, ... } = req.body;` with `let { email, ... }`
// Add `if (email) email = validator.normalizeEmail(email);`

// Update /api/submit:
// Add `if (email) email = validator.normalizeEmail(email);` after the `let { email, ... } = req.body;` line.

// Update /api/join:
// Add `if (email) email = validator.normalizeEmail(email);` after the `let { email, ... } = req.body;` line.
```

- [x] **Step 3: Run existing tests**

Run: `cd vercel && npm test`
Expected: PASS

- [x] **Step 4: Commit**

```bash
git add vercel/package.json vercel/package-lock.json vercel/server.js
git commit -m "feat: normalize email inputs using validator"
```

### Task 2: Enable Docker Log Rotation

**Files:**
- Modify: `homelab/docker-compose.yml`

**Interfaces:**
- Consumes: Scraper container logs.
- Produces: Rotated logs under json-file driver.

- [x] **Step 1: Add logging configuration to docker-compose.yml**

```yaml
# Under the scraper service, add:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

- [x] **Step 2: Commit**

```bash
git add homelab/docker-compose.yml
git commit -m "chore: enable docker log rotation for scraper"
```
