# Collapsable Reporter Information Design

## Objective
Improve the UX for returning users on the auto-report-site by collapsing the verbose "Reporter Information" section if they have already saved their details, making the primary action (logging a smell) more immediate.

## State Management

The UI will rely on the presence of valid `freshAirWatchData_v2` (or the legacy `freshAirWatchData`) in `localStorage` to determine the state.

1. **New User State (Default)**
   - `reporter-details` form is visible.
   - `verified-summary` is hidden.

2. **Returning User State**
   - On page load, if complete saved data is found, `reporter-details` is hidden.
   - `verified-summary` is populated with `<FullName> - <Postcode>` and made visible.
   
3. **Edit State**
   - Clicking "Edit File" on the `verified-summary` hides the summary and reveals `reporter-details`.
   - A new "Close" button inside `reporter-details` allows the user to abort editing and return to the Returning User State.

## Component Updates

### HTML (`index.html`)
- Ensure the `verified-summary` block contains a robust layout for the name and postcode.
- Add a "Close" (or "Cancel Edit") button to the top or bottom of the `reporter-details` section. This button is only visible when the user transitions from the *Returning User State* to the *Edit State*. It should be hidden for *New Users* who must fill out the form.

### JavaScript (`app.js`)
- **Initialization (`loadSavedData`)**: 
  - After populating the input fields, if sufficient data is present (e.g., Name and Postcode), trigger the *Returning User State*.
  - Update the DOM: `verified-summary.classList.remove('hidden')`, `reporter-details.classList.add('hidden')`.
  - Update the `summary-details` span with the user's name and postcode.
- **Event Listeners**:
  - `edit-details-btn` (Click): Hide `verified-summary`, show `reporter-details`, show the "Close" button.
  - `close-edit-btn` (Click): Hide `reporter-details`, show `verified-summary`.
- **Form Submission**:
  - Upon successful submission, if the user chose to `storeLocally`, ensure the UI returns to the *Returning User State* (updating the summary card with any new name/postcode).

## Ambiguity & Constraints
- If a user clears their browser storage, they will revert to the *New User State*. This is expected behavior.
- If a returning user clicks "Edit File", deletes their name, and clicks "Close", the system should discard the local DOM changes and revert to the data in `localStorage` when collapsing, or enforce validation before collapsing. **Decision**: The "Close" button will simply reset the form fields to match what is currently in `localStorage` and collapse the view.
