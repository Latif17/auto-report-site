# Dashboard Terminal UI Design Spec

## Overview
The dashboard UI will be redesigned to match the "confidential dossier/evidence log" aesthetic of the rest of the application. The current generic startup-style layout (soft gradients, cards, blurs) will be replaced with a mobile-first, high-contrast "Terminal Feed" layout.

## Goals
- Align the dashboard's visual style with the core app's brutish, dossier theme.
- Optimize the layout for mobile devices, ensuring statistics are highly legible without text wrapping.
- Create an engaging "live monitoring" feel using retro terminal aesthetics.

## Architecture & Layout Structure
- **Mission Brief Header**: The existing "Our Community Impact" hero text will be replaced with a sharp, dossier-style briefing block (e.g., `// SYSTEM STATUS: COMMUNITY MONITORING`).
- **Terminal Screen Container**: A new `<section class="terminal-feed">` will serve as the primary container for the metrics, styled to look like an embedded physical screen within the dossier.
- **Metric Rows**: Metrics will be displayed as horizontal "terminal lines" rather than bulky grid cards. They will read left-to-right (e.g., `> USERS_ACTIVE: [value] [LIVE]`), maximizing vertical space and readability on mobile screens.

## Styling & Interactivity (CSS & JS)
- **CSS Aesthetic**: The `.terminal-feed` will use a dark background (e.g., `var(--ink)`) with bright monospace text (using the dossier's red accent). It will feature sharp corners and a heavy border.
- **Mobile Optimization**: Padding will be minimized on mobile (`max-width: 600px` breakpoint) to allow the terminal strings to fit cleanly on a single line. Font sizes will be explicitly sized for small viewports.
- **Interactivity**: The existing JavaScript number counter animation will be retained. A CSS-based blinking cursor (`@keyframes blink`) will be added next to the numbers to simulate a live terminal feed.
- **Error States**: The `#dashboard-error` div will be restyled to resemble a terminal system error (e.g., `[ERR_CONNECTION_FAILED] - RETRYING...`).
- **Cleanup**: The obsolete `.metrics-grid` and `.metric-card` classes will be removed from `style.css`.

## Data Flow
- No changes to the existing `/api/dashboard-stats` data fetching logic. The JavaScript will continue to fetch stats and populate the animated values into the new DOM elements.
