# Version and Changelog Implementation

## Overview
Implement a versioning system and a changelog page for the Barking Stink website, along with agent instructions to automatically keep it updated.

## Architecture

1. **Data Source (`vercel/public/changelog.json`)**
   - A static JSON file storing the version history.
   - Format: An array of objects, with the latest release first.
   - Each object contains: `version`, `date`, and a `changes` array of simple, non-technical bullet points.

2. **UI Updates (`vercel/public/index.html` and other pages)**
   - **Header:** Replace the text `CONFIDENTIAL // EVIDENCE LOG` with `STINK LOG // <version>`. The `<version>` part will be dynamically injected on load.
   - **Footer:** Add a simple link that says `Changelog` pointing to `/changelog.html`.

3. **Changelog Page (`vercel/public/changelog.html`)**
   - A new, responsive page matching the site's rich, modern aesthetic.
   - Features a clean timeline or list view of versions.
   - Fetches `changelog.json` on load and renders the bulleted list for each version.

4. **JavaScript Integration (`vercel/public/app.js` or separate script)**
   - Add a utility to fetch `changelog.json`.
   - Update the `classification` span in the header with the latest version.

5. **Agent Instructions (`GEMINI.md`)**
   - Add a rule for AI agents at the project root.
   - Instruction: "Before completing any feature or bug fix, you MUST update `vercel/public/changelog.json`. Increment the version (PATCH for bugs, MINOR for features) and add clear, non-technical bullet points describing the changes."

## Error Handling
- If `changelog.json` fails to load, the header will gracefully fall back to a hardcoded default (e.g., `STINK LOG // v1.0.0`).

## Testing
- Ensure the header version updates correctly on load.
- Ensure `changelog.html` renders beautifully on mobile and desktop.
- Verify `GEMINI.md` instructs the agent correctly.
