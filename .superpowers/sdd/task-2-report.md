# Task 2 Report: Move Web Application to vercel/

## Implementation Details
We migrated all web-related client and server code into the `vercel/` folder:
- **Moved Web Files:** Moved the `server.js` file, the `public/` directory (containing frontend files `index.html`, `style.css`, and `app.js`), and the `tests/server.test.js` file from the repository root to `vercel/`.
- **Created Vercel Serverless Function entry point:** Created [vercel/api/index.js](file:///Users/latif/Documents/repos/auto-report-site/vercel/api/index.js) which imports and exports `vercel/server.js`.
- **Created Vercel Routing Configuration:** Created [vercel/vercel.json](file:///Users/latif/Documents/repos/auto-report-site/vercel/vercel.json) containing rewrites for `/api/*` requests to the Serverless Function and root paths to `vercel/public/` static files.
- **Updated Static Path:** Modified [vercel/server.js](file:///Users/latif/Documents/repos/auto-report-site/vercel/server.js) to resolve the static file directory to `path.join(__dirname, 'public')` since `public/` is always relative to `server.js` in the new structure.
- **Cleaned Up Root Directory:** Deleted obsolete web-related files at the root level (`server.js`, `public/`, `tests/server.test.js`, `vercel.json`, and `api/`) to keep the codebase clean.

## Files Changed
- [vercel/server.js](file:///Users/latif/Documents/repos/auto-report-site/vercel/server.js)
- [vercel/api/index.js](file:///Users/latif/Documents/repos/auto-report-site/vercel/api/index.js)
- [vercel/vercel.json](file:///Users/latif/Documents/repos/auto-report-site/vercel/vercel.json)
- Moved directories and files:
  - `public/` -> `vercel/public/`
  - `tests/server.test.js` -> `vercel/tests/server.test.js`
- Deleted old root duplicates:
  - `server.js`
  - `public/`
  - `tests/server.test.js`
  - `vercel.json`
  - `api/`

## Verification and Testing
We ran the server test suite inside `vercel/` and the overall suite at the root directory to confirm all functionality remains intact:

### Vercel Server Tests
Inside `vercel/`:
```bash
npm install
npm test
```
Result:
```
PASS tests/server.test.js
  API Endpoints
    ✓ GET /api/stats returns counts (12 ms)
    ✓ POST /api/opt-in succeeds with valid data (4 ms)
    ✓ POST /api/opt-in fails without email (1 ms)
    ✓ POST /api/submit when shareData is false returns success (2 ms)
    ✓ POST /api/submit handles shareData correctly and returns success (1 ms)
    ✓ POST /api/submit prevents duplicate submissions (1 ms)
    ✓ POST /api/join passes pool_data: true (1 ms)
  Security Middlewares
    ✓ should have helmet security headers (3 ms)
    ✓ should strict rate limit mutation endpoints to 3 per 15 minutes (4 ms)
    ✓ should rate limit /api/opt-in (4 ms)
    ✓ should rate limit /api/join (3 ms)
    ✓ should limit requests to 100 per 15 minutes (40 ms)

Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total
Snapshots:   0 total
Time:        0.24 s, estimated 1 s
```

### Full Repository Tests
At the root directory:
```bash
npm test
```
Result:
```
PASS tests/run-scraper.test.js
PASS vercel/tests/server.test.js
PASS tests/scraper.test.js

Test Suites: 3 passed, 3 total
Tests:       29 passed, 29 total
Snapshots:   0 total
Time:        1.278 s, estimated 2 s
Ran all test suites.
```

## Self-Review Findings
- **Completeness:** All steps from the task brief were completed exactly as described.
- **Quality:** Checked that paths resolve correctly relative to `__dirname` in all contexts.
- **Discipline:** No overbuilding or unnecessary refactoring was introduced. Removed obsolete root files to prevent redundancy.

## Re-review Fixes
- Added `"engines": { "node": "^18.x" }` to `vercel/package.json` to enforce the Node.js version constraint.
- Note: The root `package.json` and root `tests/` directory will be deleted in Tasks 4 and 5, so root-level updates for them are bypassed to avoid redundancy.

