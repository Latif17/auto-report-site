# Dashboard Improvements Design Spec

## Overview
Enhance the existing dashboard to provide users with more comprehensive ways to analyze the smell report data. The improvements will introduce Monthly and Trends views alongside the existing Weekly view, all processed client-side from a single new API endpoint to keep the backend simple.

## Architecture & Data Flow
1. **Backend Endpoint (`/api/smell-stats-all`)**
   - We will introduce a new backend endpoint that fetches all historical incidents.
   - It will return a lightweight JSON array containing only the essential fields needed for charting: `timestamp` and `smell_type`.
   - By omitting PII and unnecessary fields, the payload remains small even as the database grows.

2. **Frontend UI Structure (`dashboard.html`)**
   - **Tab Controls**: A new tab/button group will be added above the chart container, allowing users to toggle between "Weekly", "Monthly", and "Trends".
   - **Chart Containers**: 
     - "Weekly" will reuse the existing bar chart logic.
     - "Monthly" will display a similar bar chart but grouped by day/week for the current month.
     - "Trends" will display three distinct charts stacked vertically:
       1. Total reports over time (Line chart).
       2. Smell types over time (Multi-line chart to show frequency per smell).
       3. Heatmap of reports by day of week and time of day (Scatter plot mapped to a grid).

3. **Frontend Processing Logic**
   - The dashboard will call `/api/smell-stats-all` once on page load.
   - The returned data will be stored in memory on the client side.
   - When a user switches tabs, JavaScript functions will dynamically filter, aggregate, and process this raw data to generate the appropriate datasets for Chart.js.
   - Chart instances will be destroyed and recreated or updated dynamically to ensure smooth transitions between views.

## Component Breakdown
- **Backend API**: Add `/api/smell-stats-all` to `vercel/server.js`. Update tests to include this new endpoint in the PII allowlist.
- **UI Elements**: Add HTML markup for the tab navigation and the extra canvas elements for the trends charts in `vercel/public/dashboard.html`.
- **Styling**: Update `vercel/public/style.css` to style the tabs and the vertically stacked trends charts. Ensure the design matches the existing "STINK LOG" dark terminal aesthetic.
- **JavaScript Charting**: Add processing functions to parse the full history into Weekly, Monthly, and Trends datasets and render them using Chart.js.

## Error Handling
- If the `/api/smell-stats-all` fetch fails, the existing error terminal display (`dashboard-error`) will be shown.
- Empty states (e.g., no data for the current month) will result in empty charts rather than breaking the application.

## Testing
- Ensure the new `/api/smell-stats-all` endpoint returns no PII (must pass `pii-allowlist.test.js`).
- Verify that tab switching successfully destroys and recreates the Chart.js instances to avoid memory leaks or rendering glitches.
