# Smell Types Mapping Design

## Objective
Update the "Source of smell" selector in the Barking Stink frontend to correctly categorize different odour sources by user-friendly smell descriptions. Automatically map these selections to the precise GOV.UK classifications for both "Where is the smell coming from?" (Page 1) and "Describe smell" (Page 6), as well as dynamically providing the correct facility address details.

## Architecture & Data Flow
1. **Frontend Updates (`vercel/public/index.html` & `vercel/public/app.js`)**
   - The dropdown label will ask: "What does it smell like?".
   - Options are grouped by descriptive smell types.
   - When a user selects an option, `app.js` calculates:
     - `businessLocation`: Name of the site (e.g., "Veolia Dagenham (Plastics)").
     - `smellType`: The exact label for Page 6 (e.g., `"Something else — chemical/plastic odour"`).
     - `siteType`: The exact label for Page 1 (e.g., `"industrial site"` vs `"sewage or water treatment works"`).
     - `streetName`: (e.g., `"Choats Rd Dagenham"` or `""`).
     - `townCity`: (e.g., `""` or `"Barking Riverside"`).
     - `postcode`: (e.g., `"RM9 6LF"` or `""`).
   - These details are sent to the backend.

2. **Backend (`vercel/server.js`)**
   - The API will receive these new fields and pass them through to the scraper. The database table `incidents` will store the `smell_type` and `business_location`.

3. **Scraper (`homelab/scraper.js`)**
   - **Page 1:** Uses `clickLabel(page, incidentData.siteType)` to select "industrial site" or "sewage or water treatment works".
   - **Page 2:** Dynamically fills out the address fields based on the provided location details (Site Name, Street, Town/City, Postcode) instead of hardcoding "Choats Rd".
   - **Page 6:** Uses `clickLabel(page, incidentData.smellType)` as planned.

## Categories & Mappings

### 1. Rotting rubbish, compost, or food waste
- **Page 1 Site Type:** `"industrial site"` (or `"waste site"`)
- **Page 2 Address:** Street: `"Choats Rd Dagenham"`, Postcode: `"RM9 6LF"`
- **Options:**
  - **I'm not sure, but it smells like rubbish/compost**
    - *Site Name:* `Multiple (ReFood, BioGas)`
    - *Page 6 Smell:* `"Rubbish or refuse"`
  - **ReFood Dagenham**
    - *Site Name:* `ReFood Dagenham`
    - *Page 6 Smell:* `"Rubbish or refuse"`
  - **East London Bio Gas (TEG Biogas)**
    - *Site Name:* `East London Bio Gas (TEG Biogas)`
    - *Page 6 Smell:* `"Rubbish or refuse (composting)"`

### 2. Chemical or plastic odour
- **Page 1 Site Type:** `"industrial site"` (or `"waste site"`)
- **Page 2 Address:** Street: `"Choats Rd Dagenham"`, Postcode: `"RM9 6LF"`
- **Options:**
  - **Veolia Dagenham (Plastics)** 
    - *Site Name:* `Veolia Dagenham`
    - *Page 6 Smell:* `"Something else — chemical/plastic odour"`

### 3. Sewage or drain smell
- **Page 1 Site Type:** `"sewage or water treatment works"`
- **Page 2 Address:** Town/City: `"Barking Riverside"`, Street/Postcode: `""` (Leave blank)
- **Options:**
  - **I'm not sure, but it smells like sewage/drains**
    - *Site Name:* `Multiple (Beckton, Riverside, Crossness)`
    - *Page 6 Smell:* `"Sewage"`
  - **Beckton Sewage Treatment Works**
    - *Site Name:* `Beckton Sewage Treatment Works`
    - *Page 6 Smell:* `"Sewage"`
  - **Riverside Sewage Treatment Works**
    - *Site Name:* `Riverside Sewage Treatment Works`
    - *Page 6 Smell:* `"Sewage"`
  - **Crossness Sewage Treatment Works**
    - *Site Name:* `Crossness Sewage Treatment Works`
    - *Page 6 Smell:* `"Sewage"`

## Implementation Steps
1. Update `<select id="businessLocation">` in `index.html`.
2. In `app.js`, create a mapping object that maps the selected value to all corresponding GOV.UK fields (`siteType`, `smellType`, address details).
3. Update the backend payload logic in `app.js` and `server.js` to pass these new fields.
4. Modify `scraper.js` Page 1 to use `incidentData.siteType`.
5. Modify `scraper.js` Page 2 to populate specific address fields accurately (Name, Street, Town, Postcode).
