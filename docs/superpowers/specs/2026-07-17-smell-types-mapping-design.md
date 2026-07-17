# Smell Types Mapping Design

## Objective
Update the "Source of smell" selector in the Barking Stink frontend to correctly categorize different odour sources by user-friendly smell descriptions, and map them automatically to the specific GOV.UK smell classifications.

## Architecture & Data Flow
1. **Frontend Updates (`vercel/public/index.html` & `vercel/public/app.js`)**
   - The dropdown label will be updated to focus on what the user is smelling.
   - The options will be grouped using `<optgroup>` tags with user-friendly descriptions (e.g., "Rotting rubbish or compost smell", "Chemical or plastic smell", "Sewage or drain smell").
   - Each group will have a fallback "I'm not sure, but it smells like [X]" option for users who don't know the specific facility.
   - When the user selects an option, `app.js` will map that selection to the precise string expected by the GOV.UK form.
   - Both the selected `businessLocation` and the mapped `smellType` will be sent to the backend API.

2. **Backend (`vercel/server.js`)**
   - No schema changes are needed. The backend will receive the correctly mapped `smellType` string (e.g., `"Sewage"`, `"Something else — chemical/plastic odour"`) instead of the hardcoded `"Industrial Stench"` and store it in the `incidents` table.

3. **Scraper (`homelab/scraper.js`)**
   - The scraper uses the `clickLabel(page, text)` utility to select the smell type. By ensuring the frontend sends the *exact* label text found on the GOV.UK form, the scraper will natively select the correct radio button without needing modifications to its internal logic.

## Categories & Mappings

### 1. Rotting rubbish, compost, or food waste
*Anaerobic digestion and food waste facilities.*
- **I'm not sure, but it smells like rubbish/compost**
  - *Location string:* `Multiple (ReFood, BioGas)`
  - *Maps to Gov.UK:* `"Rubbish or refuse"`
- **ReFood Dagenham**
  - *Maps to Gov.UK:* `"Rubbish or refuse"`
- **East London Bio Gas (TEG Biogas)**
  - *Maps to Gov.UK:* `"Rubbish or refuse (composting)"`

### 2. Chemical or plastic odour
*Veolia's Dagenham facility is a dedicated plastics recycling plant (processing post-consumer HDPE milk bottles).*
- **Veolia Dagenham (Plastics)** 
  - *Maps to Gov.UK:* `"Something else — chemical/plastic odour"`

### 3. Sewage or drain smell
*Sewage Treatment Works.*
- **I'm not sure, but it smells like sewage/drains**
  - *Location string:* `Multiple (Sewage Treatment Works)`
  - *Maps to Gov.UK:* `"Sewage"`
- **Beckton Sewage Treatment Works**
  - *Maps to Gov.UK:* `"Sewage"`
- **Riverside Sewage Treatment Works**
  - *Maps to Gov.UK:* `"Sewage"`
- **Crossness Sewage Treatment Works**
  - *Maps to Gov.UK:* `"Sewage"`

## Implementation Steps
1. Update `<select id="businessLocation">` in `index.html` with `<optgroup>` tags for the three smell descriptions and include the "I'm not sure" options. Update the label to be more user-friendly.
2. In `app.js`, create a mapping object that translates the `businessLocation` value into the corresponding GOV.UK `smellType`.
3. Update the `formData` assembly in `app.js` to dynamically look up the `smellType` instead of hardcoding `'Industrial Stench'`.
