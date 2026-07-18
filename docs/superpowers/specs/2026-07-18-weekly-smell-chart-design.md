# Weekly Smell Chart Design

## Goal
Add a weekly bar chart to the dashboard showing the number of forms submitted per day over the last 7 days, grouped by smell type. 

## Architecture & Data Flow

### Backend (`server.js`)
- **New API Endpoint:** `GET /api/smell-stats-weekly`
- **Data Source:** Query the `opted_in_user_reports` table joined with the `incidents` table to access `smell_type` and `smell_timestamp`.
- **Filtering:** Limit the query to incidents occurring within the last 7 days from the current date.
- **Aggregation:** Group the counts by the day of the week (e.g., "Monday", "Tuesday") and the `smell_type`. 
- **Response Format:** Send the processed data back to the frontend in a structured JSON format, mapping days to smell types and their respective counts.

### Frontend (`dashboard.html` & `app.js`)
- **Charting Library:** Use Chart.js, included via CDN.
- **UI Element:** Add a dedicated section with a `<canvas id="weeklySmellChart"></canvas>` element below the main metrics in `dashboard.html`.
- **Data Fetching:** Fetch the aggregated data from `/api/smell-stats-weekly`.
- **Data Formatting:** Transform the JSON response into Chart.js dataset format (one dataset per unique smell type, X-axis labels representing the last 7 days).
- **Styling:** Style the Chart.js instance to match the platform's terminal aesthetic (dark theme, green/cyan chart colors, monospace fonts, dark grid lines).

## Error Handling
- Server: If the Supabase query fails, return a 500 status and log the error.
- Client: If the fetch request fails, display a terminal-styled error message in the dashboard UI indicating the chart could not be loaded.
