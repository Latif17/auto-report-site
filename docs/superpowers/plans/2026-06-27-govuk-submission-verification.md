# GOV.UK Submission Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure the scraper verifies report submission by checking for the "We have received your report" text in the GOV.UK success panel.

**Architecture:** We will modify the final submission block in `scraper.js` to wait for and evaluate the DOM for the `.govuk-panel.govuk-panel--confirmation` element. If it exists and contains the success text, it returns true; otherwise, it logs an error and returns false.

**Tech Stack:** Node.js, Puppeteer

## Global Constraints

- Must check for `.govuk-panel.govuk-panel--confirmation`
- Must check for text "We have received your report"
- Must return `false` on failure

---

### Task 1: Update scraper.js Verification Logic

**Files:**
- Modify: `/Users/latif/Documents/repos/auto-report-site/scraper.js:259-270`

**Interfaces:**
- Consumes: The `page` object from Puppeteer
- Produces: Returns `true` if verification passes, `false` otherwise.

- [ ] **Step 1: Write the implementation**

Update `scraper.js` to include the verification check after `await goNext(page);`. 

```javascript
        // Final submit
        if (isTestMode) {
            debugLog('TEST MODE ACTIVE: Skipping final form submission. Browser will close in 5 minutes to allow reading logs/answers (skipped in CI)...');
            if (!process.env.JEST_WORKER_ID && !process.env.GITHUB_ACTIONS && !process.env.CI) {
                await new Promise(r => setTimeout(r, 300000));
            }
        } else {
            await goNext(page);
            
            // Verify submission success
            const successTextExists = await page.evaluate(() => {
                const panel = document.querySelector('.govuk-panel.govuk-panel--confirmation');
                if (!panel) return false;
                return panel.innerText.includes('We have received your report');
            });

            if (successTextExists) {
                console.log(`Successfully submitted form for ${userData.email}`);
            } else {
                console.error(`Failed to verify submission for ${userData.email}. Success panel missing or text incorrect.`);
                return false;
            }
        }
        
        return true;
```

- [ ] **Step 2: Commit**

```bash
git add scraper.js
git commit -m "feat: verify GOV.UK report submission success"
```
