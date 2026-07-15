# Footer & Repo Visibility Design

## Overview
Update the `auto-report-site` to improve mobile footer styling, add a link to the open-source repository on the site, and update the project's README with the correct live URL.

## Changes

### 1. README Update
- **File:** `README.md`
- **Action:** Add or update the link to the live production site to point to `https://barking-riverside-report-smell.vercel.app/`.

### 2. Footer Structure (`index.html`)
- **File:** `vercel/public/index.html`
- **Action:** 
  - Remove hardcoded `&nbsp;|&nbsp;` separators from the footer.
  - Wrap the links in a standard container (`<nav>` or flex container).
  - Add a new link: `View Source on GitHub` pointing to `https://github.com/Latif17/auto-report-site`.

### 3. Footer Styling (`style.css`)
- **File:** `vercel/public/style.css`
- **Action:**
  - Update the `footer p` (or its new container) to use `display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem;`.
  - Add bullet or pipe separators via CSS pseudo-elements (`::after`) or just rely on the `gap` spacing to keep it clean.
  - On mobile screens (under `600px`), ensure the flex layout allows links to wrap cleanly to new lines without breaking layout or looking messy.

## Success Criteria
- The footer links wrap seamlessly on small mobile screens without broken `|` characters hanging on new lines.
- The site clearly links to its GitHub repo.
- The GitHub README accurately points to the live Vercel deployment.
