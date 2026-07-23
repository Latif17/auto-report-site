# Agent Instructions

## Changelog and Versioning
Before completing any feature or bug fix, you MUST update `vercel/public/changelog.json`.
- Increment the version (PATCH for bugs, MINOR for features).
- Add clear, non-technical bullet points describing the changes.
- **Consolidation rule:** When multiple related changes (features, fixes, refactors) are being developed together and have NOT yet been pushed to `origin/main`, consolidate them into a single version entry rather than creating a new version per commit. Use the highest version type among the changes (MINOR wins over PATCH). Only create a new version entry once you are ready to push to `origin/main`.
