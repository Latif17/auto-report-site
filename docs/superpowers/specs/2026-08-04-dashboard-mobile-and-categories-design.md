# Dashboard Mobile & Categories Design

## Overview
This spec outlines the design for optimizing the Auto Report Site dashboard charts and navigation for mobile devices, categorizing legacy smell data as "Other", and preventing pagination beyond available data.

## 1. CSS & Layout Changes
- **Nav Header Mobile Layout**: At `@media (max-width: 600px)`, the `.nav-header` class will switch to `flex-direction: column` and `align-items: stretch` (or `flex-start`). The `.nav-controls` will span 100% width, using `justify-content: space-between` to keep the PREV/NEXT buttons easily tappable at the screen edges without spilling over.
- **Chart Canvas Constraints**: Ensure `.tab-content` and canvas elements use robust constraints (`min-height: 300px` for weekly/monthly, and potentially `400px` for Trends) so that they do not squash vertically on mobile while `maintainAspectRatio: false` allows Chart.js to scale properly horizontally.

## 2. Category Handling
- All fetched records in `allHistoricalData` will be evaluated against the valid categories set (`Sewage`, `Rubbish or refuse`, `Plastic`). 
- Any record whose `smellType` is not in this set will be reassigned as `"Other"`. 
- **Color Mapping**: The charts will apply specific, deterministic colors based on category names:
  - `Sewage` -> (Neon Green, e.g. `#00ff00`)
  - `Rubbish or refuse` -> (Neon Blue/Cyan)
  - `Plastic` -> (Neon Purple/Pink)
  - `Other` -> Muted Grey (`#52525b`)
- This logic will apply across the Weekly, Monthly, and Trends (Heatmap) charts.

## 3. Pagination Boundaries
- On application load (or when processing `allHistoricalData`), we will determine `earliestDataDate`, representing the oldest timestamp in the dataset.
- **Weekly Chart**: The `[ < PREV ]` button will be disabled if `startOfWeek` (calculated using `currentWeekOffset - 1`) evaluates to a date earlier than `earliestDataDate`.
- **Monthly Chart**: The `[ < PREV ]` button will be disabled if `currentMonthOffset - 1` computes a month/year earlier than the month/year of `earliestDataDate`.

## 4. Heatmap Edge Fix
- In `vercel/public/dashboard.html` for the `trends` Heatmap, the X-axis scale configuration will include `offset: true`. This natively pads the axis by half a step so that the bubbles plotted at hour `0` and hour `23` are completely visible and do not clip against the edge of the canvas.

## Success Criteria
- [ ] Nav controls do not spill over or cause horizontal scrolling on mobile.
- [ ] Non-standard smell reports are grouped as "Other" in a muted grey color in all charts.
- [ ] Users cannot click `< PREV` to an empty state before the earliest data point.
- [ ] Heatmap edge bubbles are completely visible.
