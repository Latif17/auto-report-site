# Transparency and Trust Design Spec

## Overview
This specification details the implementation of transparency features designed to reassure users that their data is handled safely. The goal is to build trust by providing a completely truthful, technically accurate, and easily accessible explanation of data storage, anonymization, and deletion at the point of action and through a dedicated explainer page.

## Components

### 1. Form Adjustments (`public/index.html`)
The "Local First" illusion must be stripped, as data is always transmitted to the backend to file reports.
- **Rename "Retain locally"** to **"Remember my details"**.
- Update the description to: *"Save your details in your browser so you don't have to re-type them next time."* 

### 2. Homepage "Trust Box" (`public/index.html`)
A visual callout box added immediately beneath the form's submit button.

**Visuals:**
- Subtle background color (e.g., light blue or green) to differentiate it from the form inputs.
- A lock or shield SVG icon to intuitively signal security.
- Clean, readable typography.

**Content:**
- Three bullet points:
  - ✓ **Secure Storage:** Your data is encrypted in transit and safely stored at rest, used exclusively to file official reports on your behalf.
  - ✓ **Anonymized Pooling:** If you share with the community, your personal details are strictly separated. Neighbors only see the smell event itself.
  - ✓ **Full Control:** You can permanently wipe your data from our servers at any time.
- A link at the bottom: "Read our Data Promise" pointing to `promise.html`.

### 3. "Our Data Promise" Page (`public/promise.html`)
A new static HTML page mapping out the exact data flow to satisfy both technical and non-technical readers.

**Structure:**
- **Header:** "Your Data is Safe with Us"
- **The Data Journey Timeline:** A vertical timeline built with CSS that walks through the lifecycle:
  1. **In Transit (Submission):** When you hit submit, your data travels over a secure, encrypted connection (HTTPS/TLS) directly to our backend database.
  2. **At Rest (Storage):** Your personal details are securely stored. They are used by our system for one purpose only: to automatically file the official GOV.UK report on your behalf.
  3. **Anonymization (Community Pooling):** Our database strictly separates the event (the "incident") from your personal info. When an event is shown on the homepage for neighbors to join, your personal details are never exposed.
  4. **Right to Erasure (Deletion):** You have total control. Enter your email on our "Manage My Data" page to execute an immediate, hard delete of your records from our systems.

**Styling:**
- Pure HTML/CSS matching the site's existing aesthetic.
- The timeline will use vertical borders and relative positioning to create a connected step-by-step visual.

### 4. Navigation Updates
- Update the footer in `public/index.html`, `public/manage.html`, and `public/privacy.html` to include a link to "Our Data Promise".
- Ensure `public/promise.html` has consistent navigation back to the homepage.

## Constraints
- **Frontend only:** All changes are isolated to the static `public/` directory (HTML/CSS).
- No new external dependencies; use existing CSS patterns or raw CSS for the timeline.
