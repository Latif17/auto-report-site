# Security & Anti-Ban Design Specification

## Overview
This specification details the implementation for securing the Auto Report Site from abuse (DDoS and duplicate submissions) and preventing the Puppeteer scraper from being banned by GOV.UK bot detection.

## Architecture & Components

### 1. API Rate Limiting (DDoS Protection)
* **Dependencies**: `express-rate-limit` and `helmet`.
* **Component**: `server.js`
* **Configuration**:
  * **Helmet**: Applied globally for basic HTTP security headers.
  * **Global Limiter**: 100 requests per 15 minutes applied to all generic routes (e.g., `/api/stats`).
  * **Strict Limiter**: 3 requests per 15 minutes applied to sensitive mutation routes (`/api/submit`, `/api/join`, `/api/opt-in`). This is set low because users typically only submit or join a single event per session.

### 2. Duplicate Event Prevention
* **Component**: `server.js` (`/api/submit` and `/api/join` routes)
* **Logic**:
  * Before a new incident is created, the system queries the `incidents` table for an exact match on `date_of_smell`, `time_of_smell`, and `business_location`.
  * It simultaneously checks `opted_in_user_reports` to see if the user's `email` is already associated with that exact event.
  * If the user has already submitted or joined this exact event, the transaction is rejected.

### 3. GOV.UK Anti-Ban (Scraper Stealth)
* **Dependencies**: `puppeteer-extra` and `puppeteer-extra-plugin-stealth`.
* **Component**: `scraper.js` and `run-scraper.js`
* **Logic**:
  * Replace the standard `puppeteer` import with `puppeteer-extra`.
  * Inject the `stealth` plugin to strip bot signatures (e.g., `navigator.webdriver`, headless Chrome identifiers).
  * **Randomized Delays**: 
    * *In-page*: Add a `randomDelay(1000, 3000)` milliseconds function to introduce human-like reading/reaction pauses before clicking `goNext` or interacting with forms.
    * *Between-users*: In `run-scraper.js`, modify the delay between processing individual user reports from a fixed 2 seconds to a random `randomDelay(5000, 15000)` milliseconds (5 to 15 seconds) to prevent uniform traffic patterns.

## Data Flow
1. **User Request**: User hits `/api/submit`. 
2. **Middleware**: `express-rate-limit` intercepts. If the IP exceeds 3 requests/15 mins, returns 429.
3. **Validation**: Server queries database for duplicate event by that user. Returns 400 if duplicate.
4. **Insertion**: If clean, inserts into `incidents` (or uses existing) and `opted_in_user_reports`.
5. **Scraper Execution**: `run-scraper.js` picks up pending incidents. 
6. **Evasion**: Scraper runs via `puppeteer-extra-plugin-stealth` and applies randomized delays between inputs and user processing to successfully submit to GOV.UK without triggering bot defenses.

## Error Handling
* **Rate Limits**: Express returns `429 Too Many Requests`.
* **Duplicates**: Express returns `400 Bad Request` with message: "You have already submitted a report for this exact event."
* **Scraper Failures**: The stealth plugin acts passively, but if GOV.UK changes its structure or still flags the session, the existing try/catch blocks in `scraper.js` will catch navigation timeouts and log the failure.

## Testing
* **Manual Testing**: 
  * Trigger 4 rapid submissions to verify the 429 rate limit is enforced.
  * Submit the exact same Date/Time/Location twice with the same email to verify the 400 Duplicate error.
  * Run the scraper with `TEST_MODE=true` to ensure the stealth plugin boots successfully and delays are applied without crashing.
