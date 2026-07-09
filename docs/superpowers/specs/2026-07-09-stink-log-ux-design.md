# Stink Log UX Improvement Design

## Overview
This document outlines the UX improvements for the Barking Riverside Stink Log web application. The goal is to streamline the reporting process for returning users while maintaining the application's "Confidential Dossier / Evidence Log" aesthetic.

## 1. Smart Collapsible Sections (Progressive UI)

*Note: As most users are on mobile (iPhone/Android), all UI elements must prioritize touch optimization, large tap targets, and responsive layout without horizontal scrolling.*

### Concept
The current form requires users to scroll past a long "Reporter Information" section every time they log a smell. To fix this, we will implement a smart collapse feature.

### Data Flow & Logic
- On page load, `app.js` will check `localStorage` for existing user details (`fullName`, `email`, etc.).
- **State A (New User):** If no details exist, the full "Reporter Information" form is displayed as usual.
- **State B (Returning User):** If details exist, the "Reporter Information" section is hidden.
- In State B, a new "Verified Subject" summary card is injected/shown at the top of the form.
  - Content: `[VERIFIED] <fullName> - <postcode>`
  - Action: An `[Edit File]` button that allows the user to update their details.

### Micro-interactions
- Clicking `[Edit File]` on the summary card will smoothly expand the section back into the full "Reporter Information" form using CSS transitions, hiding the summary card.

## 2. Form & Button Polish

### Input Fields
- Update CSS to clean up focus states and padding.
- Ensure the harsh mono-spaced borders and "typewriter" feel are preserved.

### Dynamic Buttons
- The "Log this smell" submit button will be updated.
- **Loading State:** When clicked, the button text will be replaced by a CSS spinner without altering the button's dimensions (preventing layout shifts).
- **Success State:** Upon successful submission, the button will briefly turn green with a checkmark to provide clear, immediate visual feedback before resetting or showing the global success message.

### Inline Validation
- Instead of relying solely on default browser validation tooltips, we will implement inline error text.
- Missing or invalid required fields will trigger red error text below the respective input field (e.g., "MISSING: Address Line 1"), matching the "Error in file" dossier aesthetic.

## Architecture & Implementation Notes
- **Files Modified:** `vercel/public/index.html`, `vercel/public/style.css`, `vercel/public/app.js`
- **Dependencies:** None. Standard Vanilla JS and CSS.
- **Backward Compatibility:** All changes rely on existing `localStorage` keys; no schema changes required.

## Testing Strategy
- Clear `localStorage` and verify State A (New User) flow.
- Fill out form, save details, refresh, and verify State B (Returning User) flow.
- Test the `[Edit File]` expand animation.
- Trigger form validation errors and verify inline error UI.
- Submit a valid form and verify the loading and success button states.
