# Unified Header Styles Design Spec

## Overview
Unify the styling of the `reporter-details` headers so both new users (default header) and returning users (verified summary) share the same consistent layout, spacing, and background.

## Implementation Details
1. **Default Header (`#default-header`)**:
   - Add the `.section-title` CSS class to the wrapper div itself, or move the background/padding to the wrapper.
   - Specifically, we will give `#default-header` and `#verified-summary` a shared class (e.g., `.form-section-header`) that provides:
     - `padding: 1rem;`
     - `background: var(--header-bg);`
     - `border-bottom: 1px solid var(--border);`
   - Remove these properties from the inner `h2` so it doesn't double-pad.

2. **Verified Summary (`#verified-summary`)**:
   - Apply the same `.form-section-header` class.
   - Remove the dynamic `border-top` from `details-content.expanded-from-summary` because the headers will now always have a `border-bottom` that cleanly separates them from the content.

3. **Details Content (`#details-content`)**:
   - Update `.details-content.expanded-from-summary` to only apply `margin-top: 1.5rem` and `padding-top: 0` (or leave it to the default padding) since the border is now handled by the headers.
