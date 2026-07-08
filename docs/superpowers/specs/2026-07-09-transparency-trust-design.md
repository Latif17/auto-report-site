# Transparency and Trust Design Spec

## Overview
This specification details the implementation of transparency features designed to reassure users that their data is handled safely. The goal is to build trust by providing clear, accessible information about data storage, anonymization, and deletion at the point of action and through a dedicated explainer page.

## Components

### 1. Homepage "Trust Box"
A visual callout box added to `public/index.html` located immediately under the form's submit button.

**Visuals:**
- Subtle background color (e.g., light blue or green) to differentiate it from the form inputs.
- A lock or shield SVG icon to intuitively signal security.
- Clean, readable typography.

**Content:**
- Three bullet points:
  - ✓ **Local First:** Your data stays on your device by default.
  - ✓ **Anonymized Pooling:** If you share, we strip out your email.
  - ✓ **Full Control:** You can delete your data at any time.
- A link at the bottom: "Read our Data Promise" pointing to `promise.html`.

### 2. "Our Data Promise" Page (`public/promise.html`)
A new static HTML page providing a warm, plain-English explanation of the data lifecycle.

**Structure:**
- **Header:** "Your Data is Safe with Us"
- **The Data Journey Timeline:** A vertical timeline built with CSS that walks through the lifecycle:
  1. **Step 1: You hit Submit.** Explains that data is saved locally first.
  2. **Step 2: The Community Pool.** Explains that if they opted in, data is sent securely to the database but separated from their email.
  3. **Step 3: Your Right to Erase.** Explains the Manage My Data page, linking directly to `manage.html`.

**Styling:**
- Pure HTML/CSS matching the site's existing aesthetic.
- The timeline will use vertical borders and relative positioning to create a connected step-by-step visual.

### 3. Navigation Updates
- Update the footer in `public/index.html`, `public/manage.html`, and `public/privacy.html` to include a link to "Our Data Promise".
- Ensure `public/promise.html` has consistent navigation back to the homepage.

## Constraints
- **Frontend only:** All changes are isolated to the static `public/` directory (HTML/CSS).
- No new external dependencies; use existing CSS patterns or raw CSS for the timeline.
