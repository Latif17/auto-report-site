# Smell Types Mapping Design

## Objective
Update the "What does it smell like?" selector in the Barking Stink frontend to offer three simple, user-friendly smell categories. Automatically map these selections to the precise GOV.UK classifications for both "Where is the smell coming from?" (Page 1) and "Describe smell" (Page 6), as well as dynamically providing the correct bundled facility address details.

## Architecture & Data Flow
1. **Frontend Updates (`vercel/public/index.html` & `vercel/public/app.js`)**
   - The dropdown will only display the three high-level smell descriptions.
   - When a user selects an option, `app.js` calculates:
     - `businessLocation`: Name of the site(s) (e.g., "Multiple (ReFood, East London Bio Gas)").
     - `smellCategory`: The radio button label for Page 6 (e.g., `"Something else"` or `"Rubbish or refuse"`).
     - `smellDescription`: The text to type if "Something else" is selected (e.g., `"chemical/plastic odour"`).
     - `siteType`: The exact label for Page 1 (e.g., `"industrial site"` vs `"sewage or water treatment works"`).
     - `streetName`: (e.g., `"Choats Rd Dagenham"` or `""`).
     - `townCity`: (e.g., `""` or `"Barking Riverside"`).
     - `postcode`: (e.g., `"RM9 6LF"` or `""`).
   - These details are sent to the backend.

2. **Backend (`vercel/server.js`)**
   - The API will receive these new fields and pass them through to the scraper. 
   - The database table `incidents` will store `business_location` and the concatenated smell type in `smell_type`.

3. **Scraper (`homelab/scraper.js`)**
   - **Page 1:** Uses `clickLabel(page, incidentData.siteType)` to select "industrial site" or "sewage or water treatment works".
   - **Page 2:** Dynamically fills out the address fields based on the provided location details (Site Name, Street, Town/City, Postcode).
   - **Page 6:** Uses `clickLabel(page, incidentData.smellCategory)`. If `smellCategory` is `"Something else"`, it will wait for the text input to appear and type `incidentData.smellDescription` into it.

## Categories & Mappings

### 1. Rotting rubbish, compost, or food waste
- **Dropdown Option:** `Rotting rubbish, compost, or food waste`
- **Page 1 Site Type:** `"industrial site"`
- **Page 2 Address:**
  - Site Name: `"Multiple (ReFood, East London Bio Gas)"`
  - Street: `"Choats Rd Dagenham"`
  - Postcode: `"RM9 6LF"`
- **Page 6 Describe Smell:**
  - Category: `"Rubbish or refuse"`

### 2. Chemical or plastic odour
- **Dropdown Option:** `Chemical or plastic odour`
- **Page 1 Site Type:** `"industrial site"`
- **Page 2 Address:**
  - Site Name: `"Veolia Dagenham (Plastics)"`
  - Street: `"Choats Rd Dagenham"`
  - Postcode: `"RM9 6LF"`
- **Page 6 Describe Smell:**
  - Category: `"Something else"`
  - Description Input: `"chemical/plastic odour"`

### 3. Sewage or drain smell
- **Dropdown Option:** `Sewage or drain smell`
- **Page 1 Site Type:** `"sewage or water treatment works"`
- **Page 2 Address:**
  - Site Name: `"Multiple (Beckton, Riverside, Crossness)"`
  - Town/City: `"Barking Riverside"`
  - Street/Postcode: `""`
- **Page 6 Describe Smell:**
  - Category: `"Sewage"`

## Implementation Steps
1. Update `<select id="businessLocation">` in `index.html` to just have the three smell options.
2. In `app.js`, create a mapping object that maps the selected value to all corresponding GOV.UK fields (`siteType`, `smellCategory`, `smellDescription`, address details).
3. Update the backend payload logic in `app.js` and `server.js` to pass these new fields.
4. Modify `scraper.js` Page 1 to use `incidentData.siteType`.
5. Modify `scraper.js` Page 2 to populate specific address fields accurately (Name, Street, Town, Postcode).
6. Modify `scraper.js` Page 6 to click `smellCategory` and conditionally fill the input box if it's "Something else".
