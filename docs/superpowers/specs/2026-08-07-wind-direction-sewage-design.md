# Design Spec: Wind-Based Sewage Plant Identification

## 1. Overview
Currently, when a user reports a "Sewage or drain smell", the application assigns the location as "Multiple (Beckton, Riverside, Crossness)". This feature will leverage real-time wind direction data from the Open-Meteo API to predict the specific sewage plant causing the smell and give the user the option to use this specific location in their report.

## 2. Architecture & Data Flow

### 2.1 Fetching Weather Data
- The feature relies on client-side logic in `vercel/public/app.js`.
- An event listener will monitor changes to the `businessLocation` dropdown.
- If the user selects `sewage_drain`, the app fetches weather data for Barking Riverside (lat `51.52`, lon `0.12`) via:
  `https://api.open-meteo.com/v1/forecast?latitude=51.52&longitude=0.12&current_weather=true`

### 2.2 Culprit Identification Logic
- The API returns `current_weather.winddirection` (0-360 degrees) and `windspeed` (km/h).
- The wind direction represents where the wind is coming *from*.
- **Mappings:**
  - **West (210° - 330°):** Beckton Sewage Treatment Works
  - **South (120° - 210°):** Crossness Sewage Treatment Works
  - **East (30° - 120°):** Riverside Sewage Treatment Works
  - **North (330° - 30°):** Inconclusive (the feature will remain hidden).

### 2.3 User Interface (UI)
- A hidden `<div>` will be added below the `businessLocation` dropdown in `index.html`.
- When a conclusive wind direction is found, the `<div>` is unhidden.
- It will contain:
  - An **"Experimental"** badge or label.
  - A descriptive text explaining the logic (e.g., *"Wind is pushing East towards Barking Riverside at 15km/h, likely meaning the smell is from Beckton Sewage Treatment Works."*).
  - A checkbox allowing the user to opt-in: `[ ] Use [Plant Name] as the specific location for this report.`

### 2.4 Submission & Backend
- On form submission, if `sewage_drain` is selected AND the checkbox is checked, the `businessLocation` sent to the server will be the specific plant name (e.g., `"Beckton Sewage Treatment Works"`).
- If unchecked (or inconclusive), it defaults back to `"Multiple (Beckton, Riverside, Crossness)"`.
- **Database (`server.js`):** The exact string is saved to the `business_location` column in the `incidents` table. Grouping logic uses `smell_type` (which remains `'Sewage'`), so community grouping works exactly as before.
- **Dashboard:** The specific plant name will automatically appear on the dashboard and history lists.
- **Scraper:** The scraper will input the specific plant name into the company name field for GOV.UK, requiring no changes to the scraper logic.

## 3. Scope & Error Handling
- **Scope:** Confined to `vercel/public/index.html` and `vercel/public/app.js`.
- **Error Handling:** If the Open-Meteo fetch fails, times out, or returns unexpected data, the experimental UI simply remains hidden, falling back seamlessly to the standard "Multiple" behavior. No disruption to the user flow.

## 4. Dependencies
- **Open-Meteo API:** Free, no-auth API endpoint. No API keys or backend proxy required.
