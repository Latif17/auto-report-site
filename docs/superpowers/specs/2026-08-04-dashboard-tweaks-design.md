# Dashboard Tweaks Design Specification

## Overview
This specification outlines a series of usability and visualization tweaks for the Fresh Air Watch dashboard, specifically targeting the Weekly, Monthly, and Trends tabs. 

## 1. Weekly Chart Overhaul
- **Client-Side Data**: The weekly chart will no longer fetch from `/api/smell-stats-weekly`. Instead, it will filter the `allHistoricalData` array client-side.
- **Date Navigation**: 
  - UI: Add `[ < PREV WEEK ]` and `[ NEXT WEEK > ]` buttons above the weekly chart.
  - State: Track the currently viewed week offset.
  - Logic: Disable the "Next Week" button if the user is currently viewing the most recent week of available data.
- **Visualization Update**: Convert the chart to a **Stacked Bar Chart**.
  - X-Axis: Days of the currently selected week.
  - Y-Axis: Total reports.
  - Datasets: Broken down by smell type, colored consistently with the rest of the application.

## 2. Monthly Chart Navigation
- **Date Navigation**:
  - UI: Add `[ < PREV MONTH ]` and `[ NEXT MONTH > ]` buttons above the monthly chart.
  - State: Track a `currentMonthOffset` or specific Date object representing the viewed month.
  - Logic: Dynamically filter `allHistoricalData` to only include reports from the selected month/year.

## 3. Trends Filtering & Categories
- **Valid Categories**: `"Sewage"`, `"Rubbish or refuse"`, `"Plastic"`.
- **Global Trends Filter**: The data processing for the Trends tab (Total Reports, Smell Types Over Time, Heatmap) will strictly filter out any incident where the `smellType` is not in the valid categories list.

## 4. Heatmap Enhancements
- **Axis Correction**: Clamp the X-axis (Hour of Day) strictly to `min: 0, max: 23`.
- **Multi-Dataset Visualization**: 
  - Group the heatmap data by the three valid smell types.
  - Create a distinct Bubble Chart dataset for each smell type.
  - Apply distinct chart colors to each dataset so users can identify *which* smell was prevalent at a given hour/day.

## File Changes Required
- `vercel/public/dashboard.html`:
  - Add HTML button elements for weekly and monthly navigation.
  - Add state variables for `currentWeekStart` and `currentMonthStart`.
  - Rewrite `fetchWeeklyChart()` to be `renderWeeklyChart()` and process `allHistoricalData`.
  - Update `renderMonthlyChart()` to use the tracked month state.
  - Update `renderTrendsCharts()` to filter by the 3 valid categories and split the heatmap into 3 datasets.
  - Update Chart.js options for stacked bars and 0-23 axis boundaries.
- `vercel/public/style.css`:
  - Add styling for the navigation buttons to match the terminal aesthetic.
