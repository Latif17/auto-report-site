# Smell Guidance and Incident Language Design

## Overview
This design outlines changes to the `auto-report-site` to improve user clarity when reporting smells. It involves two main updates:
1. Reformatting the "Smell reported nearby" active incident block.
2. Adding inline guidance text under the "What does it smell like?" dropdown to help users identify the correct smell type.

## Architecture & Changes

### 1. Active Incident Block Formatting
Currently, the active incident location is displayed as a single string (e.g., "Reported: Multiple (Beckton, Riverside, Crossness)"). We will separate the smell type and location to make it more readable.

**Target File:** `vercel/public/app.js` and `vercel/public/index.html`
**Change:**
- The active incident block will display:
  ```
  Reported:
  Smell - <smell_type>
  Location - <business_location>
  ```
- This will be achieved by injecting formatted HTML into the `#active-incident-location` element, e.g. using `<br>` and `<strong>` tags.

### 2. Smell Identification Guidance
To help users select the correct smell type and avoid duplicate reporting, we will add an inline text block right below the dropdown.

**Target File:** `vercel/public/index.html`
**Change:**
- Below the `#businessLocation` select dropdown, insert a block of text containing guidance:
  - **Rotting rubbish**: Often smells like garbage, sour compost, or old food.
  - **Chemical or plastic**: Can smell like burning plastic, sulfur, or industrial chemicals.
  - **Sewage or drain**: Smells like rotten eggs, sulfur, or human waste. 
  - *Note: If a smell is already reported nearby, you will see it at the top of the page.*
- Use subtle styling (smaller text size, muted color `var(--ink-light)`) to avoid cluttering the form.

## Error Handling & Edge Cases
- Ensure the HTML formatting for the active incident degrades gracefully if `smell_type` is somehow missing (fallback to "Unknown").
- Maintain existing form validation and ensure the new text block does not push the validation error message out of view or break the layout.

## Testing
- Visual check of the "Smell reported nearby" banner with a mock recent incident.
- Visual check of the form dropdown to ensure the helper text looks appropriate and responsive on mobile viewports.
