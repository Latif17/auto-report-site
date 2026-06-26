# Production Test Mode Design Spec

## Overview
This feature allows developers and QA to test the Auto Report Site's background scraping infrastructure safely in the live production environment. By simulating an incident report through the Vercel frontend, the entire stack (Frontend -> API -> Supabase -> GitHub Actions) can be verified without making a final form submission to GOV.UK.

## Requirements
- Submitting an incident report with any email address ending in `@example.com` must trigger test mode.
- Test mode must prevent the final form submission to GOV.UK.
- Test mode must output verbose logs at each step of the scraping process so that it can be debugged via the GitHub Actions console.
- The scraper must safely execute in the GitHub Action runner environment without crashing (i.e., it must remain headless unless explicitly configured otherwise for local development).

## Architecture & Logic Changes
The changes will be entirely contained within `scraper.js`.

### 1. Test Mode Detection
The `isTestMode` boolean will be evaluated as `true` if:
- The environment variable `process.env.TEST_MODE === 'true'`
- OR `userData.email` is present and `userData.email.toLowerCase().endsWith('@example.com')`

### 2. Safe Headless Execution
The `headless` configuration for Puppeteer will be decoupled from `isTestMode`.
- By default, `headless` will be set to `"new"`.
- To view the browser locally, a new environment variable `process.env.SHOW_BROWSER === 'true'` must be set.
- `slowMo` will only be enabled if `process.env.SHOW_BROWSER === 'true'`, as it is only useful for visual debugging and unnecessarily slows down headless test runs.

### 3. Verbose Production Logging
A helper logging function or inline checks will be added:
```javascript
const debugLog = (msg) => {
    if (isTestMode) console.log(`[TEST_DEBUG] ${msg}`);
};
```
This function will be called at every major navigation and form-filling step throughout `submitGovForm`.

### 4. Submission Skipping
The final block of the form submission script will remain gated by `if (isTestMode)`. It will wait a few seconds, output a final success debug log, and exit without advancing the final page.

## Testing Strategy
- **Unit Tests:** Ensure the scraper logs and correctly configures `launchArgs` based on the environment variables and `userData.email` passed in.
- **Local Dry Run:** Execute `TEST_MODE=true SHOW_BROWSER=true node run-scraper.js` to ensure the scraper navigates visually and skips submission.
