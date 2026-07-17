# Smell Types Mapping Design

## Objective
Update the "Source of smell" selector in the Barking Stink frontend to correctly categorize different odour sources and map them automatically to the specific GOV.UK smell classifications.

## Architecture & Data Flow
1. **Frontend Updates (`vercel/public/index.html` & `vercel/public/app.js`)**
   - The dropdown will be restructured to group locations into three main categories: Plastics, Anaerobic, and Sludge.
   - When the user selects a location, `app.js` will map that selection to the precise string expected by the GOV.UK form.
   - Both the selected `businessLocation` and the mapped `smellType` will be sent to the backend API.

2. **Backend (`vercel/server.js`)**
   - No schema changes are needed. The backend will receive the correctly mapped `smellType` string (e.g., `"Sewage"`, `"Something else — chemical/plastic odour"`) instead of the hardcoded `"Industrial Stench"` and store it in the `incidents` table.

3. **Scraper (`homelab/scraper.js`)**
   - The scraper uses the `clickLabel(page, text)` utility to select the smell type. By ensuring the frontend sends the *exact* label text found on the GOV.UK form, the scraper will natively select the correct radio button without needing modifications to its internal logic.

## Categories & Mappings

### 1. Plastics
*Veolia's Dagenham facility is a dedicated plastics recycling plant (processing post-consumer HDPE milk bottles).*
- **Veolia Dagenham (Plastics)** 
  - *Maps to:* `"Something else — chemical/plastic odour"`

### 2. Anaerobic (Rubbish/Compost)
- **Multiple (ReFood, BioGas)**
  - *Maps to:* `"Rubbish or refuse"`
- **ReFood Dagenham**
  - *Maps to:* `"Rubbish or refuse"`
- **East London Bio Gas (TEG Biogas)**
  - *Maps to:* `"Rubbish or refuse (composting)"`

### 3. Sludge (Sewage)
- **Multiple (Sewage Treatment Works)**
  - *Maps to:* `"Sewage"`
- **Beckton Sewage Treatment Works**
  - *Maps to:* `"Sewage"`
- **Riverside Sewage Treatment Works**
  - *Maps to:* `"Sewage"`
- **Crossness Sewage Treatment Works**
  - *Maps to:* `"Sewage"`

## Implementation Steps
1. Update `<select id="businessLocation">` in `index.html` with `<optgroup>` tags for the three categories.
2. In `app.js`, create a mapping object.
3. Update the `formData` assembly in `app.js` to dynamically look up the `smellType` instead of hardcoding `'Industrial Stench'`.
