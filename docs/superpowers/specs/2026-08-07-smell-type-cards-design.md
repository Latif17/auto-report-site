# Smell Type UI and Copy Update Design

## Objective
Improve the UI presentation and copywriting for the "What does it smell like?" selection in the report form (`index.html`), making it easier for users to identify the correct smell type, particularly distinguishing between sewage-based smells and food waste/compost smells.

## UI Changes
Replace the existing HTML `<select>` dropdown with a CSS Grid of selectable "cards".
- Each card will act as a radio button (or update a hidden input).
- Cards will display the smell category as a bold title.
- Underneath the title, each card will include concise guidance text.
- The cards will have clear active/selected states (e.g., border color change, background tint) matching the site's existing aesthetic.

## Copywriting Changes
The descriptions will be concise and direct. We will remove the current separate "Guidance" text block, as the guidance will now live directly inside the cards.

- **Sewage or drain**
  - *Title:* Sewage or drain
  - *Description:* Human waste, raw sewage, or strong sulfur (rotten eggs).
- **Rotting rubbish**
  - *Title:* Rotting rubbish
  - *Description:* Sour compost, old garbage, or rotting food.
- **Chemical or plastic**
  - *Title:* Chemical or plastic
  - *Description:* Burning plastic, acrid smoke, or industrial chemicals.
- **Can't tell**
  - *Title:* Can't tell
  - *Description:* Not sure? Logged internally to track trends, but not submitted to the EPA.

## Implementation Details
1. **HTML:** Update `vercel/public/index.html` to remove the `<select id="businessLocation">` and replace it with a `div` containing the grid of cards. Keep a hidden input `<input type="hidden" id="businessLocation" name="businessLocation" required>` to maintain compatibility with existing form logic.
2. **CSS:** Add styles for the smell-type cards (grid layout, borders, padding, hover/active states) to the appropriate stylesheet.
3. **JS:** Add logic to listen for clicks on the cards, update the hidden input value, and visually highlight the active card.

## Spec Self-Review
- [x] Placeholders: None.
- [x] Internal Consistency: The hidden input ensures we don't break existing form submission logic.
- [x] Scope: Highly focused on the smell type UI.
- [x] Ambiguity: Clear text and clear UI direction.
