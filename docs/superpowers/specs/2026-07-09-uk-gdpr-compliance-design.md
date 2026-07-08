# UK GDPR & DPA 2018 Compliance Design Spec

## Overview
This document outlines the required changes to `auto-report-site` to ensure it is production-ready and compliant with England Law (UK GDPR and Data Protection Act 2018). The updates focus on lawful data collection, transparent processing, and granting users the right to erasure.

## 1. Data Management & Right to Erasure
To comply with the right to be forgotten, the system will implement a secure, self-serve data deletion mechanism.

### 1.1 `Manage My Data` Interface
- **Path:** `public/manage.html`
- **Functionality:** A minimalist page where users can input the email address they used to log a smell or join the pool.
- **Submission:** Submitting the email triggers an API call to send a magic link to that email address.

### 1.2 Backend API (`server.js`)
- **New Endpoint 1 (`POST /api/request-deletion`):**
  - Accepts an email address.
  - Validates if the email exists in the `users` table.
  - If it exists, generates a secure, time-limited magic link (e.g., using a JWT or a randomly generated token stored temporarily in a new Supabase table or Redis, though a signed JWT via an environment secret is stateless and simpler).
  - Sends an email using a transactional email provider (e.g., Resend, SendGrid, or nodemailer) containing the link.
- **New Endpoint 2 (`GET /api/delete-data`):**
  - Accepts the token/JWT as a URL parameter.
  - Validates the token.
  - Deletes the associated user record from the `users` table.
  - Deletes all associated links in the `opted_in_user_reports` table.
  - Returns a success HTML page or redirects to a success confirmation.

## 2. Privacy Policy
- **Path:** `public/privacy.html`
- **Content Requirements:**
  - **Data Controller:** Identifies the project owner.
  - **Lawful Basis:** Explicitly states "Consent" under Article 6(1)(a) of UK GDPR.
  - **Data Collected:** Email, Full Name, Postcode, Phone, Address.
  - **Purpose of Processing:** To automate the submission of the official GOV.UK environmental reporting form on the user's behalf.
  - **Third-Party Transmission:** Clarifies that personal data is programmatically transmitted to GOV.UK.
  - **Retention Policy:** Data is held indefinitely to enable continuous automated reporting until the user explicitly revokes consent/deletes their data.
  - **User Rights:** Right to access, rectification, and erasure, with clear instructions to use the `manage.html` page.
- **Integration:** Link added to the `index.html` footer and near the consent checkbox.

## 3. UI and Consent Modifications
To comply with PECR and GDPR standards for explicit consent:
- **Local Storage Checkbox:** 
  - The "Retain locally" checkbox in `index.html` will have the `checked` attribute removed, ensuring it is opt-in by default.
- **Pool Data Label:**
  - The description will be updated to explicitly read: "By pooling your data, you grant explicit consent for us to transmit your personal details to GOV.UK to submit the official environmental form on your behalf..."

## 4. Dependencies
- An email sending service (e.g., Resend, Nodemailer) needs to be configured in `server.js` and `.env` to support the magic link system.
- A secure secret (`JWT_SECRET`) must be added to `.env` for generating the deletion tokens.
