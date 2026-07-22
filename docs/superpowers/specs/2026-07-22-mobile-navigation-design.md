# Mobile Navigation Redesign Spec

## Overview
The current app relies on a cluttered footer for navigation, which is inconsistent and hard to use on mobile devices. This redesign replaces the footer with a clean sticky header + hamburger menu for secondary navigation, and a Floating Action Button (FAB) for the primary "Log Smell" action.

## Architecture & Components

### 1. Sticky Header & Hamburger Menu
- **Sticky Positioning**: The header section (containing the app title, case number, and version display) will be made `position: sticky` so it remains accessible while scrolling.
- **Version Number**: Ensure the version number is displayed at the top of every page (this is currently in `index.html` but will be replicated across all pages).
- **Hamburger Icon**: A hamburger menu icon (☰) will be added to the top right of the header.
- **Slide-out Drawer**: Tapping the icon will open a slide-out overlay menu containing large, touch-friendly links:
  - Home
  - Dashboard
  - Manage My Data
  - Feedback
  - Changelog
  - Privacy
  - Data Promise
  - Official GOV.UK Form
  - View Source on GitHub
- **Close Mechanism**: An "X" button inside the drawer, plus tapping outside the drawer, will dismiss it.

### 2. Floating Action Button (FAB)
- **Design**: A circular, highly visible button fixed to the bottom right corner.
- **Functionality**: Serves as a quick link to `index.html` to log a new smell.
- **Visibility**: Rendered on all pages *except* `index.html` (since the form is already the primary content there).

### 3. Footer Removal
- The existing `<nav class="footer-nav">` will be completely removed from all pages (`index.html`, `dashboard.html`, `manage.html`, `feedback.html`, `changelog.html`, `privacy.html`, `promise.html`).
- The footer element itself will be removed entirely since the version number will exist exclusively in the header on all pages.

## Edge Cases
- Ensure the slide-out menu uses `z-index` properly to overlay all other content.
- Ensure the FAB does not overlap important content at the bottom of the page (add bottom padding to the main content area if necessary).
