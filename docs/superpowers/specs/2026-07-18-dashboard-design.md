# Dashboard Design Specification

## Overview
A public dashboard page to display key statistics about the Auto Report platform: the number of registered users, the number of smell incidents reported, and the number of forms automatically submitted.

## Architecture & Data Flow

### Backend API
- **Endpoint:** `GET /api/dashboard-stats` in `server.js`
- **Data Source:** Supabase database
- **Queries:** Three parallel `.select('*', { count: 'exact', head: true })` queries against the following tables:
  1. `users` (represents total users signed up)
  2. `incidents` (represents total smells reported)
  3. `opted_in_user_reports` (represents total forms automatically submitted)
- **Response Format:**
  ```json
  {
    "users": 150,
    "incidents": 45,
    "formsSubmitted": 320
  }
  ```
- **Rate Limiting:** Subject to the existing `globalLimiter`.

### Frontend
- **New Page:** `public/dashboard.html`
- **Layout & Aesthetics:**
  - A clean, modern hero section explaining the impact of the community.
  - Three large metric cards corresponding to the three data points.
  - Premium design implementation with vibrant styles, smooth hover effects, micro-animations, and a responsive layout using Vanilla CSS.
  - Uses modern typography and harmonious color palettes.
- **JavaScript Logic (`public/dashboard.html` or a new script):**
  - Fetches data from `/api/dashboard-stats` on page load.
  - Implements a number counter animation (counting from 0 to the actual number) for visual engagement.
- **Navigation:**
  - Add a "Dashboard" link to the main navigation menu in `public/index.html` (and other pages if a shared nav exists).

## Error Handling
- If the API request fails, the frontend will display a graceful fallback message (e.g., "Statistics currently unavailable") or show dashes instead of numbers.
- Backend will wrap Supabase queries in a `try/catch` block and return a `500` status with a generic error message upon failure.

## Testing & Validation
- Ensure the API endpoint correctly counts and returns the three data points.
- Verify the frontend gracefully handles network errors.
- Check responsive design on mobile and desktop viewports.
- Confirm the number animation runs smoothly and displays accurate figures.
