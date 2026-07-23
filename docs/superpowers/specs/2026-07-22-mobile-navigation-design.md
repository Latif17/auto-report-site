# Navigation Redesign Spec (FAB Speed Dial)

## Overview
The current app relies on a cluttered footer for navigation, which is inconsistent and hard to use on mobile devices. This redesign replaces the footer with a single Floating Action Button (FAB) that expands into a navigation menu, keeping the UI exceptionally clean and focused.

## Architecture & Components

### 1. Sticky Header
- **Sticky Positioning**: The header section (containing the app title, case number, and version display) will be made `position: sticky; top: 0;` so it remains accessible while scrolling.
- **Content**: Purely informational. The header will *not* contain any navigation buttons.

### 2. The Navigation FAB (Speed Dial)
- **Design**: A circular, highly visible button containing a menu icon (e.g., hamburger or grid).
- **Positioning**: 
  - On mobile screens: Pinned to the bottom-right of the viewport.
  - On larger screens: Pinned to the bottom-right of the `.dossier-container` (the 600px main content box) so it stays close to the reading area.
- **Functionality**: Tapping the FAB expands it into a menu containing all navigation links:
  - **Home (Log Smell)** - *Styled prominently as the primary action*
  - Dashboard
  - Manage My Data
  - Feedback
  - Changelog
  - Privacy
  - Data Promise
  - Official GOV.UK Form
  - View Source on GitHub

### 3. Footer Removal
- The existing `<nav class="footer-nav">` and the entire `<footer>` element will be completely removed from all pages (`index.html`, `dashboard.html`, `manage.html`, `feedback.html`, `changelog.html`, `privacy.html`, `promise.html`).

## Edge Cases
- **Z-Index**: Ensure the expanding FAB menu uses a high `z-index` to overlay all other content.
- **Bottom Padding**: Add extra padding to the bottom of the `.dossier-container` so users can scroll to see content that might otherwise be trapped behind the resting FAB.
