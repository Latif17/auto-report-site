# GOV.UK Submission Verification Design

## Purpose
Ensure that the automated Puppeteer scraper correctly verifies whether a report submission was successful after reaching the final step. 

## Approach
Currently, the scraper unconditionally returns `true` after clicking the final submit button. The new behavior will verify that the submission was actually received by GOV.UK.

1. **Target Element**: The success page on GOV.UK includes a confirmation panel with the classes `govuk-panel govuk-panel--confirmation`.
2. **Target Text**: Within this panel, the text should include "We have received your report".

## Implementation Details (`scraper.js`)
In `submitGovForm`:
- After `await goNext(page);` in the non-test mode block.
- Evaluate the page DOM to locate `.govuk-panel.govuk-panel--confirmation`.
- If the element exists and its text content contains "We have received your report", log success and `return true`.
- If the element is missing or does not contain the expected text, log an error detailing the failure and `return false`.

## Error Handling
Returning `false` from `submitGovForm` will ensure that any upstream caller (like `run-scraper.js`) is aware that the form was not successfully submitted, marking the specific submission as failed.
