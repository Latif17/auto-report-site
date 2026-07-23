# Standardise Smell Types Plan

## Overview
The frontend currently restricts users to four standard smell types:
1. `Unknown`
2. `Sewage`
3. `Plastic`
4. `Rubbish or refuse`

However, the rest of the codebase (backend tests, scraper tests, and local dev scripts) still uses legacy or arbitrary strings (`Industrial Stench`, `Waste`, `Something else`, `sulfur`, `chemical`). The GOV.UK scraper logic is also still using legacy hardcoded business-location mappings to determine the `smellCategory`.

This plan updates the entire repository to strictly use the four standard types.

## Task 1: Update Vercel Backend Tests & Mock DB
- **File:** `vercel/server.js`
  - Update the `mockExistingIncidents` to use `Sewage` instead of `Industrial Stench`.
- **File:** `vercel/tests/server.test.js`
  - Update all test payloads and assertions to use `Sewage`, `Plastic`, or `Rubbish or refuse` instead of `Industrial Stench` or `Waste`.
  - Update test names accordingly.

## Task 2: Update Homelab Scraper Logic
- **File:** `homelab/scraper.js`
  - Refactor the `smellCategory` mapping logic to rely on the `sType` field rather than guessing based on `businessLocation`.
  - If `sType === 'Sewage'`, `smellCategory = 'Sewage'`
  - If `sType === 'Plastic'`, `smellCategory = 'Something else'` and `smellDescription = 'chemical/plastic odour'`
  - If `sType === 'Rubbish or refuse'`, `smellCategory = 'Rubbish or refuse'`
  - (Fallback gracefully for any edge cases)

## Task 3: Update Homelab Tests & Dev Scripts
- **File:** `homelab/test-local.js`
  - Update the mock payload to use a standard `smellType` (e.g., `Plastic`).
- **File:** `homelab/tests/scraper.test.js`
  - Update test assertions to verify the new `sType` based mapping (e.g., passing `Plastic` correctly clicks 'Something else' and fills 'chemical/plastic odour').
- **File:** `homelab/tests/run-scraper.test.js`
  - Update test payloads using `sulfur` or `chemical` to use `Plastic` or `Sewage`.
  - Ensure the tests still pass.

## Task 4: Final Verification
- Run both `npm test` in `vercel/` and `npm test` in `homelab/` to guarantee no broken assumptions remain.
