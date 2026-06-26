# Production Test Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a production test mode that triggers via `@example.com` emails, logs verbosely, skips submission, and runs safely headless in GitHub Actions.

**Architecture:** Modifies `scraper.js` to decouple the browser visibility configuration from the test mode configuration, and adds a `debugLog` function to output verbose logs at each step.

**Tech Stack:** Node.js, Puppeteer, Jest

## Global Constraints
- Submitting an incident report with any email address ending in `@example.com` must trigger test mode.
- Test mode must prevent the final form submission to GOV.UK.
- Test mode must output verbose logs at each step of the scraping process.
- The scraper must safely execute in the GitHub Action runner environment without crashing (i.e., it must remain headless unless explicitly configured otherwise).

---

### Task 1: Create Scraper Configuration Helper

**Files:**
- Modify: `scraper.js`
- Create: `tests/scraper.test.js`

**Interfaces:**
- Consumes: `userData` object and environment variables.
- Produces: `getConfig(userData)` returning `{ isTestMode, launchArgs }`.

- [ ] **Step 1: Write the failing test**

Create `tests/scraper.test.js` with the following:
```javascript
const { getConfig } = require('../scraper');

describe('scraper configuration', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('triggers test mode for @example.com emails', () => {
        const config = getConfig({ email: 'user@example.com' });
        expect(config.isTestMode).toBe(true);
        expect(config.launchArgs.headless).toBe('new');
    });

    it('triggers test mode when TEST_MODE is true', () => {
        process.env.TEST_MODE = 'true';
        const config = getConfig({ email: 'real@user.com' });
        expect(config.isTestMode).toBe(true);
        expect(config.launchArgs.headless).toBe('new');
    });

    it('shows browser only when SHOW_BROWSER is true', () => {
        process.env.TEST_MODE = 'true';
        process.env.SHOW_BROWSER = 'true';
        const config = getConfig({ email: 'real@user.com' });
        expect(config.isTestMode).toBe(true);
        expect(config.launchArgs.headless).toBe(false);
        expect(config.launchArgs.slowMo).toBe(50);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/scraper.test.js`
Expected: FAIL with `TypeError: getConfig is not a function`

- [ ] **Step 3: Write minimal implementation**

In `scraper.js`, add the `getConfig` function at the top and export it:
```javascript
function getConfig(userData) {
    const isTestMode = process.env.TEST_MODE === 'true' || 
                      (userData && userData.email && userData.email.toLowerCase().endsWith('@example.com'));
    
    const showBrowser = process.env.SHOW_BROWSER === 'true';

    const launchArgs = { 
        headless: showBrowser ? false : "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    };
    
    if (showBrowser) {
        launchArgs.slowMo = 50;
    }

    return { isTestMode, launchArgs };
}

// Ensure it's exported at the bottom of scraper.js
// module.exports = { submitGovForm, getConfig };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/scraper.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scraper.js tests/scraper.test.js
git commit -m "test: add config extraction for scraper test mode"
```

---

### Task 2: Integrate Configuration and Debug Logging

**Files:**
- Modify: `scraper.js`

**Interfaces:**
- Consumes: `getConfig` and inline test mode checks.
- Produces: Verbose logs and skipped submissions for test modes.

- [ ] **Step 1: Write the failing test**

In `tests/scraper.test.js`, add a test to ensure `debugLog` works (we can just verify it in the script, but let's do a mock test).

```javascript
const { submitGovForm } = require('../scraper');
const puppeteer = require('puppeteer');

jest.mock('puppeteer', () => ({
    launch: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
            goto: jest.fn().mockResolvedValue(),
            evaluate: jest.fn().mockResolvedValue(),
            type: jest.fn().mockResolvedValue(),
            waitForNavigation: jest.fn().mockResolvedValue(),
        }),
        close: jest.fn()
    })
}));

describe('submitGovForm', () => {
    let consoleSpy;
    beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });
    afterEach(() => {
        consoleSpy.mockRestore();
        jest.clearAllMocks();
    });

    it('logs verbose test debug messages when in test mode', async () => {
        await submitGovForm({ email: 'test@example.com' }, {});
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[TEST_DEBUG]'));
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/scraper.test.js`
Expected: FAIL because `[TEST_DEBUG]` is not logged.

- [ ] **Step 3: Write minimal implementation**

Update `submitGovForm` in `scraper.js` to use `getConfig`, define `debugLog`, and sprinkle debug logs throughout. Also update the final submission check.

```javascript
async function submitGovForm(userData, incidentData) {
    let browser;
    try {
        console.log(`Starting GOV.UK submission for ${userData.email || 'Anonymous'}`);
        const { isTestMode, launchArgs } = getConfig(userData);
        
        const debugLog = (msg) => {
            if (isTestMode) console.log(`[TEST_DEBUG] ${msg}`);
        };

        debugLog('Launching browser with args: ' + JSON.stringify(launchArgs));
        
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            launchArgs.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        }
        browser = await puppeteer.launch(launchArgs);
        const page = await browser.newPage();

        debugLog('Navigating to Page 1: Where is smell coming from?');
        await page.goto('https://report-an-environmental-problem.service.gov.uk/smell/source', { waitUntil: 'networkidle0' });
        await clickLabel(page, 'industrial site');
        await goNext(page);

        debugLog('Navigating to Page 2: Can you give details?');
//... (add debugLog before each page)
// In the final submit block:
        if (isTestMode) {
            debugLog('TEST MODE ACTIVE: Skipping final form submission. Browser will close in 5 seconds...');
            await new Promise(r => setTimeout(r, 5000));
        } else {
            await goNext(page);
            console.log(`Successfully submitted form for ${userData.email}`);
        }
        
        return true;
    } catch (e) {
//...
```
*(Note for the implementing agent: Please ensure a `debugLog` statement is added before every `goNext(page)` block so we have a full trace.)*

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/scraper.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scraper.js tests/scraper.test.js
git commit -m "feat: integrate safe headless mode and verbose debug logging for test mode"
```
